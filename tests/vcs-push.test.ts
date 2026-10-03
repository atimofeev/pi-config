import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { createPushHandler, type PushContext } from "../pi-agent/extensions/lib/vcs-push.ts";

const id = "a".repeat(40), parent = "b".repeat(40);
const commit = (hash = id, description = "feat: change", empty = false, conflict = false) => `${hash}\t${JSON.stringify(description)}\t${empty}\t${conflict}`;
const ref = (name = "main", remote = "", hash = parent, tracked = false) => `${JSON.stringify(name)}\t${JSON.stringify(remote)}\t${tracked}\ttrue\t${hash}`;
function fixture(jj = false, overrides: Record<string, string | number | (() => string)> = {}) {
  const calls: string[][] = [], messages: string[] = [], confirms: string[] = [], selections: string[][] = [];
  let confirm = true, selection: string | undefined = undefined;
  let movedTo: string | undefined;
  let movedName = "main";
  const defaults: Record<string, string> = jj ? {
    root: "/repo", "log @": commit(), "log @-": commit(parent), nearest: commit(parent),
    bookmarks: ref(), remotes: "origin https://example.invalid/repo", move: "", dry: "Would push", push: "Pushed",
  } : {
    root: "/repo", branch: "main", remoteConfig: "origin", merge: "refs/heads/release", remotes: "origin", status: "", head: id, push: "Pushed",
  };
  const ctx: PushContext = { cwd: "/repo", hasUI: true, ui: {
    notify: message => { messages.push(message); },
    confirm: async (_title, message) => { confirms.push(message); return confirm; },
    select: async (_title, choices) => { selections.push(choices); return selection; },
  } };
  const handler = createPushHandler(async (command, args) => {
    calls.push([command, ...args]);
    const a = command === "jj" ? args.filter(arg => !["--no-pager", "--color=never", "--ignore-working-copy"].includes(arg)) : args;
    let key: string;
    if (command === "jj") {
      if (a[0] === "root") key = "root";
      else if (a[0] === "log") { const rev = a[a.indexOf("-r") + 1]; key = rev.startsWith("heads(") ? "nearest" : `log ${rev}`; }
      else if (a[0] === "bookmark") key = a[1] === "list" ? "bookmarks" : "move";
      else key = a[1] === "remote" ? "remotes" : a.includes("--dry-run") ? "dry" : "push";
    } else {
      key = a[0] === "symbolic-ref" ? "branch" : a[0] === "config" ? a[2].endsWith(".remote") ? "remoteConfig" : "merge" : a[0] === "remote" ? "remotes" : a[0] === "status" ? "status" : a[0] === "push" ? "push" : a.includes("HEAD") ? "head" : "root";
    }
    if (key === "move") {
      movedTo = a.at(-1);
      movedName = a[2].slice("exact:".length);
    }
    const value = key === "bookmarks" && movedTo
      ? overrides.reviewedBookmarks ?? ref(movedName, "", movedTo)
      : overrides[key] ?? defaults[key];
    assert.notEqual(value, undefined, `Unexpected command ${command} ${args.join(" ")}`);
    if (typeof value === "number") return { code: value, stdout: "", stderr: "command failed" };
    return { code: 0, stdout: typeof value === "function" ? value() : value!, stderr: "" };
  }, () => jj ? "/repo" : undefined);
  return { ctx, calls, messages, confirms, selections, handler, cancel: () => { confirm = false; }, select: (value?: string) => { selection = value; } };
}
const mutations = (f: ReturnType<typeof fixture>) => f.calls.filter(c => c.includes("move") || c.includes("push"));

