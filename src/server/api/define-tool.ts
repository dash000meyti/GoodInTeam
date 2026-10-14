import type { z } from "zod";
import type { UserRole } from "@/server/db/schema";
import type { Actor } from "@/server/auth/actor";

/**
 * One definition → three surfaces:
 *   - MCP tool          (POST /api/mcp, JSON-RPC `tools/call`)
 *   - REST endpoint     (POST /api/v1/tools/<name>)
 *   - OpenAPI operation (GET /api/v1/openapi.json)
 *
 * Handlers receive a validated input and the calling Actor (from an API
 * token) and MUST call the module's service functions (never the DB
 * directly) so authorization rules stay in one place.
 */
export interface ToolDef<S extends z.ZodType = z.ZodType> {
  /** snake_case, prefixed with the module: `projects_list`, `time_start_timer`. */
  name: string;
  title: string;
  /** What it does + when to use it. Written for an AI agent. */
  description: string;
  input: S;
  /** read = safe, no side effects. write = mutates data (needs a write-scoped token). */
  scope: "read" | "write";
  /** Restrict to roles (default: any authenticated user; services still enforce access). */
  roles?: UserRole[];
  /** Hint for clients: destructive operations (delete…). */
  destructive?: boolean;
  handler: (input: z.output<S>, actor: Actor) => unknown | Promise<unknown>;
}

export function defineTool<S extends z.ZodType>(def: ToolDef<S>): ToolDef {
  return def as unknown as ToolDef;
}
