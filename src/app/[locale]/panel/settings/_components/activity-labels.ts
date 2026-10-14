import type { Messages } from "@/i18n/messages";
import { format } from "@/i18n/format-message";

/**
 * Human labels for audit-log codes. Unknown codes fall back to the raw code,
 * so new modules show up readable without touching this file (add an
 * `act_<action with _>` key to settings messages to give them a nice name).
 */
export function actionLabel(action: string, t: Messages["settings"]) {
  if (action.startsWith("mcp.")) return format(t.act_mcp, { tool: action.slice(4) });
  if (action.startsWith("api.")) return format(t.act_api, { tool: action.slice(4) });
  const key = `act_${action.replace(/[.-]/g, "_")}`;
  return (t as Record<string, string>)[key] ?? action;
}

export function entityTypeLabel(type: string, t: Messages["settings"]) {
  return (t as Record<string, string>)[`type_${type}`] ?? type;
}
