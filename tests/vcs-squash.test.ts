import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import registerCommit from "../pi-agent/extensions/vcs-commit.ts";

function fixture(t: { after: (fn: () => void) => void }) {
  const parent = "/tmp/pi-coding-agent";
  mkdirSync(parent, { recursive: true });
  const cwd = mkdtempSync(join(parent, "vcs-squash-test-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const env = {
    ...process.env,
    JJ_CONFIG: "/dev/null",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "VCS Test",
    GIT_AUTHOR_EMAIL: "vcs@example.invalid",
    GIT_COMMITTER_NAME: "VCS Test",
    GIT_COMMITTER_EMAIL: "vcs@example.invalid",
  };
  const run = (command: string, ...args: string[]) =>
    execFileSync(command, args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  return { cwd, run, write: (path: string, value: string) => writeFileSync(join(cwd, path), value) };
}

test("commit command delegates logical-change grouping and preserves caller context", async (t) => {
  const { cwd, run, write } = fixture(t);
  run("git", "init", "-b", "main");
  write("feature.txt", "new feature\n");
  type Command = { handler(args: string, ctx: { cwd: string; hasUI: boolean }): Promise<void> };
  const commands = new Map<string, Command>();
  const prompts: string[] = [];
  registerCommit({
    registerCommand: (name: string, command: Command) => commands.set(name, command),
    sendUserMessage: (prompt: string) => prompts.push(prompt),
  } as Parameters<typeof registerCommit>[0]);

  await commands.get("commit-changes")!.handler("Keep feature and tests together", { cwd, hasUI: false });

  assert.equal(prompts.length, 1);
  assert.match(prompts[0], /Delegate this entire request to the `commit-changes` subagent/);
  assert.match(prompts[0], /Perform no git or jj shell operations yourself/);
  assert.match(prompts[0], /one commit per logical change, not per changed path/);
  assert.doesNotMatch(prompts[0], /Default to one commit per changed path/);
  assert.ok(prompts[0].includes(cwd));
  assert.match(prompts[0], /Keep feature and tests together/);
});

test("native JJ squash preserves tip tree, base, bookmark and empty working copy", (t) => {
  const { run, write } = fixture(t);
  const jj = (...args: string[]) => run("jj", "--no-pager", "--config", 'user.name="VCS Test"', "--config", 'user.email="vcs@example.invalid"', ...args);
  const id = (rev: string) => jj("log", "--no-graph", "-r", rev, "-T", "commit_id");
  jj("git", "init", "--colocate");
  write("feature.txt", "base\n");
  jj("describe", "-m", "chore: base");
  jj("bookmark", "create", "main");
  const base = id("@");
  jj("new", "-m", "feat: first");
  write("feature.txt", "first\n");
  const first = id("@");
  jj("new", "-m", "fix: second");
  write("feature.txt", "second\n");
  jj("new", "-m", "feat: third");
  write("feature.txt", "third\n");
  write("added.txt", "new file\n");
  jj("bookmark", "create", "topic");
  const oldTip = id("topic");
  jj("new");

  jj("squash", "--from", `${first}..${oldTip}`, "--into", first, "-m", "feat: combine feature");

  const newTip = id("topic");
  assert.notEqual(newTip, oldTip);
  assert.equal(jj("diff", "--from", oldTip, "--to", newTip, "--summary"), "");
  assert.equal(id("parents(topic)"), base);
  assert.equal(jj("log", "--no-graph", "-r", `${base}..topic`, "-T", 'commit_id ++ "\n"').split("\n").length, 1);
  assert.equal(id("main"), base);
  assert.equal(id("@-"), newTip);
  assert.equal(jj("diff", "--summary"), "");
});

test("native Git soft-reset squash preserves tip tree, base and clean working tree", (t) => {
  const { run, write } = fixture(t);
  const git = (...args: string[]) => run("git", ...args);
  git("init", "-b", "main");
  write("feature.txt", "base\n");
  git("add", ".");
  git("commit", "-m", "chore: base");
  const base = git("rev-parse", "HEAD");
  git("switch", "-c", "topic");
  for (const value of ["first", "second", "third"]) {
    write("feature.txt", `${value}\n`);
    git("add", "feature.txt");
    git("commit", "-m", `feat: ${value}`);
  }
  const oldTip = git("rev-parse", "HEAD");
  assert.equal(git("status", "--porcelain"), "");

  git("reset", "--soft", base);
  git("commit", "-m", "feat: combine feature");

  assert.notEqual(git("rev-parse", "HEAD"), oldTip);
  assert.equal(git("diff", "--exit-code", oldTip, "HEAD"), "");
  assert.equal(git("rev-parse", "HEAD^"), base);
  assert.equal(git("rev-list", "--count", `${base}..HEAD`), "1");
  assert.equal(git("rev-parse", "main"), base);
  assert.equal(git("status", "--porcelain"), "");
});
