import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  // Only set credentials when DATABASE_URL is present so `drizzle-kit generate`
  // continues to work without a live connection. `migrate` and `push` will
  // error explicitly when DATABASE_URL is unset, which is the desired behavior.
  ...(url ? { dbCredentials: { url } } : {}),
});
