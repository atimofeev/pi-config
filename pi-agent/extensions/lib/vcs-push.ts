import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export type PushExec = (command: string, args: string[], options: { cwd: string; timeout: number }) => Promise<{ code: number; stdout: string; stderr: string }>;
export type PushContext = {
  cwd: string;
  hasUI: boolean;
  ui: {
    select(title: string, options: string[]): Promise<string | undefined>;
    confirm(title: string, message: string): Promise<boolean>;
    notify(message: string, level: "info" | "warning" | "error"): void;
  };
};
const COMMIT_TEMPLATE = 'commit_id ++ "\\t" ++ description.escape_json() ++ "\\t" ++ empty ++ "\\t" ++ conflict ++ "\\n"';
const BOOKMARK_TEMPLATE = 'self.name().escape_json() ++ "\\t" ++ if(self.remote(), self.remote().escape_json(), "\\"\\"") ++ "\\t" ++ self.tracked() ++ "\\t" ++ self.present() ++ "\\t" ++ if(self.normal_target(), self.normal_target().commit_id(), "") ++ "\\n"';
type Commit = { id: string; description: string; empty: boolean; conflict: boolean };
type Bookmark = { name: string; remote: string; tracked: boolean; present: boolean; id: string };
const lines = (text: string) => text.trim().split("\n").filter(Boolean);

export function findJjRoot(cwd: string): string | undefined {
  for (let path = cwd; ; path = dirname(path)) {
    if (existsSync(join(path, ".jj"))) return path;
    if (dirname(path) === path) return undefined;
  }
}

