import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getDb = vi.fn();
vi.mock("./db/client", () => ({ getDb: () => getDb() }));
vi.mock("./modules/users/service", () => ({ hasOwner: () => true }));
vi.mock("./modules/auth/setup", () => ({ createFirstOwner: vi.fn() }));

const { bootstrap } = await import("./bootstrap");

beforeEach(() => {
  getDb.mockReset();
  vi.stubEnv("TRUST_PROXY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("bootstrap", () => {
  it("exits before opening the database when production config is invalid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_SECRET", "");
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit");
    }) as never);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(bootstrap()).rejects.toThrow("process.exit");
    expect(exit).toHaveBeenCalledWith(1);
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/APP_SECRET must be set/));
    expect(getDb).not.toHaveBeenCalled();
  });

  it("throws (without exiting) on invalid config in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TRUST_PROXY", "everything");
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

    await expect(bootstrap()).rejects.toThrow(/TRUST_PROXY/);
    expect(exit).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("opens the database when the config is valid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_SECRET", "x".repeat(44));
    await bootstrap();
    expect(getDb).toHaveBeenCalledOnce();
  });
});
