import { toolJsonSchema, tools } from "@/server/api/registry";

/** GET /api/v1/openapi.json — machine-readable API description (no secrets). */
export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const paths: Record<string, unknown> = {};
  for (const t of tools) {
    paths[`/api/v1/tools/${t.name}`] = {
      post: {
        operationId: t.name,
        summary: t.title,
        description: t.description,
        tags: [t.name.split("_")[0]],
        "x-scope": t.scope,
        security: [{ bearer: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: toolJsonSchema(t) } },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: { type: "object", properties: { data: {} } } },
            },
          },
          "401": { description: "Missing/invalid token" },
          "403": { description: "Forbidden (role or read-only token)" },
          "422": { description: "Validation error" },
        },
      },
    };
  }
  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Good Team API",
      version: "1.0.0",
      description:
        "Every operation is also available as an MCP tool at /api/mcp (Streamable HTTP). Authenticate with `Authorization: Bearer gt_…` (create tokens in Panel → Settings → API tokens).",
    },
    servers: [{ url: siteUrl }],
    components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } } },
    paths,
  });
}
