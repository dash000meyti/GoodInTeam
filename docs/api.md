# API & MCP (for AI agents and scripts)

Every capability is defined **once** as a _tool_ (`src/server/modules/<module>/tools.ts`) and
exposed three ways:

| Surface                                                           | Endpoint                                                                                   | Use                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **MCP** (Model Context Protocol, Streamable HTTP, stateless JSON) | `POST /api/mcp`                                                                            | Claude Code / Claude Desktop / any MCP client |
| **REST**                                                          | `POST /api/v1/tools/{name}` with JSON body; `GET /api/v1/tools` lists tools + JSON Schemas | scripts, n8n, Zapier, cron                    |
| **OpenAPI 3.1**                                                   | `GET /api/v1/openapi.json` (public, no secrets)                                            | docs, codegen                                 |

## Authentication

Create a token in **Panel → Settings → API tokens** (scopes: `read`, `write`). Send it as
`Authorization: Bearer gt_…`. Tokens act as their user: the same role and permission checks
apply as in the UI.

## Connect Claude Code

```bash
claude mcp add --transport http good-team https://YOUR-DOMAIN/api/mcp \
  --header "Authorization: Bearer gt_xxx"
```

Then ask e.g. _"start a timer on the Acme project for 'HLS player'"_, _"what did I promise
Narenj this week?"_, _"draft an invoice from last month's billable hours"_.

## REST example

```bash
curl -s -X POST https://YOUR-DOMAIN/api/v1/tools/projects_list \
  -H "Authorization: Bearer gt_xxx" -H "content-type: application/json" \
  -d '{"status":"active"}'
# → { "data": [ … ] }
```

Errors: `{ "error": { "code": "validation" | "unauthorized" | "forbidden" | "not_found" | …, "message", "fieldErrors"? } }`
with matching HTTP status (422, 401, 403, 404…). An empty body counts as `{}`; a body that isn't
valid JSON is rejected with `400 { "error": { "code": "bad_request", "message": "Malformed JSON body" } }`
(the tool does not run).

## Rate limits

- 600 requests/min **per token** (counted only after the token is verified) → `429`.
- 30 failed authentications/min per client IP → `429` (valid tokens are never blocked by others'
  failures). The client IP is taken according to `TRUST_PROXY` (see `deployment.md`).

## MCP specifics

- Protocol versions `2025-11-25` (default) and `2025-06-18`. `2025-03-26` is not offered because
  it requires JSON-RPC batching, which this server doesn't implement (batches get `-32600`).
- Calling a tool that doesn't exist (or isn't available to your role — it's not in `tools/list`
  either) returns the JSON-RPC error `-32602` (invalid params). Errors _inside_ a tool (validation,
  forbidden, not found…) come back as a normal result with `isError: true`.
- Authentication failures: HTTP `401` (with `WWW-Authenticate`) or `429`, JSON-RPC code `-32001`.
  A server-side failure while authenticating is HTTP `500` / `-32603`, never a `401`.

## Conventions for tool authors

- Name: `<module>_<verb>` (`time_start_timer`, `finance_create_transaction`).
- `description` is written **for an LLM**: what it does, important units, when to use it.
- Reuse the module's zod schemas; money inputs in tools say whether they are **major** or
  **minor** units; day inputs are `YYYY-MM-DD` in the app timezone.
- `scope: "read"` for side-effect-free tools; `"write"` otherwise; `destructive: true` for deletes.
- Handlers call **services only**.
- Register the module's array in `src/server/api/registry.ts`.

## Tool catalog

The live list is returned by `GET /api/v1/tools` (or `tools/list` over MCP). Modules:
`whoami`, `projects_*`, `clients_*`, `time_*`, `tasks_*`, `calendar_*`, `finance_*`,
`contracts_*`, `docs_*`, `content_*`.
