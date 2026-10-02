import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type NativeConfig = Parameters<ExtensionAPI["registerMcpServer"]>[1];
const fields = ["type", "command", "args", "env", "cwd", "url", "headers", "oauth", "timeout", "enabled", "exposure", "toolExposure", "description"];
const deferred = new Set(["aws-docs", "nixos", "paperless"]);
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function convertSharedServer(name: string, value: unknown): NativeConfig {
  if (!object(value)) throw new Error("invalid definition");
  const config: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.hasOwn(value, field)) config[field] = value[field];
  }
  if (!Object.hasOwn(value, "exposure")) {
    config.exposure = value.directTools === true ? "direct" : value.directTools === "search" ? "deferred" : "codemode";
  }
  if (deferred.has(name)) config.exposure = "deferred";
  if (!Object.hasOwn(value, "enabled") && typeof value.disabled === "boolean") config.enabled = !value.disabled;
  if (!Object.hasOwn(value, "timeout") && typeof value.requestTimeoutMs === "number" && Number.isFinite(value.requestTimeoutMs) && value.requestTimeoutMs > 0) {
    config.timeout = value.requestTimeoutMs / 1000;
  }
  if (Object.hasOwn(value, "auth") && value.auth !== "bearer") throw new Error("unsupported authentication");
  if (value.auth === "bearer" || Object.hasOwn(value, "bearerToken")) {
    if (typeof value.bearerToken !== "string" || !value.bearerToken.trim()) throw new Error("invalid bearer token");
    if (Object.hasOwn(value, "headers") && !object(value.headers)) throw new Error("invalid headers");
    const headers = object(value.headers) ? value.headers : {};
    if (Object.keys(headers).some((key) => key.toLowerCase() === "authorization")) throw new Error("ambiguous authentication");
    const token = value.bearerToken;
    if (token.startsWith("!") && !token.slice(1).trim()) throw new Error("invalid bearer token");
    // Keep native credential resolution lazy; assignment preserves command failure status.
    config.headers = { ...headers, Authorization: token.startsWith("!")
      ? `!token=$(${token.slice(1)}) && printf 'Bearer %s' "$token"`
      : `Bearer ${token}` };
  }
  return config as NativeConfig;
}

export function registerSharedServers(pi: ExtensionAPI, path: string): string[] {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return ["Shared MCP configuration could not be read or parsed."];
  }
  if (!object(data) || !object(data.mcpServers)) return ["Shared MCP configuration has an invalid server map."];
  const issues: string[] = [];
  for (const [name, value] of Object.entries(data.mcpServers)) {
    if (!/^[A-Za-z0-9_-]+$/.test(name)) {
      issues.push("Shared MCP entry has an invalid server name.");
      continue;
    }
    try {
      pi.registerMcpServer(name, convertSharedServer(name, value));
    } catch {
      issues.push(`Shared MCP server ${name} could not be registered (invalid or unsupported configuration).`);
    }
  }
  return issues;
}

export default function (pi: ExtensionAPI) {
  const issues = registerSharedServers(pi, join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "mcp", "mcp.json"));
  if (issues.length) {
    pi.on("session_start", (_event, ctx) => {
      ctx.ui.notify(issues.join("\n"), "warning");
    });
  }
}
