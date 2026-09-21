import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const reminder =
  "Delegation gate: call Agent before direct tools unless every direct-work criterion passes.";

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", (event) => {
    event.systemPromptOptions.sections.delegation_reminder = reminder;

    return {
      message: {
        customType: "delegation-reminder",
        content: reminder,
        display: false,
      },
    };
  });
}
