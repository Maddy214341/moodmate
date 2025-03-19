import { integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";


export const messages = pgTable('messages', {
    id: uuid().primaryKey(),
    threadId: varchar()
})