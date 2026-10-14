import "server-only";
import { runEventReminders, runLongRunningCheck, runTaskReminders } from "./reminders";
import { registerJob, startScheduler } from "./scheduler";

export { listJobs, registerJob, runJob } from "./scheduler";

const MINUTE = 60_000;

/**
 * Register the built-in jobs and start the scheduler. Called once from
 * src/instrumentation.ts. Other modules add jobs by calling `registerJob`
 * here (or anywhere at runtime — late registrations are scheduled at once).
 * Set JOBS_DISABLED=1 to turn background jobs off (e.g. a read-only replica).
 */
export function startJobs() {
  if (process.env.JOBS_DISABLED === "1") {
    console.log("[jobs] disabled via JOBS_DISABLED=1");
    return;
  }
  registerJob("task-reminders", MINUTE, () => {
    runTaskReminders();
  });
  registerJob("event-reminders", MINUTE, () => {
    runEventReminders();
  });
  registerJob("long-running-timers", 15 * MINUTE, () => {
    runLongRunningCheck();
  });
  startScheduler();
}
