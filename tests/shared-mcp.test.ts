import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import factory, { convertSharedServer, registerSharedServers } from "../pi-agent/extensions/shared-mcp.ts";

function mock(reject = "") {
  const servers = new Map<string, any>();
  const notifications: unknown[][] = [];
  const handlers: any[] = [];
  const pi = {
    registerMcpServer(name: string, config: any) {
      if (name === reject || typeof config.command === "number") throw new Error("SECRET raw native error");
      servers.set(name, config);
    },
    on(event: string, handler: any) { assert.equal(event, "session_start"); handlers.push(handler); },
  } as unknown as ExtensionAPI;
  return { pi, servers, notifications, start() { for (const handler of handlers) handler({}, { ui: { notify: (...args: unknown[]) => notifications.push(args) } }); } };
}
function temporary(run: (dir: string) => void) {
  const root = join(tmpdir(), "pi-coding-agent", "shared-mcp-tests");
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(root, "run-"));
  try { run(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("seven definitions use native fields and Pi exposure policy", () => {
  temporary((dir) => {
    const definitions = {
      github: { url: "https://example.test", auth: "bearer", bearerToken: "!gh auth token", directTools: true },
      "aws-docs": { command: "aws", directTools: true },
      nixos: { command: "nixos", exposure: "direct" },
      paperless: { url: "https://paperless.test", directTools: false },
      search: { command: "search", directTools: "search" },
      default: { command: "default" },
      explicit: { command: "explicit", directTools: true, exposure: "codemode" },
    };
    const path = join(dir, "mcp.json");
    writeFileSync(path, JSON.stringify({ mcpServers: definitions }));
    const m = mock();
    assert.deepEqual(registerSharedServers(m.pi, path), []);
    assert.equal(m.servers.size, 7);
    assert.deepEqual([...m.servers.values()].map((s) => s.exposure), ["direct", "deferred", "deferred", "deferred", "deferred", "codemode", "codemode"]);
    assert.equal(m.servers.get("github").headers.Authorization, `!token=$(gh auth token) && printf 'Bearer %s' "$token"`);
    assert.equal("directTools" in m.servers.get("github"), false);
  });
});

test("preserves native fields, translates adapter fields, and keeps credentials lazy", () => {
  const native = { type: "http", url: "https://example.test", args: ["arg"], env: { KEY: "${KEY}" }, cwd: "/tmp", headers: { X: "${HEADER}" }, oauth: { clientId: "id" }, timeout: 9, enabled: true, exposure: "direct", toolExposure: { tool: "deferred" }, description: "description" };
  assert.deepEqual(convertSharedServer("sample", { ...native, disabled: true, requestTimeoutMs: 1, adapterOnly: true }), native);
  assert.deepEqual(convertSharedServer("sample", { command: "x", disabled: true, requestTimeoutMs: 1500 }), { command: "x", enabled: false, timeout: 1.5, exposure: "codemode" });
  for (const bearerToken of ["${TOKEN}", "literal"]) {
    assert.deepEqual(convertSharedServer("sample", { url: "u", auth: "bearer", bearerToken, headers: { X: "v" } }).headers, { X: "v", Authorization: `Bearer ${bearerToken}` });
  }
  // Assert failure short-circuits printf without ever executing the credential command.
  assert.equal(convertSharedServer("sample", { bearerToken: "!false" }).headers!.Authorization, `!token=$(false) && printf 'Bearer %s' "$token"`);
  for (const requestTimeoutMs of [0, -1, Infinity, "10"]) assert.equal(convertSharedServer("x", { requestTimeoutMs }).timeout, undefined);
});

test("rejects ambiguous or unsupported authentication and invalid token types", () => {
  for (const value of [
    { auth: "basic" }, { auth: "bearer" }, { bearerToken: 1 }, { bearerToken: null }, { bearerToken: "" }, { bearerToken: "! " },
    { bearerToken: "secret", headers: { aUtHoRiZaTiOn: "secret" } }, { bearerToken: "secret", headers: [] },
  ]) assert.throws(() => convertSharedServer("x", value));
});

test("isolates entries and native validation failures with sanitized diagnostics", () => {
  temporary((dir) => {
    const path = join(dir, "mcp.json");
    writeFileSync(path, JSON.stringify({ mcpServers: { "SECRET\nname": {}, bad: null, rejected: { command: "ok" }, typed: { command: 42 }, good: { command: "ok" } } }));
    const m = mock("rejected");
    const issues = registerSharedServers(m.pi, path);
    assert.equal(issues.length, 4);
    assert.deepEqual([...m.servers.keys()], ["good"]);
    assert.doesNotMatch(issues.join(" "), /SECRET|raw native|42/);
  });
});

test("missing, unreadable, malformed, and invalid maps do not leak data", () => {
  temporary((dir) => {
    const path = join(dir, "mcp.json");
    for (const target of [path, dir]) assert.equal(registerSharedServers(mock().pi, target).length, 1);
    for (const content of ["SECRET malformed", '{"mcpServers":"SECRET"}', "null"]) {
      writeFileSync(path, content);
      const issues = registerSharedServers(mock().pi, path);
      assert.equal(issues.length, 1);
      assert.doesNotMatch(issues.join(), /SECRET|mcp.json/);
    }
  });
});

test("fresh factories reread shared config, remove old registrations, and notify once", () => {
  temporary((dir) => {
    const previous = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = dir;
    try {
      mkdirSync(join(dir, "mcp"));
      const path = join(dir, "mcp", "mcp.json");
      writeFileSync(path, JSON.stringify({ mcpServers: { old: { command: "old" }, invalid: { bearerToken: "SECRET", headers: { Authorization: "SECRET" } } } }));
      const first = mock(); factory(first.pi); first.start();
      assert.deepEqual([...first.servers.keys()], ["old"]);
      assert.equal(first.notifications.length, 1);
      assert.equal(first.notifications[0][1], "warning");
      assert.doesNotMatch(String(first.notifications[0][0]), /SECRET/);
      writeFileSync(path, JSON.stringify({ mcpServers: { fresh: { command: "new" } } }));
      const second = mock(); factory(second.pi); second.start();
      assert.deepEqual([...second.servers.keys()], ["fresh"]);
      assert.equal(second.notifications.length, 0);
    } finally {
      if (previous === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = previous;
    }
  });
});
