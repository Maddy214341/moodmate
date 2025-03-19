import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool( {
    host: process.env.HOST!,
    port: 5432,
    database: process.env.DATABASE,
    user:"postgres",
    password:process.env.PASSWORD,
    ssl:false
});

export const db = drizzle({ client: pool });

