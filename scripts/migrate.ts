/** Apply pending migrations: `pnpm db:migrate` (also runs automatically at server boot). */
import { getDb } from "@/server/db/client";

getDb();
console.log("✓ migrations applied");
