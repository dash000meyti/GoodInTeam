/**
 * Tiny in-process job scheduler (single node — see docs/architecture.md).
 *
 *   registerJob("task-reminders", 60_000, async () => { … });
 *
 * - Started once from src/instrumentation.ts (Node runtime, never during build).
 * - State lives on globalThis so dev hot-reloads don't double-schedule.
 * - Each run is isolated: errors are logged and the job keeps its schedule.
 * - A job never overlaps itself (a slow run skips the next tick).
 * - Timers are unref'd so they never keep the process alive.
 */

export type JobFn = () => void | Promise<void>;

interface JobState {
  name: string;
  everyMs: number;
  fn: JobFn;
  running: boolean;
  runs: number;
  failures: number;
  lastRunAt: number | null;
  lastDurationMs: number | null;
  lastError: string | null;
  timer: ReturnType<typeof setInterval> | null;
  kickoff: ReturnType<typeof setTimeout> | null;
}

interface SchedulerState {
  jobs: Map<string, JobState>;
  started: boolean;
}

const g = globalThis as unknown as { __goodTeamJobs?: SchedulerState };
const state: SchedulerState = (g.__goodTeamJobs ??= { jobs: new Map(), started: false });

/** Slow jobs get a first run shortly after boot instead of waiting a full interval. */
const KICKOFF_MS = 5_000;
const MIN_INTERVAL_MS = 1_000;

function schedule(job: JobState) {
  if (job.timer) clearInterval(job.timer);
  if (job.kickoff) clearTimeout(job.kickoff);
  job.timer = setInterval(() => void runJob(job.name), job.everyMs);
  job.timer.unref?.();
  job.kickoff = null;
  if (job.everyMs > KICKOFF_MS) {
    job.kickoff = setTimeout(() => void runJob(job.name), KICKOFF_MS);
    job.kickoff.unref?.();
  }
}

/**
 * Register (or replace) a periodic job. Safe to call before or after the
 * scheduler has started; re-registering the same name updates it in place.
 */
export function registerJob(name: string, everyMs: number, fn: JobFn) {
  const interval = Math.max(MIN_INTERVAL_MS, Math.floor(everyMs));
  const existing = state.jobs.get(name);
  if (existing) {
    existing.fn = fn;
    if (existing.everyMs !== interval) {
      existing.everyMs = interval;
      if (state.started) schedule(existing);
    }
    return;
  }
  const job: JobState = {
    name,
    everyMs: interval,
    fn,
    running: false,
    runs: 0,
    failures: 0,
    lastRunAt: null,
    lastDurationMs: null,
    lastError: null,
    timer: null,
    kickoff: null,
  };
  state.jobs.set(name, job);
  if (state.started) schedule(job);
}

/** Run a job now (skipped if it is already running). Resolves to true on success. */
export async function runJob(name: string): Promise<boolean> {
  const job = state.jobs.get(name);
  if (!job || job.running) return false;
  job.running = true;
  const started = Date.now();
  try {
    await job.fn();
    job.runs++;
    job.lastError = null;
    return true;
  } catch (err) {
    job.failures++;
    job.lastError = err instanceof Error ? err.message : String(err);
    console.error(`[jobs] ${name} failed`, err);
    return false;
  } finally {
    job.running = false;
    job.lastRunAt = started;
    job.lastDurationMs = Date.now() - started;
  }
}

/** Start every registered job. Returns false when already started. */
export function startScheduler() {
  if (state.started) return false;
  state.started = true;
  for (const job of state.jobs.values()) schedule(job);
  console.log(`[jobs] scheduler started: ${[...state.jobs.keys()].join(", ") || "no jobs"}`);
  return true;
}

export function stopScheduler() {
  for (const job of state.jobs.values()) {
    if (job.timer) clearInterval(job.timer);
    if (job.kickoff) clearTimeout(job.kickoff);
    job.timer = null;
    job.kickoff = null;
  }
  state.started = false;
}

/** Status of every job (for diagnostics). */
export function listJobs() {
  return [...state.jobs.values()].map((j) => ({
    name: j.name,
    everyMs: j.everyMs,
    running: j.running,
    runs: j.runs,
    failures: j.failures,
    lastRunAt: j.lastRunAt,
    lastDurationMs: j.lastDurationMs,
    lastError: j.lastError,
    started: state.started,
  }));
}

/** Test helper: forget every job. */
export function resetScheduler() {
  stopScheduler();
  state.jobs.clear();
}
