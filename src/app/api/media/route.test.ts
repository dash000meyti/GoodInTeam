/**
 * POST /api/media: who may upload, from where, and how much. The file checks
 * themselves (magic bytes, size) belong to the media service and its tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/server/auth/actor";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

let actor: Actor | null = null;
vi.mock("@/server/auth/session", () => ({ getActor: async () => actor }));

const uploadMedia = vi.fn(
  async (_actor: Actor, file: File, _opts: { alt?: string | null; isPublic?: boolean }) => ({
    id: "m1",
    url: `/media/m1/${file.name}`,
    duplicate: false,
  }),
);
vi.mock("@/server/modules/media/service", () => ({ uploadMedia }));

const { POST } = await import("./route");
const { MAX_UPLOAD_BYTES } = await import("@/server/modules/media/storage");

const user = (role: Actor["user"]["role"]): Actor => ({
  via: "session",
  scopes: ["read", "write", "admin"],
  user: {
    id: "u1",
    email: "u@x.test",
    name: "U",
    role,
    clientId: null,
    locale: "en",
    avatarUrl: null,
    title: null,
  },
});

const HOST = "panel.example.test";
function upload(
  fields: Record<string, string | File>,
  headers: Record<string, string> = { origin: `https://${HOST}` },
  query = "",
) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  return POST(
    new Request(`https://${HOST}/api/media${query}`, {
      method: "POST",
      body,
      headers: { host: HOST, ...headers },
    }),
  );
}
const png = (name = "a.png", bytes = 16) => new File([new Uint8Array(bytes)], name);

beforeEach(() => {
  actor = user("owner");
  uploadMedia.mockClear();
});

describe("POST /api/media", () => {
  it("stores one file for an owner or admin and answers like an action", async () => {
    for (const role of ["owner", "admin"] as const) {
      actor = user(role);
      const res = await upload({ file: png(), alt: "  A picture " });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        ok: true,
        data: [{ id: "m1", url: "/media/m1/a.png", duplicate: false }],
      });
    }
    expect(uploadMedia).toHaveBeenCalledTimes(2);
    expect(uploadMedia.mock.calls[0]![2]).toEqual({ alt: "A picture", isPublic: true });
  });

  it("needs a session of an owner or admin", async () => {
    actor = null;
    expect((await upload({ file: png() })).status).toBe(401);
    for (const role of ["member", "client"] as const) {
      actor = user(role);
      expect((await upload({ file: png() })).status).toBe(403);
    }
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("accepts a request from its own origin only", async () => {
    const refused: Record<string, string>[] = [
      { origin: "https://evil.example" },
      { origin: "null" },
      { origin: "not a url" },
      {}, // no Origin header at all
      { origin: `https://${HOST}.evil.example` },
    ];
    for (const headers of refused) {
      const res = await upload({ file: png() }, headers);
      expect(res.status, JSON.stringify(headers)).toBe(403);
    }
    // Behind a reverse proxy the public host is the forwarded one.
    const proxied = await upload(
      { file: png() },
      { origin: "https://www.example.test", "x-forwarded-host": "www.example.test" },
    );
    expect(proxied.status).toBe(200);
    expect(uploadMedia).toHaveBeenCalledTimes(1);
  });

  it("takes exactly one file", async () => {
    expect((await upload({ alt: "no file" })).status).toBe(422);
    expect((await upload({ file: "just text" })).status).toBe(422);
    const two = new FormData();
    two.append("file", png("a.png"));
    two.append("file", png("b.png"));
    const res = await POST(
      new Request(`https://${HOST}/api/media`, {
        method: "POST",
        body: two,
        headers: { host: HOST, origin: `https://${HOST}` },
      }),
    );
    expect(res.status).toBe(422);
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("refuses a body over the limit before reading it all", async () => {
    // Declared too large: refused from the header alone.
    const declared = await POST(
      new Request(`https://${HOST}/api/media`, {
        method: "POST",
        body: "x",
        headers: {
          host: HOST,
          origin: `https://${HOST}`,
          "content-type": "multipart/form-data; boundary=x",
          "content-length": String(MAX_UPLOAD_BYTES + 100_000),
        },
      }),
    );
    expect(declared.status).toBe(422);
    expect(await declared.json()).toMatchObject({
      ok: false,
      error: { fieldErrors: { file: ["too_large"] } },
    });

    // No declared length: the stream is cut off once it passes the limit.
    let sent = 0;
    const chunk = new Uint8Array(1024 * 1024);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const streamed = await POST(
      new Request(`https://${HOST}/api/media`, {
        method: "POST",
        body: stream,
        headers: {
          host: HOST,
          origin: `https://${HOST}`,
          "content-type": "multipart/form-data; boundary=x",
        },
        duplex: "half",
      } as RequestInit),
    );
    expect(streamed.status).toBe(422);
    expect(sent).toBeLessThan(MAX_UPLOAD_BYTES + 4 * 1024 * 1024);
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("answers in the uploader's language", async () => {
    actor = null;
    const own = { origin: `https://${HOST}` };
    const fa = await (await upload({ file: png() }, own)).json();
    const en = await (await upload({ file: png() }, own, "?locale=en")).json();
    const unknown = await (await upload({ file: png() }, own, "?locale=xx")).json();
    expect(fa.error.code).toBe("unauthorized");
    expect(en.error.message).toBe("Please sign in again.");
    expect(fa.error.message).not.toBe(en.error.message);
    expect(unknown.error.message).toBe(fa.error.message);
  });
});
