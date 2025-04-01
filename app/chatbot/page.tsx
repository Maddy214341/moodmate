"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUp, ChevronDown, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { createThread, generateSpeech, getResponse, getThreads, saveMessage, saveVoiceFile } from "./action";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signOut } from "next-auth/react";

function Chat() {
  const searchParams = useSearchParams();
  const initialThreadId = searchParams.get("threadid");
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    setThreadId,
    isLoading,
    error,
    threadId,
  } = useChat(initialThreadId);
  const [userThreads, setUserThreads] = useState<{ id: string; name: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [readAloudEnabled, setReadAloudEnabled] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // Check authentication status and redirect if not authenticated
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (!session) {
        router.push("/login"); // Redirect to login if no session
      }
    };
    checkSession();
  }, [router]);
  const playAudio = (base64Audio: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audioRef.current = audio;
    audio.play().catch((error) => console.error("Error playing audio:", error));
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const speakText = async (text: string) => {
    if (readAloudEnabled) {
      const base64Audio = await generateSpeech(text);
      if (base64Audio) playAudio(base64Audio);
    }
  };

  useEffect(() => {
    const getUserThreads = async () => {
      const session = await getSession();
      const res = await getThreads(session?.user?.id!);
      if (res.success) setUserThreads(res.threads || []);
    };
    getUserThreads();
  }, []);

  const startNewChat = async () => {
    const session = await getSession();
    const newThread = await createThread(session?.user?.id!);
    if (newThread?.success && newThread.threadUuid) {
      setUserThreads((prev) => [...prev, { id: newThread.threadUuid, name: newThread.name }]);
      setThreadId(newThread.threadUuid);
      router.push(`/chatbot?threadid=${newThread.threadUuid}`);
    }
  };

  const createThreadIfNeeded = async (message: string) => {
    const session = await getSession();
    const newThread = await createThread(session?.user?.id!, message); // Pass the message
    if (newThread?.success && newThread.threadUuid) {
      setUserThreads((prev) => [...prev, { id: newThread.threadUuid, name: newThread.name }]);
      setThreadId(newThread.threadUuid); // Ensure threadId is set immediately
      return { threadId: newThread.threadUuid, name: newThread.name };
    }
    return null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as React.FormEvent<HTMLFormElement>, createThreadIfNeeded).then((result) => {
        console.log("Submit result:", result);
        if (result) {
          const newThreadId = threadId || result.threadId; // Use threadId from state or result
          if (result.name && newThreadId) {
            setUserThreads((prev) =>
              prev.map((thread) =>
                thread.id === newThreadId ? { ...thread, name: result.name } : thread
              )
            );
          }
          if (result.aiMessage) {
            console.log("AI Message to speak:", result.aiMessage.content);
            if (readAloudEnabled) {
              speakText(result.aiMessage.content); // Ensure this runs
            }
          }
          if (!initialThreadId && newThreadId) { // Only redirect if no thread was initially selected
            router.push(`/chatbot?threadid=${newThreadId}`);
          }
        }
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.wav");
        const result = await saveVoiceFile(formData);

        if (result.transcription) {
          let currentThreadId = threadId;
          if (!currentThreadId) {
            const newThread = await createThreadIfNeeded(result.transcription);
            if (newThread) {
              currentThreadId = newThread.threadId;
              setThreadId(currentThreadId);
              router.push(`/chatbot?threadid=${currentThreadId}`);
            }
          }

          if (currentThreadId) {
            const userMessage = { id: Date.now().toString(), role: "user", content: result.transcription };
            setMessages((prev) => [...prev, userMessage]);
            const saveResult = await saveMessage(currentThreadId, "user", userMessage.content);

            if (saveResult.name) {
              setUserThreads((prev) =>
                prev.map((thread) =>
                  thread.id === currentThreadId ? { ...thread, name: saveResult.name } : thread
                )
              );
            }

            const ragResponse = await getResponse(result.transcription);
            if (ragResponse) {
              const aiMessage = { id: Date.now().toString(), role: "assistant", content: ragResponse };
              setMessages((prev) => [...prev, aiMessage]);
              await saveMessage(currentThreadId, "assistant", aiMessage.content);
              if (readAloudEnabled) {
                speakText(aiMessage.content);
              }
            }
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleReadAloud = () => {
    const newValue = !readAloudEnabled;
    setReadAloudEnabled(newValue);
    if (!newValue) {
      stopAudio();
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" }); // Redirect to login page after sign-out
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="fixed left-0 top-0 w-64 h-full bg-gray-800 text-white">
        <div className="p-4">
          <Button onClick={startNewChat} className="w-full">
            Start New Chat
          </Button>
          <div className="h-[calc(100vh-200px)] overflow-scroll">
            {userThreads.map((thread) => (
              <div
                key={thread.id}
                className="p-2 hover:bg-gray-700 cursor-pointer"
                onClick={() => {
                  setThreadId(thread.id);
                  router.push(`/chatbot?threadid=${thread.id}`);
                }}
              >
                {thread.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col ml-64">
        <header className="fixed top-0 w-full border-b bg-background z-10">
          <div className="flex items-center h-12 px-4">
            <Button variant="ghost" className="gap-2 text-lg font-semibold">
              MoodMate
            </Button>
            <Button onClick={handleSignOut} className="ml-auto mr-[265px]">
              Sign Out
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden pt-12 pb-32">
          <ScrollArea className="h-full relative">
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
              {isLoading && <div>Loading messages...</div>}
              {error && <div className="text-red-500">{error}</div>}
              {messages.map((m) => (
                <div key={m.id} className="flex items-start gap-4">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>{m.role === "user" ? "U" : "M"}</AvatarFallback>
                    <AvatarImage src={m.role === "user" ? "/user-avatar.png" : "/ai-avatar.png"} />
                  </Avatar>
                  <div className="flex-1 max-w-[90%] space-y-2">
                    <div className="font-semibold">{m.role === "user" ? "You" : "MoodMate"}</div>
                    <div className="text-sm">{m.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </main>

        <footer className="fixed bottom-0 w-full bg-background">
          <div className="max-w-2xl mx-auto px-4 py-4 rounded-full">
            <form
              onSubmit={(e) =>
                handleSubmit(e, createThreadIfNeeded).then((result) => {
                  if (result) {
                    const newThreadId = threadId || result.threadId; // Use updated threadId
                    if (result.name && newThreadId) {
                      setUserThreads((prev) =>
                        prev.map((thread) =>
                          thread.id === newThreadId ? { ...thread, name: result.name } : thread
                        )
                      );
                    }
                    if (result.aiMessage) {
                      console.log("AI Message to speak (form):", result.aiMessage.content);
                      if (readAloudEnabled) {
                        speakText(result.aiMessage.content); // Ensure this runs
                      }
                    }
                    if (!initialThreadId && newThreadId) { // Redirect if no initial thread
                      router.push(`/chatbot?threadid=${newThreadId}`);
                    }
                  }
                })
              }
              className="relative flex border-2 rounded-full items-center"
            >
              <Textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={onKeyDown}
                placeholder="Message MoodMate..."
                className="h-fit outline-none pt-[20px] resize-none pr-[30px] border-none items-center"
                rows={1}
                disabled={isLoading}
              />
              <div className="flex w-fit items-center px-4 gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant={readAloudEnabled ? "default" : "outline"}
                  onClick={toggleReadAloud}
                >
                  {readAloudEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button type="submit" size="icon" className="h-8 w-8" disabled={!input.trim() || isLoading}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                >
                  {isRecording ? <Square className="h-4 w-4 text-red-500" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Chat;