import { integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";


export const users = pgTable('users', {
    id: uuid().primaryKey(),
    username: varchar(),
    email: varchar(),
    password: varchar()
  })
  
  