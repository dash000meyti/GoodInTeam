import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listJobs, registerJob, resetScheduler, runJob, startScheduler } from "./scheduler";

describe("job scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetScheduler();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    resetScheduler();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("runs jobs on their interval after start", async () => {
    const fn = vi.fn();
    registerJob("a", 60_000, fn);
    expect(startScheduler()).toBe(true);
    expect(startScheduler()).toBe(false); // guarded against double start
    await vi.advanceTimersByTimeAsync(5_000); // kickoff
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("isolates failures and keeps scheduling", async () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    registerJob("bad", 10_000, bad);
    registerJob("good", 10_000, good);
    startScheduler();
    await vi.advanceTimersByTimeAsync(25_000);
    expect(bad).toHaveBeenCalledTimes(3);
    expect(good).toHaveBeenCalledTimes(3);
    const status = listJobs().find((j) => j.name === "bad")!;
    expect(status.failures).toBe(3);
    expect(status.lastError).toBe("boom");
  });

  it("never overlaps a slow job with itself", async () => {
    let active = 0;
    let maxActive = 0;
    registerJob("slow", 1_000, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 3_500));
      active--;
    });
    startScheduler();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(maxActive).toBe(1);
  });

  it("schedules jobs registered after start and replaces by name", async () => {
    startScheduler();
    const first = vi.fn();
    const second = vi.fn();
    registerJob("late", 2_000, first);
    registerJob("late", 2_000, second);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(await runJob("late")).toBe(true);
    expect(await runJob("missing")).toBe(false);
  });
});
