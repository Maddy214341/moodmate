"use client"

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUp, ChevronDown, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { createThread, generateSpeech, getResponse, getThreads, saveVoiceFile } from "./action";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Function to convert base64 to uint8 array
function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function Chat() {
  const { messages = [], input, handleInputChange, handleSubmit, setMessages } = useChat();
  const [isTyping, setIsTyping] = useState(false);
  const [userThreads, setUserThreads] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [lastSpokenMessageId, setLastSpokenMessageId] = useState<string | null>(null);
  const [readAloudEnabled, setReadAloudEnabled] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Function to reset chat when starting a new conversation
  const startNewChat = async () => {
    const session = await getSession();
    const newThread = await createThread(session?.user?.id!);
    console.log(newThread.threadUuid)
    if (newThread?.threadUuid) {
      setUserThreads(oldThreads => [...oldThreads, newThread.threadUuid]);
    }
    console.log(userThreads)
  };
  
  
  useEffect(() => { 
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && 
        lastMessage.role === "ai" && 
        lastMessage.id !== lastSpokenMessageId &&
        readAloudEnabled) {
      const generateAndPlay = async () => {
        const audioData = await generateSpeech(lastMessage.content);
        if (audioData) {
          try {
            const bytes = base64ToUint8Array(audioData);
            const blob = new Blob([bytes], { type: "audio/mpeg" });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
            setLastSpokenMessageId(lastMessage.id);
          } catch (error) {
            console.error("Error playing audio:", error);
          }
        }
      };
      generateAndPlay()
    }
  }, [messages, lastSpokenMessageId, readAloudEnabled]);
  useEffect(()=>{
    const getUserThreads = async () => {
      const session = await getSession()
      const userThreads = await getThreads(session?.user?.id!)
      return userThreads
    }
    getUserThreads().then(res=>setUserThreads(res.threads?.map(thread=>thread.id)!))
  }, [])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      setIsTyping(true);
      await handleSubmit(e);
      setIsTyping(false);
    } catch {
      setIsTyping(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };
  const router = useRouter()
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.wav");
        const result = await saveVoiceFile(formData);

        if (result.transcription) {
          const userMessage = {
            id: Date.now().toString(),
            role: "user",
            content: result.transcription,
          };

          setMessages((prevMessages) => [...prevMessages, userMessage]);
          
          setIsTyping(true);
          const aiResponse = await getResponse(result.transcription);
          setIsTyping(false);

          if (aiResponse) {
            const aiMessage = {
              id: Date.now().toString(),
              role: "assistant",
              content: aiResponse,
            };
            setMessages((prevMessages) => [...prevMessages, aiMessage]);

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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-full bg-gray-800 text-white">
        <div className="p-4">
          <Button onClick={startNewChat} className="w-full">
            Start New Chat
          </Button>
          <div className="h-[calc[100vh - 200px]] overflow-scroll">
  `         {
              userThreads.map((thread, index)=>(
                <div key={index} className="p-2 hover:bg-gray-700" onClick={()=>router.push(`/chatbot?threadid=${thread}`)}>
                  {thread}
                </div>
              ))
            }`
        </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col ml-64">
        <header className="fixed top-0 w-full border-b bg-background z-10">
          <div className="flex items-center h-12 px-4">
            <Button variant="ghost" className="gap-2 text-lg font-semibold">
              Virtual Mental Health
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden pt-12 pb-32">
          <ScrollArea className="h-full relative">
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
              {messages.map((m) => (
                <div key={m.id} className="flex items-start gap-4">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>{m.role === "user" ? "U" : "A"}</AvatarFallback>
                    <AvatarImage src={m.role === "user" ? "/user-avatar.png" : "/ai-avatar.png"} />
                  </Avatar>
                  <div className="flex-1 max-w-[90%] space-y-2">
                    <div className="font-semibold">{m.role === "user" ? "You" : "Virtual Mental Health"}</div>
                    <div className="text-sm">{m.content}</div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start gap-4">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>A</AvatarFallback>
                    <AvatarImage src="/ai-avatar.png" />
                  </Avatar>
                  <div className="space-y-2">
                    <div className="font-semibold">Virtual Mental Health</div>
                    <div className="text-sm">Thinking...</div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>

        <footer className="fixed bottom-0 w-full bg-background">
          <div className="max-w-2xl mx-auto px-4 py-4 rounded-full">
            <form onSubmit={onSubmit} className="relative flex border-2 rounded-full items-center">
              <Textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={onKeyDown}
                placeholder="Message Virtual Mental Health..."
                className="h-fit outline-none pt-[20px] resize-none pr-[30px] border-none items-center"
                rows={1}
              />
              <div className="flex w-fit items-center px-4 gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant={readAloudEnabled ? "default" : "outline"}
                  onClick={() => setReadAloudEnabled(!readAloudEnabled)}
                >
                  {readAloudEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!input.trim() || isTyping}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8"
                  onClick={isRecording ? stopRecording : startRecording}
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
