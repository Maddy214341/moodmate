"use server";

import { writeFileSync } from "fs";
import path from "path";
import { OpenAI } from "openai";
import fs from "fs";
import { db } from "@/db";
import { threads } from "@/db/schema/thread";
import { messages } from "@/db/schema/message";
import { eq } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API });

async function generateTopicFromMessage(message: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Generate a concise topic (max 30 characters) based on the following message.",
        },
        { role: "user", content: message },
      ],
      max_tokens: 10,
      temperature: 0.5,
    });

    const name = response.choices[0].message.content?.trim() || "Untitled Chat";
    return name.length > 30 ? name.substring(0, 30) : name;
  } catch (error) {
    console.error("Error generating topic with OpenAI:", error);
    return "General Chat";
  }
}

export async function saveMessage(threadId: string, role: string, message: string) {
  try {
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      threadId,
      message,
      role,
    });

    let name = "";
    if (role === "user") {
      const threadMessages = await db.select().from(messages).where(eq(messages.threadId, threadId));
      if (threadMessages.length === 1) {
        name = await generateTopicFromMessage(message);
        await db.update(threads).set({ name }).where(eq(threads.id, threadId));
      }
    }

    return { success: true, message: "Message saved successfully", name };
  } catch (error) {
    console.error("Error saving message:", error);
    return { success: false, message: "Error saving message" };
  }
}

export async function getMessages(threadId: string) {
  try {
    const messagesList = await db.select().from(messages).where(eq(messages.threadId, threadId));
    return { success: true, messages: messagesList, message: "Messages retrieved successfully" };
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return { success: false, message: "Error retrieving messages" };
  }
}

export async function saveVoiceFile(formData: any) {
  try {
    const file = formData.get("file");
    if (!file) throw new Error("No file uploaded");

    const saveDir = path.join(process.cwd(), "/temp");
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir);
    const filePath = path.join(saveDir, "audio.wav");
    writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

    const transcription = await transcribeAudio(filePath);
    return { message: "File saved successfully", path: filePath, transcription };
  } catch (error: any) {
    console.error("Error saving voice file:", error);
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
    console.error("Error generating speech:", error);
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
    console.error("Error transcribing audio:", error);
    return null;
  }
}

export async function getResponse(msg: string) {
  try {
    const res = await fetch("http://localhost:8000/generate_response/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: msg }),
    });
    const response = await res.json();
    return response.response;
  } catch (error) {
    console.error("Error getting response:", error);
    return null;
  }
}

export const createThread = async (userid: string, firstMessage?: string) => {
  try {
    const threadUuid = crypto.randomUUID();
    const name = firstMessage ? await generateTopicFromMessage(firstMessage) : "General Chat";
    await db.insert(threads).values({ id: threadUuid, user_id: userid, name });
    return { success: true, threadUuid, name, message: "Thread generated successfully" };
  } catch (err) {
    console.error("Error creating thread:", err);
    return { success: false, message: "Something went wrong" };
  }
};

export const getThreads = async (userid: string) => {
  try {
    const userThreads = await db.select().from(threads).where(eq(threads.user_id, userid));
    return { success: true, threads: userThreads, message: "Threads retrieved successfully" };
  } catch (err) {
    console.error("Error retrieving threads:", err);
    return { success: false, message: "Something went wrong" };
  }
};