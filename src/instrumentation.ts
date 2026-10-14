/**
 * Runs once when the Next.js server boots (not during `next build`):
 * applies DB migrations and bootstraps the owner account from env vars.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { bootstrap } = await import("./server/bootstrap");
  await bootstrap();
}
