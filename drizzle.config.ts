import { defineConfig } from "drizzle-kit";

if (!process.env.MYSQL_URL) {
  throw new Error("MYSQL_URL non configurata");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.MYSQL_URL,
  },
});
