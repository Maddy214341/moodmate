import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  dialect: "postgresql",
  schema: "./db/schema/*",
  dbCredentials: {
    host: process.env.HOST!,
    port: 5432,
    database: process.env.DATABASE!,
    user:"postgres",
    password:process.env.PASSWORD,
    ssl:false
  },
});