test("Git upstream uses explicit qualified refspec and disables followTags", async () => {
  const f = fixture(); await f.handler("", f.ctx);
  assert.deepEqual(f.calls.at(-1), ["git", "push", "--no-follow-tags", "--", "origin", "refs/heads/main:refs/heads/release"]);
});
test("Git missing upstream selects remote and confirms tracking; dirty contents ignored", async () => {
  const f = fixture(false, { remoteConfig: 1, merge: 1, remotes: "one\ntwo", status: " M file" }); f.select("two");
  await f.handler("", f.ctx);
  assert.deepEqual(f.selections, [["one", "two"]]);
  assert.match(f.confirms[0], /Create upstream tracking/); assert.match(f.confirms[0], /ignored/);
  assert.deepEqual(f.calls.at(-1), ["git", "push", "--no-follow-tags", "--set-upstream", "--", "two", "refs/heads/main:refs/heads/main"]);
});
test("Git detached HEAD refuses", async () => { const f = fixture(false, { branch: 1 }); await f.handler("", f.ctx); assert.match(f.messages.join(), /Detached HEAD/); assert.equal(mutations(f).length, 0); });
test("No UI does not execute", async () => { const f = fixture(); f.ctx.hasUI = false; await f.handler("", f.ctx); assert.equal(f.calls.length, 0); assert.match(f.messages[0], /interactive/); });
test("Git cancellation and push failure", async () => {
  const f = fixture(); f.cancel(); await f.handler("", f.ctx); assert.equal(mutations(f).length, 0);
  const failed = fixture(false, { push: 1 }); await failed.handler("", failed.ctx); assert.match(failed.messages.join(), /command failed/);
});
test("Outside repo reports error; broken JJ never falls back to Git", async () => {
  const git = fixture(false, { root: 1 }); await git.handler("", git.ctx); assert.match(git.messages.join(), /command failed/);
  const jj = fixture(true, { root: 1 }); await jj.handler("", jj.ctx); assert.ok(jj.calls.every(c => c[0] === "jj"));
});
test("JJ empty undescribed @ selects described single parent", async () => {
  const f = fixture(true, { "log @": commit(id, "", true) }); await f.handler("", f.ctx);
  assert.ok(f.calls.some(c => c.includes("move") && c.at(-1) === parent)); assert.doesNotMatch(f.confirms[0], /@ contents/);
});
test("JJ described empty @ publishes working-copy contents; move then dry-run then push", async () => {
  const f = fixture(true, { "log @": commit(id, "feat: empty", true) }); await f.handler("", f.ctx);
  assert.match(f.confirms[0], /@ contents will be published/);
  const ops = mutations(f); assert.equal(ops.length, 3); assert.ok(ops[0].includes("move")); assert.ok(ops[1].includes("--dry-run")); assert.ok(!ops[2].includes("--dry-run"));
  assert.ok(f.calls.every(c => c[1] === "--no-pager" && c[2] === "--color=never"));
  assert.ok(ops.every(c => c.includes("--ignore-working-copy")));
});
test("JJ undescribed target and ambiguous merge parent refuse", async () => {
  const f = fixture(true, { "log @": commit(id, "") }); await f.handler("", f.ctx); assert.match(f.messages.join(), /\/ci/); assert.equal(mutations(f).length, 0);
  const merge = fixture(true, { "log @": commit(id, "", true), "log @-": `${commit(parent)}\n${commit("c".repeat(40))}` }); await merge.handler("", merge.ctx); assert.match(merge.messages.join(), /multiple parents/);
});
test("JJ root and conflict refuse", async () => {
  for (const value of [commit("0".repeat(40)), commit(id, "change", false, true)]) { const f = fixture(true, { "log @": value }); await f.handler("", f.ctx); assert.equal(mutations(f).length, 0); assert.match(f.messages.join(), /root or conflicted/); }
});
test("JJ nearest ancestor ambiguity requires selection, not log order", async () => {
  const other = "c".repeat(40);
  const f = fixture(true, { bookmarks: `${ref("left")}\n${ref("right", "", other)}`, nearest: `${commit(parent)}\n${commit(other)}` }); f.select("right"); await f.handler("", f.ctx);
  assert.deepEqual(f.selections, [["left", "right"]]); assert.ok(mutations(f)[0].includes("exact:right"));
});
test("JJ tracked remote wins; multiple tracked remotes select", async () => {
  const refs = `${ref()}\n${ref("main", "two", parent, true)}`;
  const f = fixture(true, { bookmarks: refs, remotes: "one url\ntwo url" }); await f.handler("", f.ctx); assert.ok(mutations(f)[1].includes("two")); assert.equal(f.selections.length, 0);
  const multi = fixture(true, { bookmarks: `${refs}\n${ref("main", "one", parent, true)}`, remotes: "one url\ntwo url" }); multi.select("one"); await multi.handler("", multi.ctx); assert.deepEqual(multi.selections, [["two", "one"]]);
});
test("JJ no bookmarks refuses; explicit odd name stays literal", async () => {
  const none = fixture(true, { bookmarks: "", nearest: "" }); await none.handler("", none.ctx); assert.match(none.messages.join(), /existing-bookmark/); assert.equal(mutations(none).length, 0);
  const f = fixture(true, { bookmarks: ref("glob:odd") }); await f.handler("glob:odd", f.ctx); assert.ok(mutations(f).every(c => c.includes("exact:glob:odd")));
});
test("JJ deleted/conflicted explicit bookmark refuses", async () => { const f = fixture(true, { bookmarks: ref("main", "", "") }); await f.handler("main", f.ctx); assert.match(f.messages.join(), /deleted or conflicted/); assert.equal(mutations(f).length, 0); });
test("JJ selection/confirmation cancellation leaves bookmarks untouched", async () => {
  const f = fixture(true); f.cancel(); await f.handler("", f.ctx); assert.equal(mutations(f).length, 0);
  const remote = fixture(true, { remotes: "one url\ntwo url" }); await remote.handler("", remote.ctx); assert.equal(mutations(remote).length, 0);
});
test("JJ dry-run failure warns local bookmark moved; no actual push", async () => { const f = fixture(true, { dry: 1 }); await f.handler("", f.ctx); assert.equal(mutations(f).length, 2); assert.match(f.messages.join(), /moved locally/); });
test("JJ stale target or bookmark refuses mutation", async () => {
  let reads = 0; const f = fixture(true, { "log @": () => commit(++reads === 1 ? id : "c".repeat(40)) }); await f.handler("", f.ctx); assert.equal(mutations(f).length, 0); assert.match(f.messages.join(), /changed during confirmation/);
  let refs = 0; const b = fixture(true, { bookmarks: () => ref("main", "", ++refs === 1 ? parent : id) }); await b.handler("", b.ctx); assert.equal(mutations(b).length, 0);
});
test("Concurrent /push blocked while confirmation pending", async () => {
  const f = fixture(); let release!: (value: boolean) => void;
  f.ctx.ui.confirm = () => new Promise(resolve => { release = resolve; });
  const first = f.handler("", f.ctx); while (!release) await new Promise(resolve => setImmediate(resolve));
  await f.handler("", f.ctx); assert.match(f.messages.join(), /already in progress/); release(false); await first;
});

