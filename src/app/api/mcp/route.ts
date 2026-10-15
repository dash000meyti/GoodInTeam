import { actorFromRequest } from "@/server/api/auth";
import { callTool, findTool, toolJsonSchema, toolsFor } from "@/server/api/registry";
import { logActivity } from "@/server/activity";
import type { Actor } from "@/server/auth/actor";
import { AppError, httpStatus } from "@/server/errors";

/**
 * Model Context Protocol server (Streamable HTTP transport, stateless, JSON
 * responses). Connect from Claude Code:
 *
 *   claude mcp add --transport http good-team https://<site>/api/mcp \
 *     --header "Authorization: Bearer gt_…"
 */
// 2025-03-26 is deliberately absent: it requires JSON-RPC batching, which we don't implement.
const SUPPORTED = ["2025-11-25", "2025-06-18"];
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

/** JSON-RPC error codes used here (-32001 is our implementation-defined auth error). */
const RPC = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
  unauthorized: -32001,
} as const;

const rpcResult = (id: JsonRpcId, result: unknown) => Response.json({ jsonrpc: "2.0", id, result });
const rpcError = (
  id: JsonRpcId,
  code: number,
  message: string,
  status = 200,
  headers?: HeadersInit,
) => Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status, headers });

/**
 * Authentication failures keep their HTTP status (401 / 429). Anything else
 * that breaks while authenticating (e.g. the database) is a 500 — a server
 * fault must not tell the client its credentials are wrong.
 */
function authErrorResponse(err: unknown) {
  if (err instanceof AppError && (err.code === "unauthorized" || err.code === "rate_limited")) {
    const headers: HeadersInit =
      err.code === "unauthorized"
        ? { "WWW-Authenticate": 'Bearer realm="good-team"' }
        : { "Retry-After": "60" };
    return rpcError(null, RPC.unauthorized, err.message, httpStatus[err.code], headers);
  }
  console.error("[mcp] authentication error", err);
  return rpcError(null, RPC.internalError, "Internal error", 500);
}

/** A tool the actor may call — the same set `tools/list` returns. */
function visibleTool(actor: Actor, name: string) {
  const tool = findTool(name);
  return tool && (!tool.roles || tool.roles.includes(actor.user.role)) ? tool : undefined;
}

export async function POST(req: Request) {
  let actor: Actor;
  try {
    actor = actorFromRequest(req);
  } catch (err) {
    return authErrorResponse(err);
  }

  let msg: JsonRpcRequest;
  try {
    msg = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, RPC.parseError, "Parse error", 400);
  }
  if (Array.isArray(msg)) {
    return rpcError(null, RPC.invalidRequest, "Batching is not supported", 400);
  }
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string")
    return rpcError(null, RPC.invalidRequest, "Invalid request", 400);

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
      const name = msg.params?.name;
      if (typeof name !== "string" || !name) {
        return rpcError(id, RPC.invalidParams, "Invalid params: `name` is required");
      }
      // Per the MCP spec an unknown tool is a protocol error (-32602), not a tool result.
      if (!visibleTool(actor, name)) {
        return rpcError(id, RPC.invalidParams, `Unknown tool: ${name}`);
      }
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
      return rpcError(id, RPC.methodNotFound, `Method not found: ${msg.method}`);
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
