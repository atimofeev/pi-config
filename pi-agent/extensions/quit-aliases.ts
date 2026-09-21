import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const QUIT_ALIASES = new Set([":q", ";q"]);

export default function (pi: ExtensionAPI) {
  pi.on("input", (event, ctx) => {
    if (event.source !== "interactive" || !QUIT_ALIASES.has(event.text)) {
      return { action: "continue" };
    }

    ctx.shutdown();
    return { action: "handled" };
  });
}
