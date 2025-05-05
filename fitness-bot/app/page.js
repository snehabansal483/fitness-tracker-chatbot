"use client";
import { useState, useRef, useEffect } from "react";
import Textarea from "react-textarea-autosize";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [consent, setConsent] = useState(false);
  const messageEndRef = useRef(null);
  const [fOldMes, setFOldMes] = useState(true);
  const oldChats = async () => {
    try {
      if (fOldMes) {
        setFOldMes(false);
        const response = await fetch("/api");
        const data = await response.json();
        for (let i = 0; i < data.length; i++) {
          const interaction = data[i];
          const userMessage = {
            id: interaction.id,
            role: "user",
            content: interaction.prompt,
          };
          setMessages((prevMessages) => [...prevMessages, userMessage]);
          const botMessage = {
            id: interaction.id + "0",
            role: "bot",
            content: interaction.response,
          };
          setMessages((prevMessages) => [...prevMessages, botMessage]);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  oldChats();

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const customHandleSubmit = async (e) => {
    e.preventDefault();
    const userMessage = { id: Date.now(), role: "user", content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
  
    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: input,
          consent: consent,
        }),
      });
  
      if (!response.ok) {
        // Check if response is not ok and handle it
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Something went wrong');
      }
  
      const prediction = await response.json();
      const botMessage = {
        id: Date.now(),
        role: "bot",
        content: Array.isArray(prediction.output)
          ? prediction.output.join(" ")
          : prediction.output,
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error("Error:", error); // Log the full error for debugging
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: Date.now(), role: "bot", content: error.message },
      ]);
    }
  };
  

  return (
    <div className="min-h-screen bg-neutral-800">
      {messages.length !== 0 ? (
        <div className="pb-32 pt-5 space-y-5 w-[75%] mx-auto relative">
          {messages.map((message) => (
            <div key={message.id} className="w-full">
              {message.role === "user" ? (
                <div className="flex gap-x-2">
                  <div className="bg-gray-500 h-12 w-12 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-full h-full text-white p-1"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="rounded-lg p-3 w-full border-gray-500 border-2 text-sm text-white">
                    {message.content}
                  </p>
                </div>
              ) : (
                <div className="flex gap-x-2">
                  <div className="bg-teal-500 h-12 w-12 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-full h-full text-white p-1"
                    >
                      <path d="M16.5 7.5h-9v9h9v-9Z" />
                      <path
                        fillRule="evenodd"
                        d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75ZM6 6.75A.75.75 0 0 1 6.75 6h10.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V6.75Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="rounded-lg p-3 w-full border-teal-500 border-2 text-sm text-white">
                    {message.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full flex justify-center pt-32">
          <h1 className="font-bold text-3xl">
            Please use the input field below
          </h1>
        </div>
      )}

      <div ref={messageEndRef}></div>
      <form
        onSubmit={customHandleSubmit}
        className="p-2 fixed bottom-0 left-0 w-[75%] mx-auto right-0 bg-neutral-800"
      >
        <div className="relative flex items-center">
          <Textarea
            tabIndex={0}
            required
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            placeholder="Send message..."
            spellCheck={false}
            className="w-full focus:outline-none shadow-teal-700 shadow-xl placeholder:text-gray-200 text-sm text-white p-5 pr-16 rounded-xl bg-neutral-600"
          />
          <button
            type="submit"
            className="absolute bg-teal-500 p-2 rounded-lg right-0 mr-5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6"
            >
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
        <div className="pt-5">
          <label className="text-white">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mr-2"
            />
            I consent to storing my chat interactions
          </label>
        </div>
      </form>
    </div>
  );
}
