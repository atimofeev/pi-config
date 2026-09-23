import { Type } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DIRECT_WORK_TOOL = "authorize_direct_work";
const DELEGATION_TOOLS = new Set(["Agent", "SubagentWorkflow"]);
const EXISTING_AGENT_TOOLS = new Set(["get_subagent_result", "steer_subagent"]);
const UNGUARDED_TOOLS = new Set([
  DIRECT_WORK_TOOL,
  "ask_user_question",
  "memory_search",
  "session_search",
  "todo",
]);

const reminder = `Delegation gate is enforced for this user turn.
Before calling execution tools, do exactly one of these in a separate tool round:
1. Call Agent or SubagentWorkflow.
2. Call authorize_direct_work and truthfully confirm every direct-work criterion.
Unauthorized execution tool calls are blocked.`;

type Authorization = "none" | "delegated" | "direct";

export default function (pi: ExtensionAPI) {
  let authorization: Authorization = "none";

  const delegationAvailable = () =>
    pi.getActiveTools().some((name) => DELEGATION_TOOLS.has(name));

  pi.registerTool({
    name: DIRECT_WORK_TOOL,
    label: "Authorize Direct Work",
    description:
      "Authorize direct tools only for trivial work when every direct-work criterion is true. If any criterion is false, delegate instead.",
    parameters: Type.Object({
      singleFile: Type.Boolean({ description: "Entire user request affects at most one file." }),
      exactTarget: Type.Boolean({ description: "Entire request's target and operation are already known." }),
      unambiguous: Type.Boolean({ description: "Entire request needs no clarification or design decision." }),
      reversibleAndSafe: Type.Boolean({
        description: "Entire request is reversible and not security-sensitive or destructive.",
      }),
      narrowImpact: Type.Boolean({ description: "Entire request has no broad or cross-system impact." }),
      cheapVerification: Type.Boolean({ description: "Entire request can be verified quickly and locally." }),
      reason: Type.String({ description: "Short concrete reason the entire request qualifies for direct work." }),
    }),
    async execute(_toolCallId, params) {
      if (!delegationAvailable()) {
        return {
          content: [{ type: "text", text: "Delegation gate inactive: Agent tool is unavailable in this session." }],
          details: { authorized: false, inactive: true },
        };
      }

      const criteria = {
        singleFile: params.singleFile,
        exactTarget: params.exactTarget,
        unambiguous: params.unambiguous,
        reversibleAndSafe: params.reversibleAndSafe,
        narrowImpact: params.narrowImpact,
        cheapVerification: params.cheapVerification,
      };
      const failed = Object.entries(criteria)
        .filter(([, passed]) => !passed)
        .map(([name]) => name);

      if (failed.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `Direct work denied. Delegate with Agent because these criteria failed: ${failed.join(", ")}.`,
            },
          ],
          details: { authorized: false, failed, reason: params.reason },
        };
      }

      authorization = "direct";
      return {
        content: [{ type: "text", text: `Direct work authorized for this user turn: ${params.reason}` }],
        details: { authorized: true, reason: params.reason },
      };
    },
  });

  pi.on("input", (event) => {
    if (event.source === "interactive") {
      authorization = "none";
    }
    return { action: "continue" };
  });

  pi.on("before_agent_start", (event) => {
    if (!delegationAvailable()) return undefined;

    event.systemPromptOptions.sections.delegation_reminder = reminder;
    return {
      message: {
        customType: "delegation-reminder",
        content: reminder,
        display: false,
      },
    };
  });

  pi.on("tool_call", (event) => {
    if (!delegationAvailable()) return undefined;

    if (DELEGATION_TOOLS.has(event.toolName) || EXISTING_AGENT_TOOLS.has(event.toolName)) {
      authorization = "delegated";
      return undefined;
    }

    if (UNGUARDED_TOOLS.has(event.toolName) || authorization !== "none") {
      return undefined;
    }

    return {
      block: true,
      reason:
        `Delegation gate blocked ${event.toolName}. ` +
        `Call Agent/SubagentWorkflow, or call ${DIRECT_WORK_TOOL} with every criterion true, then retry.`,
    };
  });

  pi.on("agent_end", () => {
    authorization = "none";
  });
}
