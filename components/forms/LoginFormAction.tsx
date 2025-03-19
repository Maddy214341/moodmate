"use server"

import { db } from "@/db"
import { users } from "@/db/schema/users"
import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { cookies } from 'next/headers'

export const LoginFormAction = async (email: string, password: string) => {
    try{
    const usersFromDb = await db.select().from(users).where(eq(users.email, email))
    if (!usersFromDb[0]) return {success: false, message: "User not found"}
    if(usersFromDb[0].password != password) return {success: false, message: "User not found"}
    const cookieStore = await cookies()
    await cookieStore.set("userId", usersFromDb[0].id!)
    return {success: true, message: "Login successful"}
}
catch {
    return {success: false, message: "Login failed"}
}
}