/**
 * pi-agents-slash — registers /agents slash command that lists all available
 * subagents (builtin, user, project) and chains.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// ---------------------------------------------------------------------------
// Frontmatter parsing (same logic as pi-subagents/src/agents/frontmatter.ts)
// ---------------------------------------------------------------------------

interface AgentMeta {
  name: string;
  description: string;
  model?: string;
  defaultContext?: string;
  packageName?: string;
  source: "builtin" | "user" | "project";
  filePath: string;
}

interface ChainMeta {
  name: string;
  description: string;
  source: "user" | "project";
  filePath: string;
  stepAgents: string[];
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const frontmatter: Record<string, string> = {};
  const normalized = content.replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---")) return { frontmatter, body: normalized };

  const endIndex = normalized.indexOf("\n---", 3);
  if (endIndex === -1) return { frontmatter, body: normalized };

  const block = normalized.slice(4, endIndex);
  const body = normalized.slice(endIndex + 4).trim();

  const lines = block.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const match = line.match(/^([\w-]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1]!;
    let value = match[2]!.trim();

    // Handle YAML block scalars: | or >
    if (value === "|" || value === ">") {
      const blockLines: string[] = [];
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1]!;
        const indentMatch = nextLine.match(/^(  |\t)(.*)/);
        if (!indentMatch) break;
        blockLines.push(indentMatch[2]!);
        i++;
      }
      value = blockLines.join("\n").trim();
    } else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    frontmatter[key] = value;
  }
  return { frontmatter, body };
}

// ---------------------------------------------------------------------------
// Agent discovery
// ---------------------------------------------------------------------------

function getAgentDir(): string {
  return process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), ".pi", "agent");
}

function loadSettings(): Record<string, unknown> | null {
  const settingsPath = path.join(getAgentDir(), "settings.json");
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch {
    return null;
  }
}

function resolveBuiltinModel(
  agentName: string,
  settings: Record<string, unknown> | null,
  sessionModel?: string,
): string | undefined {
  const subagents = settings?.subagents as Record<string, unknown> | undefined;
  const overrides = subagents?.agentOverrides as Record<string, Record<string, string>> | undefined;
  return overrides?.[agentName]?.model
    || (subagents?.defaultModel as string)
    || sessionModel
    || (settings?.defaultModel as string)
    || undefined;
}

function findNearestProjectRoot(cwd: string): string | null {
  let dir = cwd;
  while (true) {
    if (fs.existsSync(path.join(dir, ".pi")) || fs.existsSync(path.join(dir, ".agents"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function listMarkdownFilesRecursive(
  dir: string,
  predicate: (name: string) => boolean,
): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".")) continue;
      files.push(...listMarkdownFilesRecursive(fullPath, predicate));
    } else if (
      (entry.isFile() || entry.isSymbolicLink()) &&
      predicate(entry.name)
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function readAgentFile(filePath: string, source: AgentMeta["source"]): AgentMeta | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const { frontmatter } = parseFrontmatter(content);
    if (!frontmatter.name) return null;
    if (frontmatter.disabled === "true") return null;

    return {
      name: frontmatter.name,
      description: frontmatter.description || "",
      model: frontmatter.model || undefined,
      defaultContext: frontmatter.defaultContext || undefined,
      packageName: frontmatter.package || undefined,
      source,
      filePath,
    };
  } catch {
    return null;
  }
}

function readChainFile(filePath: string, source: ChainMeta["source"]): ChainMeta | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const { frontmatter } = parseFrontmatter(content);
    if (!frontmatter.name) return null;

    // Extract agent names from step lines like "- agent: scout"
    const stepAgents: string[] = [];
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*-\s+agent:\s*(\S+)/);
      if (match) stepAgents.push(match[1]!);
    }

    return {
      name: frontmatter.name,
      description: frontmatter.description,
      source,
      filePath,
      stepAgents,
    };
  } catch {
    return null;
  }
}

function discoverAll(cwd: string, sessionModel?: string): {
  agents: AgentMeta[];
  chains: ChainMeta[];
} {
  const settings = loadSettings();

  const agents: AgentMeta[] = [];
  const chains: ChainMeta[] = [];

  // Builtin agents
  // The pi-subagents package might be at different paths. Check a few.
  const builtinCandidates = [
    path.join(getAgentDir(), "npm", "node_modules", "pi-subagents", "agents"),
    path.join(getAgentDir(), "..", "npm", "lib", "node_modules", "pi-subagents", "agents"),
    path.join(os.homedir(), ".pi", "npm", "lib", "node_modules", "pi-subagents", "agents"),
  ];
  for (const candidate of builtinCandidates) {
    if (fs.existsSync(candidate)) {
      for (const fp of listMarkdownFilesRecursive(candidate, (n) => n.endsWith(".md") && !n.endsWith(".chain.md"))) {
        const agent = readAgentFile(fp, "builtin");
        if (agent) {
          // Resolve model from settings: overrides → defaults
          if (!agent.model) {
            agent.model = resolveBuiltinModel(agent.name, settings, sessionModel);
          }
          agents.push(agent);
        }
      }
      break;
    }
  }

  // User agents
  const userDirs = [
    path.join(getAgentDir(), "agents"),
    path.join(os.homedir(), ".agents"),
  ];
  for (const dir of userDirs) {
    for (const fp of listMarkdownFilesRecursive(dir, (n) => n.endsWith(".md") && !n.endsWith(".chain.md"))) {
      const agent = readAgentFile(fp, "user");
      if (agent) agents.push(agent);
    }
  }

  // User chains
  const userChainDir = path.join(getAgentDir(), "chains");
  for (const fp of listMarkdownFilesRecursive(userChainDir, (n) => n.endsWith(".chain.md"))) {
    const chain = readChainFile(fp, "user");
    if (chain) chains.push(chain);
  }

  // Project agents and chains
  const projectRoot = findNearestProjectRoot(cwd);
  if (projectRoot) {
    const projectAgentsDir = path.join(projectRoot, ".pi", "agents");
    if (fs.existsSync(projectAgentsDir)) {
      for (const fp of listMarkdownFilesRecursive(projectAgentsDir, (n) => n.endsWith(".md") && !n.endsWith(".chain.md"))) {
        const agent = readAgentFile(fp, "project");
        if (agent) agents.push(agent);
      }
    }
    const projectChainsDir = path.join(projectRoot, ".pi", "chains");
    if (fs.existsSync(projectChainsDir)) {
      for (const fp of listMarkdownFilesRecursive(projectChainsDir, (n) => n.endsWith(".chain.md"))) {
        const chain = readChainFile(fp, "project");
        if (chain) chains.push(chain);
      }
    }
  }

  return { agents, chains };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatAgents(agents: AgentMeta[], chains: ChainMeta[]): string {
  const lines: string[] = [];
  const grouped = new Map<string, AgentMeta[]>();
  for (const a of agents) {
    const list = grouped.get(a.source) || [];
    list.push(a);
    grouped.set(a.source, list);
  }

  const sourceOrder: AgentMeta["source"][] = ["builtin", "user", "project"];
  const sourceLabels: Record<string, string> = {
    builtin: "Builtin",
    user: "User",
    project: "Project",
  };

  for (const source of sourceOrder) {
    const list = grouped.get(source);
    if (!list || list.length === 0) continue;
    list.sort((a, b) => a.name.localeCompare(b.name));
    lines.push(`### ${sourceLabels[source]}`);
    for (const agent of list) {
      const meta: string[] = [];
      if (agent.model) meta.push(`model: \`${agent.model}\``);
      if (agent.defaultContext) meta.push(`context: ${agent.defaultContext}`);
      if (agent.packageName) meta.push(`pkg: ${agent.packageName}`);
      const metaStr = meta.length > 0 ? ` (${meta.join(", ")})` : "";
      const desc = agent.description ? `: ${agent.description}` : "";
      lines.push(`- **${agent.name}**${metaStr}${desc}`);
      if (source !== "builtin") {
        lines.push(`  \`${agent.filePath.replace(os.homedir(), "~")}\``);
      }
    }
    lines.push("");
  }

  if (chains.length > 0) {
    lines.push("### Chains");
    for (const chain of chains.sort((a, b) => a.name.localeCompare(b.name))) {
      const steps = chain.stepAgents.join(" → ");
      const chainDesc = chain.description ? `: ${chain.description}` : "";
      lines.push(`- **${chain.name}** (${chain.source})${chainDesc}`);
      if (steps) lines.push(`  Steps: ${steps}`);
    }
    lines.push("");
  }

  const total = agents.length;
  if (total === 0) {
    lines.push("No agents found.");
    lines.push("");
    lines.push("Create agent files at:");
    lines.push("- `~/.pi/agent/agents/**/*.md` (user)");
    lines.push("- `.pi/agents/**/*.md` (project)");
  } else {
    lines.push("---");
    lines.push(`Total: ${total} agents, ${chains.length} chains`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function register(pi: ExtensionAPI): void {
  let cwd = process.cwd();

  // Capture cwd on session start
  pi.on("session_start", (_event, ctx: ExtensionContext) => {
    cwd = ctx.cwd;
  });

  pi.registerCommand("agents", {
    description: "List available agents (builtin, user, project)",
    handler: async (_args: string, ctx: ExtensionContext) => {
      try {
        const sessionModel = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined;
        const { agents, chains } = discoverAll(cwd, sessionModel);
        const output = formatAgents(agents, chains);
        pi.sendMessage({
          customType: "agents-list",
          content: output,
          display: true,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`Failed to list agents: ${msg}`, "error");
      }
    },
  });
}
