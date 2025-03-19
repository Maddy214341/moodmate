import { useState } from "react";

export function useChat() {
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [input, setInput] = useState("");

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add the user's message
    const newMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);

    // Clear input field after sending the message
    setInput("");

    // Simulate an AI response (could be replaced with a real API call)
    setTimeout(async () => {
      try {
      const res = await fetch("http://localhost:8000/generate_response/", {
        method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: newMessage.content }),
      })
      const response = await res.json()
      console.log(response)
      const aiResponse = {
        id: Date.now().toString(),
        role: "ai",
        content: response.response,
      };
      setMessages((prevMessages) => [...prevMessages, aiResponse])
    } catch(err) {
      console.log(err)
    }
    }, 1000); // Simulated delay for AI response
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages, // <-- Added setMessages to the return
  };
}
