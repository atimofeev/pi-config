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

const subject = (description: string) => description.split(/[\r\n]/)[0].replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
const review = (destination: string, target: Pick<Commit, "id" | "description">, outgoing?: Pick<Commit, "id" | "description">[]) => [
  `Destination: ${destination}`,
  `Target: ${target.id.slice(0, 12)} ${subject(target.description)}`,
  ...(outgoing ? [`Outgoing: ${outgoing.length} commits (oldest-first)`, ...outgoing.slice(0, 20).map(commit => `${commit.id.slice(0, 12)} ${subject(commit.description)}`), ...(outgoing.length > 20 ? [`... ${outgoing.length - 20} more commits`] : [])] : ["Outgoing count unavailable: remote bookmark not known locally."]),
].join("\n");

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
        const remoteRef = `refs/remotes/${remote}/${destination.slice("refs/heads/".length)}`;
        const readRemote = async () => {
          const result = await run("git", ["rev-parse", "--verify", remoteRef], true);
          return result.code === 0 && /^[0-9a-f]{40,64}$/.test(result.stdout.trim()) ? result.stdout.trim() : undefined;
        };
        const remoteId = await readRemote();
        const gitCommits = async (rev: string) => lines(await git(["log", "--reverse", "--format=%H%x09%s", rev])).map(line => {
          const [id, ...description] = line.split("\t");
          return { id, description: description.join("\t") };
        });
        const targetSubject = await git(["show", "-s", "--format=%s", head]);
        const readable = review(`${remote}/${destination.slice("refs/heads/".length)}`, { id: head, description: targetSubject }, remoteId ? await gitCommits(`${remoteId}..${head}`) : undefined);
        if (!await ctx.ui.confirm("Push Git branch", `${readable}${upstream ? "" : "\nCreate upstream tracking."}${dirty ? "\nWorking-copy changes are ignored; no auto-commit." : ""}`)) return;
        if (await git(["symbolic-ref", "--quiet", "--short", "HEAD"]) !== branch || await git(["rev-parse", "HEAD"]) !== head || await git(["config", "--get", `branch.${branch}.remote`], true) !== remoteConfig || await git(["config", "--get", `branch.${branch}.merge`], true) !== merge) throw new Error("Git state changed during confirmation; retry /push");
        if (remoteId && await readRemote() !== remoteId) throw new Error("Git remote-tracking ref changed during confirmation; retry /push");
        const output = await git(["push", "--no-follow-tags", ...(upstream ? [] : ["--set-upstream"]), "--", remote, `refs/heads/${branch}:${destination}`]);
        ctx.ui.notify(`${readable}\n${output || "Push succeeded"}`, "info");
        return;
      }
      cwd = jjRoot;
      await jj(["root"]);
      const commits = async (rev: string, reversed = false): Promise<Commit[]> => lines(await jj(["log", "--no-graph", ...(reversed ? ["--reversed"] : []), "-r", rev, "-T", COMMIT_TEMPLATE])).map(line => {
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
      const remoteRef = refs.find(ref => ref.name === name && ref.remote === remote && ref.present && /^[0-9a-f]{40,64}$/.test(ref.id));
      const outgoing = remoteRef ? await commits(`${remoteRef.id}..${target.id}`, true) : undefined;
      const excluded = remoteRef ? await commits(`${target.id}..${remoteRef.id}`, true) : [];
      const readable = review(`${remote}/${name}`, target, outgoing) + (excluded.length ? `\nWarning: remote history excludes ${excluded.length} previous commits; native validation may reject this backwards/rewrite push.` : "");
      if (!await ctx.ui.confirm("Push Jujutsu bookmark", `${readable}\nLocal bookmark: ${bookmark.id.slice(0, 12)} -> ${target.id.slice(0, 12)}${useWorking ? "\nWorking-copy @ contents will be published." : ""}\nBookmark will move locally before push validation.`)) return;
      const fresh = await resolveTarget();
      const freshRefs = await bookmarks();
      if (remoteRef && !freshRefs.some(ref => ref.name === name && ref.remote === remote && ref.present && ref.id === remoteRef.id)) throw new Error("Remote bookmark changed during confirmation; retry /push");
      const freshBookmark = freshRefs.find(ref => !ref.remote && ref.name === name);
      if (fresh.target.id !== target.id || fresh.useWorking !== useWorking || !freshBookmark?.present || freshBookmark.id !== bookmark.id) throw new Error("Target or bookmark changed during confirmation; retry /push");
      // Do not snapshot edits made after confirmation into the reviewed commit.
      const mutationFlags = ["--no-pager", "--color=never", "--ignore-working-copy"];
      await run("jj", [...mutationFlags, "bookmark", "move", `exact:${name}`, "--to", target.id]);
      moved = true;
      const push = ["git", "push", "--remote", remote, "-b", `exact:${name}`];
      const preview = await run("jj", [...mutationFlags, ...push, "--dry-run"], true);
      ctx.ui.notify([...(preview.code ? [] : [readable]), preview.stdout, preview.stderr].filter(Boolean).join("\n") || "Dry-run succeeded", preview.code ? "error" : "info");
      if (preview.code) throw new Error("Jujutsu push dry-run failed");
      const reviewedRefs = await run("jj", [...mutationFlags, "bookmark", "list", "--all-remotes", "-T", BOOKMARK_TEMPLATE]);
      const reviewedBookmark = lines(reviewedRefs.stdout).find(line => {
        const [refName, refRemote, , present, id] = line.split("\t");
        return JSON.parse(refName) === name && JSON.parse(refRemote) === "" && present === "true" && id === target.id;
      });
      if (!reviewedBookmark) throw new Error("Bookmark changed after dry-run; retry /push");
      const result = await run("jj", [...mutationFlags, ...push]);
      ctx.ui.notify(`${readable}\n${[result.stdout, result.stderr].filter(Boolean).join("\n") || "Push succeeded"}`, "info");
    } catch (error) {
      ctx.ui.notify(`${error instanceof Error ? error.message : String(error)}${moved ? "\nBookmark may now be moved locally; inspect before retrying. No automatic rollback." : ""}`, "error");
    } finally { busy = false; }
  };
}
