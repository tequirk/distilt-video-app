import type { Config } from "drizzle-kit";

export default {
  schema: "./data/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;