test("Git stale HEAD or branch refuses push after confirmation", async () => {
  for (const key of ["head", "branch"]) {
    let reads = 0;
    const original = key === "head" ? id : "main";
    const f = fixture(false, { [key]: () => ++reads === 1 ? original : "changed" });
    await f.handler("", f.ctx);
    assert.equal(mutations(f).length, 0);
    assert.match(f.messages.join(), /Git state changed during confirmation/);
  }
});

test("JJ bookmark changed after dry-run refuses actual push", async () => {
  const f = fixture(true, { reviewedBookmarks: ref("main", "", parent) });
  await f.handler("", f.ctx);
  assert.equal(mutations(f).length, 2);
  assert.ok(mutations(f)[1].includes("--dry-run"));
  assert.match(f.messages.join(), /Bookmark changed after dry-run/);
  assert.match(f.messages.join(), /No automatic rollback/);
});

const execFileAsync = promisify(execFile);
const localEnv = {
  ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", JJ_CONFIG: "/dev/null",
  GIT_AUTHOR_NAME: "Push Test", GIT_AUTHOR_EMAIL: "push@example.invalid",
  GIT_COMMITTER_NAME: "Push Test", GIT_COMMITTER_EMAIL: "push@example.invalid",
};
async function nativeExec(command: string, args: string[], options: { cwd: string; timeout: number }) {
  try {
    const result = await execFileAsync(command, args, { ...options, env: localEnv });
    return { code: 0, ...result };
  } catch (error) {
    const result = error as Error & { code: number; stdout: string; stderr: string };
    if (typeof result.code !== "number") throw error;
    return { code: result.code, stdout: result.stdout, stderr: result.stderr };
  }
}
async function sandbox(t: TestContext) {
  const base = "/tmp/pi-coding-agent/push";
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, "test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = join(root, "repo"), remote = join(root, "remote.git");
  await mkdir(repo);
  const run = async (command: string, args: string[], cwd = repo) => {
    const result = await nativeExec(command, args, { cwd, timeout: 10000 });
    assert.equal(result.code, 0, `${command} ${args.join(" ")}: ${result.stderr}`);
    return result.stdout.trim();
  };
  await run("git", ["init", "--bare", remote], root);
  const messages: string[] = [], confirmations: string[] = [];
  const ctx: PushContext = { cwd: repo, hasUI: true, ui: {
    confirm: async (_title, message) => { confirmations.push(message); return true; },
    select: async (_title, choices) => choices[0],
    notify: message => { messages.push(message); },
  } };
  return { repo, remote, run, ctx, messages, confirmations };
}

