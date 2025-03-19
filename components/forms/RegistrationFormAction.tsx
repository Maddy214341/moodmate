"use server"

import { db } from "@/db"
import { users } from "@/db/schema/users"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"

export const RegistrationAction = async (username: string, email: string, password: string,) => {
    try{
    const usernameExists = await db.select().from(users).where(eq(users.username, username))
    if(usernameExists.length > 0) return {success: false, message: "Username exists"}
    const emailExists = await db.select().from(users).where(eq(users.email, email))
    if(emailExists.length > 0) return {success: false, message: "Email exists"}
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
    const res = await db.insert(users).values({
        id: randomUUID(),
        username,
        email,
        password: hashedPassword
    })
    return {success: true, message: "Registration successful"}
}
catch(err) {
    console.log("ERROR", err)
    return {success: false, message: "Registration failed", err}
}
}