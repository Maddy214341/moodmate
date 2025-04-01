"use client";

import { useState, useEffect, useCallback } from "react";
import { saveMessage, getMessages } from "@/app/chatbot/action";

export function useChat(initialThreadId: string | null = null) {
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMessages(id);
      if (response.success) {
        setMessages(
          response.messages!.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.message,
          }))
        );
      } else {
        setError("Failed to load messages");
      }
    } catch (err) {
      setError("Error fetching messages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (threadId) {
      fetchMessages(threadId);
    } else {
      setMessages([]);
    }
  }, [threadId, fetchMessages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    createThreadIfNeeded?: (message: string) => Promise<{ threadId: string; name: string } | null>
  ) => {
    e.preventDefault();
    if (!input.trim()) return null;

    let currentThreadId = threadId;
    let newThreadName: string | undefined;

    if (!currentThreadId && createThreadIfNeeded) {
      const newThread = await createThreadIfNeeded(input.trim());
      if (!newThread) throw new Error("Failed to create thread");
      currentThreadId = newThread.threadId;
      newThreadName = newThread.name;
      setThreadId(currentThreadId);
    }

    if (!currentThreadId) return null;

    const newMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const saveResult = await saveMessage(currentThreadId, "user", newMessage.content);
      if (!saveResult.success) throw new Error("Failed to save message");

      const res = await fetch("http://localhost:8000/generate_response/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMessage.content }),
      });
      const response = await res.json();
      const aiMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.response,
      };

      await saveMessage(currentThreadId, "assistant", aiMessage.content);
      setMessages((prev) => [...prev, aiMessage]);
      return { aiMessage, name: saveResult.name || newThreadName, threadId: currentThreadId };
    } catch (err) {
      setError("Failed to send message or get response");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    setThreadId,
    isLoading,
    error,
    threadId,
  };
}