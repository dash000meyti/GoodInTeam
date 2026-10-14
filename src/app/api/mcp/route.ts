import { actorFromRequest } from "@/server/api/auth";
import { callTool, toolJsonSchema, toolsFor } from "@/server/api/registry";
import { logActivity } from "@/server/activity";
import { AppError, httpStatus } from "@/server/errors";

/**
 * Model Context Protocol server (Streamable HTTP transport, stateless, JSON
 * responses). Connect from Claude Code:
 *
 *   claude mcp add --transport http good-team https://<site>/api/mcp \
 *     --header "Authorization: Bearer gt_…"
 */
const SUPPORTED = ["2025-11-25", "2025-06-18", "2025-03-26"];
const SERVER_INFO = { name: "good-team", title: "Good Team", version: "1.0.0" };
const INSTRUCTIONS =
  "Good Team is a private work OS: projects, clients, time tracking, tasks, calendar, finance, contracts, docs and website content. " +
  "Call `whoami` first. Money is in minor units unless a tool says 'major units'. Dates are ISO strings; day-only inputs use 'YYYY-MM-DD' in the app timezone. " +
  "Prefer read tools before write tools, and confirm destructive actions with the user.";

type JsonRpcId = string | number | null;
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

const rpcResult = (id: JsonRpcId, result: unknown) => Response.json({ jsonrpc: "2.0", id, result });
const rpcError = (id: JsonRpcId, code: number, message: string, status = 200) =>
  Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status });

export async function POST(req: Request) {
  let actor;
  try {
    actor = actorFromRequest(req);
  } catch (err) {
    const e = err instanceof AppError ? err : new AppError("unauthorized", "Unauthorized");
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: e.message } },
      { status: httpStatus[e.code], headers: { "WWW-Authenticate": 'Bearer realm="good-team"' } },
    );
  }

  let msg: JsonRpcRequest;
  try {
    msg = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error", 400);
  }
  if (Array.isArray(msg)) return rpcError(null, -32600, "Batching is not supported", 400);
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string")
    return rpcError(null, -32600, "Invalid request", 400);

  // Notifications (no id) are acknowledged with 202 and no body.
  if (msg.id === undefined || msg.method.startsWith("notifications/"))
    return new Response(null, { status: 202 });
  const id = msg.id;

  switch (msg.method) {
    case "initialize": {
      const requested = String(msg.params?.protocolVersion ?? "");
      return rpcResult(id, {
        protocolVersion: SUPPORTED.includes(requested) ? requested : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, {
        tools: toolsFor(actor).map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: toolJsonSchema(t),
          annotations: {
            title: t.title,
            readOnlyHint: t.scope === "read",
            destructiveHint: !!t.destructive,
            openWorldHint: false,
          },
        })),
      });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      try {
        const data = await callTool(actor, name, msg.params?.arguments ?? {});
        logActivity(actor, `mcp.${name}`, "mcp", null);
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(data ?? null, null, 2) }],
          isError: false,
        });
      } catch (err) {
        const e = err instanceof AppError ? err : new AppError("internal", "Internal error");
        if (!(err instanceof AppError)) console.error("[mcp] tool error", err);
        const details = e.fieldErrors ? `\n${JSON.stringify(e.fieldErrors)}` : "";
        return rpcResult(id, {
          content: [{ type: "text", text: `Error (${e.code}): ${e.message}${details}` }],
          isError: true,
        });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function GET() {
  return new Response("This MCP endpoint does not offer an SSE stream. Use POST.", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
