import { integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";


export const threads = pgTable('threads', {
    id: uuid().primaryKey(),
    user_id: varchar()
})