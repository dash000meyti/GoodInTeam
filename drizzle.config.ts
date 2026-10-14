import { defineConfig } from "drizzle-kit";
import path from "node:path";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: path.join(process.env.DATA_DIR ?? "./data", "app.db"),
  },
  strict: true,
  verbose: true,
});