test("Local Git pushes new slash branch with upstream, then differently-named destination", async t => {
  const s = await sandbox(t);
  await s.run("git", ["init", "-b", "topic/slash"]);
  await writeFile(join(s.repo, "file"), "reviewed\n");
  await s.run("git", ["add", "file"]);
  await s.run("git", ["commit", "-m", "feat: local fixture"]);
  await s.run("git", ["remote", "add", "origin", s.remote]);
  const handler = createPushHandler(nativeExec);
  const head = await s.run("git", ["rev-parse", "HEAD"]);
  await handler("", s.ctx);
  assert.equal(await s.run("git", ["--git-dir", s.remote, "rev-parse", "refs/heads/topic/slash"]), head);
  assert.equal(await s.run("git", ["config", "--get", "branch.topic/slash.remote"]), "origin");
  assert.equal(await s.run("git", ["config", "--get", "branch.topic/slash.merge"]), "refs/heads/topic/slash");
  assert.match(s.confirmations[0], /Create upstream tracking/);
  await s.run("git", ["config", "branch.topic/slash.merge", "refs/heads/release/destination"]);
  await handler("", s.ctx);
  assert.equal(await s.run("git", ["--git-dir", s.remote, "rev-parse", "refs/heads/release/destination"]), head);
  assert.match(s.confirmations[1], /origin:refs\/heads\/release\/destination/);
});

for (const emptyChild of [true, false]) {
  test(`Local JJ pushes ${emptyChild ? "@- after empty jj new" : "described @ without snapshotting later edits"}`, async t => {
    const s = await sandbox(t);
    const jj = (args: string[]) => s.run("jj", ["--no-pager", "--color=never", "--config", "user.name=Push Test", "--config", "user.email=push@example.invalid", ...args]);
    await jj(["git", "init"]);
    await writeFile(join(s.repo, "file"), "base\n");
    await jj(["describe", "-m", "feat: base"]);
    await jj(["bookmark", "create", "topic/slash", "-r", "@"]);
    const base = await jj(["log", "--no-graph", "-r", "@", "-T", "commit_id"]);
    await jj(["git", "remote", "add", "origin", s.remote]);
    await jj(["new", "-m", "feat: reviewed target"]);
    await writeFile(join(s.repo, "file"), "reviewed\n");
    const reviewed = await jj(["log", "--no-graph", "-r", "@", "-T", "commit_id"]);
    if (emptyChild) await jj(["new"]);
    let lateEdit = false;
    const handler = createPushHandler(async (command, args, options) => {
      assert.equal(command, "jj", "Never invoke Git inside JJ fixture");
      if (args.includes("move")) {
        assert.ok(args.includes("--ignore-working-copy"));
        await writeFile(join(s.repo, "file"), "unreviewed late edit\n");
        lateEdit = true;
      }
      return nativeExec(command, ["--config", "user.name=Push Test", "--config", "user.email=push@example.invalid", ...args], options);
    });
    await handler("", s.ctx);
    assert.ok(lateEdit, s.messages.join("\n"));
    assert.notEqual(reviewed, base);
    assert.equal(await jj(["--ignore-working-copy", "log", "--no-graph", "-r", "topic/slash", "-T", "commit_id"]), reviewed);
    assert.equal(await s.run("git", ["--git-dir", s.remote, "rev-parse", "refs/heads/topic/slash"], s.remote), reviewed, s.messages.join("\n"));
    assert.equal(await s.run("git", ["--git-dir", s.remote, "show", "refs/heads/topic/slash:file"], s.remote), "reviewed");
    assert.equal(s.confirmations[0].includes("@ contents will be published"), !emptyChild);
    assert.notEqual(await jj(["log", "--no-graph", "-r", "@", "-T", "commit_id"]), reviewed);
  });
}
