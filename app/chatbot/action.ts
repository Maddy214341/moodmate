"use server";

import { writeFileSync, readFileSync } from "fs";
import path from "path";
import { OpenAI } from "openai";
import fs from "fs";
import { db } from "@/db";
import { threads } from "@/db/schema/thread";
import { getSession } from "next-auth/react";
import { eq } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API 
});

export async function saveVoiceFile(formData: any) {
  try {
    const file = formData.get("file");
    if (!file) throw new Error("No file uploaded");

    const saveDir = path.join(process.cwd(), "/temp");
    const filePath = path.join(saveDir, "audio.wav");
    writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

    const transcription = await transcribeAudio(filePath);
    return { message: "File saved successfully", path: filePath, transcription };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString("base64");
  } catch (error) {
    return null;
  }
}

async function transcribeAudio(filePath: string) {
  try {
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      response_format: "text",
    });
    return response;
  } catch (error) {
    return null;
  }
}

export async function getResponse(msg: string) {
  const res = await fetch("http://localhost:8000/generate_response/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: msg }),
  });
  const response = await res.json();
  return response.response;
}


export const createThread = async (userid: string) => {
  try {
    const threadUuid = crypto.randomUUID();
    const res = await db.insert(threads).values({
        id: crypto.randomUUID(),
        user_id: userid
    })
    return {
      success: true,
      threadUuid,
      message: "Thread generate successfully"
    }
  } catch(err) {
    return {
      success: false,
      message: "Something went wrong"
    }
  }
}

export const getThreads = async(userid: string) => {
  try {
    const userThreads = await db.select().from(threads).where(eq(threads.user_id, userid))
    return {
      success: true,
      threads: userThreads,
      message: "Threads retrieved successfully"
    }
  } catch (err) {
    return {
      success: false,
      message: "Something went wrong"
    }
  }
}

export const saveMessage = async(message: string) => {
  
}