export function createPushHandler(exec: PushExec, detectJj = findJjRoot) {
  let busy = false;
  return async (args: string, ctx: PushContext): Promise<void> => {
    if (!ctx.hasUI) { ctx.ui.notify("/push requires interactive UI", "error"); return; }
    if (busy) { ctx.ui.notify("Push already in progress", "warning"); return; }
    busy = true;
    let moved = false;
    try {
      let cwd = ctx.cwd;
      const run = async (command: string, argv: string[], optional = false) => {
        const result = await exec(command, argv, { cwd, timeout: 120000 });
        if (result.code !== 0 && !optional) throw new Error(result.stderr.trim() || result.stdout.trim() || `${command} exited ${result.code}`);
        return result;
      };
      const git = async (argv: string[], optional = false) => (await run("git", argv, optional)).stdout.trim();
      const jj = async (argv: string[]) => (await run("jj", ["--no-pager", "--color=never", ...argv])).stdout.trim();
      const choose = async (title: string, choices: string[]) => {
        if (!choices.length) throw new Error(`No ${title.toLowerCase()} available`);
        return choices.length === 1 ? choices[0] : ctx.ui.select(title, choices);
      };
      const jjRoot = detectJj(cwd);
      if (!jjRoot) {
        if (args.trim()) throw new Error("Bookmark argument is supported only in Jujutsu repositories");
        cwd = await git(["rev-parse", "--show-toplevel"]);
        if (!cwd) throw new Error("No Git or Jujutsu repository found");
        const branchResult = await run("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], true);
        const branch = branchResult.stdout.trim();
        if (branchResult.code || !branch) throw new Error("Detached HEAD: switch to a branch before /push");
        const remoteConfig = await git(["config", "--get", `branch.${branch}.remote`], true);
        const merge = await git(["config", "--get", `branch.${branch}.merge`], true);
        const upstream = Boolean(remoteConfig && merge);
        const remote = upstream ? remoteConfig : await choose("Remote", lines(await git(["remote"])));
        if (!remote) return;
        const destination = upstream ? merge : `refs/heads/${branch}`;
        if (!destination.startsWith("refs/heads/") || destination.includes("\n")) throw new Error("Upstream must name exactly one branch ref");
        const dirty = await git(["status", "--porcelain"]);
        const head = await git(["rev-parse", "HEAD"]);
        if (!await ctx.ui.confirm("Push Git branch", `${branch} (${head}) -> ${remote}:${destination}${upstream ? "" : "\nCreate upstream tracking."}${dirty ? "\nWorking-copy changes are ignored; no auto-commit." : ""}`)) return;
        if (await git(["symbolic-ref", "--quiet", "--short", "HEAD"]) !== branch || await git(["rev-parse", "HEAD"]) !== head || await git(["config", "--get", `branch.${branch}.remote`], true) !== remoteConfig || await git(["config", "--get", `branch.${branch}.merge`], true) !== merge) throw new Error("Git state changed during confirmation; retry /push");
        const output = await git(["push", "--no-follow-tags", ...(upstream ? [] : ["--set-upstream"]), "--", remote, `refs/heads/${branch}:${destination}`]);
        ctx.ui.notify(output || "Push succeeded", "info");
        return;
      }
      cwd = jjRoot;
      await jj(["root"]);
      const commits = async (rev: string): Promise<Commit[]> => lines(await jj(["log", "--no-graph", "-r", rev, "-T", COMMIT_TEMPLATE])).map(line => {
        const [id, description, empty, conflict] = line.split("\t");
        return { id, description: JSON.parse(description), empty: empty === "true", conflict: conflict === "true" };
      });
      const bookmarks = async (): Promise<Bookmark[]> => lines(await jj(["bookmark", "list", "--all-remotes", "-T", BOOKMARK_TEMPLATE])).map(line => {
        const [name, remote, tracked, present, id] = line.split("\t");
        return { name: JSON.parse(name), remote: JSON.parse(remote), tracked: tracked === "true", present: present === "true", id };
      });
      const resolveTarget = async () => {
        const working = await commits("@");
        if (working.length !== 1) throw new Error("Working-copy target is ambiguous");
        const useWorking = !working[0].empty || Boolean(working[0].description.trim());
        const targets = useWorking ? working : await commits("@-");
        if (targets.length !== 1) throw new Error("Empty working copy has multiple parents; target is ambiguous");
        const target = targets[0];
        if (!target.description.trim()) throw new Error("Target has no description; run /ci first");
        if (/^0+$/.test(target.id) || target.conflict) throw new Error("Cannot push root or conflicted target");
        return { target, useWorking };
      };
      const { target, useWorking } = await resolveTarget();
      const refs = await bookmarks();
      const local = refs.filter(ref => !ref.remote);
      let name = args.trim();
      if (!name) {
        const nearest = await commits(`heads(::${target.id} & bookmarks())`);
        const ids = new Set(nearest.map(commit => commit.id));
        const candidates = local.filter(ref => ref.present && ref.id && ids.has(ref.id)).map(ref => ref.name);
        if (!candidates.length) throw new Error("No ancestor bookmark; use /push <existing-bookmark> or create a bookmark first");
        name = await choose("Bookmark", candidates) || "";
        if (!name) return;
      }
      const bookmark = local.find(ref => ref.name === name);
      if (!bookmark?.present || !bookmark.id) throw new Error("Bookmark must exist locally and not be deleted or conflicted");
      const remotes = lines(await jj(["git", "remote", "list"])).map(line => line.split(/\s+/)[0]);
      const tracked = refs.filter(ref => ref.name === name && ref.remote && ref.tracked && remotes.includes(ref.remote)).map(ref => ref.remote);
      const remote = await choose("Remote", [...new Set(tracked.length ? tracked : remotes)]);
      if (!remote) return;
      if (!await ctx.ui.confirm("Push Jujutsu bookmark", `${name}: ${bookmark.id} -> ${target.id}\n${target.description.trim()}\nRemote: ${remote}${useWorking ? "\nWorking-copy @ contents will be published." : ""}\nBookmark will move locally before push validation.`)) return;
      const fresh = await resolveTarget();
      const freshBookmark = (await bookmarks()).find(ref => !ref.remote && ref.name === name);
      if (fresh.target.id !== target.id || fresh.useWorking !== useWorking || !freshBookmark?.present || freshBookmark.id !== bookmark.id) throw new Error("Target or bookmark changed during confirmation; retry /push");
      // Do not snapshot edits made after confirmation into the reviewed commit.
      const mutationFlags = ["--no-pager", "--color=never", "--ignore-working-copy"];
      await run("jj", [...mutationFlags, "bookmark", "move", `exact:${name}`, "--to", target.id]);
      moved = true;
      const push = ["git", "push", "--remote", remote, "-b", `exact:${name}`];
      const preview = await run("jj", [...mutationFlags, ...push, "--dry-run"], true);
      ctx.ui.notify([preview.stdout, preview.stderr].filter(Boolean).join("\n") || "Dry-run succeeded", preview.code ? "error" : "info");
      if (preview.code) throw new Error("Jujutsu push dry-run failed");
      const reviewedRefs = await run("jj", [...mutationFlags, "bookmark", "list", "--all-remotes", "-T", BOOKMARK_TEMPLATE]);
      const reviewedBookmark = lines(reviewedRefs.stdout).find(line => {
        const [refName, refRemote, , present, id] = line.split("\t");
        return JSON.parse(refName) === name && JSON.parse(refRemote) === "" && present === "true" && id === target.id;
      });
      if (!reviewedBookmark) throw new Error("Bookmark changed after dry-run; retry /push");
      const result = await run("jj", [...mutationFlags, ...push]);
      ctx.ui.notify([result.stdout, result.stderr].filter(Boolean).join("\n") || "Push succeeded", "info");
    } catch (error) {
      ctx.ui.notify(`${error instanceof Error ? error.message : String(error)}${moved ? "\nBookmark may now be moved locally; inspect before retrying. No automatic rollback." : ""}`, "error");
    } finally { busy = false; }
  };
}
