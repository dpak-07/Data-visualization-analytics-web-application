import React, { useEffect, useRef, useState } from "react";
import { FaUserCircle, FaRobot } from "react-icons/fa";

const TeachBackChat = () => {
  const [concept, setConcept] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState("ask");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const api = "http://localhost:3001";

  const addBotMessage = (text) =>
    setMessages((m) => [...m, { type: "bot", text, id: Date.now() }]);
  const addUserMessage = (text) =>
    setMessages((m) => [...m, { type: "user", text, id: Date.now() }]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput("");
    addUserMessage(userText);
    setLoading(true);

    try {
      if (step === "ask") {
        setConcept(userText);
        const res = await fetch(`${api}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept: userText }),
        });
        const data = await res.json();
        addBotMessage(data.response);
        setStep("explain");
      } else if (step === "explain") {
        const res = await fetch(`${api}/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept, userAnswer: userText }),
        });
        const data = await res.json();
        addBotMessage(data.response);
        setStep("feedback");
      }
    } catch (err) {
      addBotMessage("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setConcept("");
    setMessages([]);
    setInput("");
    setStep("ask");
  };

  const handleUnderstood = async () => {
    try {
      await fetch(`${api}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept }),
      });
      addBotMessage("Conversation saved. Great job!");
    } catch (err) {
      console.error("Failed to save conversation:", err);
    }
  };

  return (
    <div
      className="flex flex-col w-full h-screen font-poppi overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(240,247,255,1) 0%, rgba(225,239,255,1) 100%)",
      }}
    >
      <style>{`
        @keyframes bgMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-bg { background-size: 400% 400%; animation: bgMove 12s ease infinite; }
        @keyframes floatSlow { 0%{ transform: translateY(0);}50%{ transform: translateY(-12px);}100%{ transform: translateY(0);} }
        .float-slow { animation: floatSlow 7s ease-in-out infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 300ms ease both; }
        @keyframes dotPulse {
          0% { transform: scale(0.5); opacity: 0.4; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.5); opacity: 0.4; }
        }
        .dot { display:inline-block; margin:0 2px; width:6px; height:6px; background:rgba(74,85,104,0.9); border-radius:999px; animation: dotPulse 1s infinite; }
        .dot.delay1 { animation-delay: 0.12s; }
        .dot.delay2 { animation-delay: 0.24s; }
        .bubble-hover:hover { box-shadow: 0 8px 30px rgba(59,130,246,0.12); transform: translateY(-2px); transition: all 180ms ease; }
      `}</style>

      {/* Floating icons */}
      <div
        className="absolute inset-0 pointer-events-none opacity-12 animate-bg"
        style={{ zIndex: 0 }}
      >
        <div className="absolute top-20 left-6 text-4xl sm:text-6xl float-slow">🎓</div>
        <div className="absolute bottom-24 right-8 text-4xl sm:text-6xl float-slow">📚</div>
        <div className="absolute bottom-8 left-1/3 text-3xl sm:text-5xl float-slow">💡</div>
      </div>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-4 sm:mb-6 text-gray-700">
            <h2 className="text-lg sm:text-xl font-semibold">Teach-back Chat</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Explain the concept and get feedback.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {messages.length === 0 && (
              <div className="text-gray-400 italic text-sm sm:text-base">
                No messages yet — enter a concept to get started.
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  msg.type === "bot" ? "justify-start" : "justify-end"
                } fade-in`}
              >
                {msg.type === "bot" && (
                  <FaRobot className="text-xl sm:text-2xl text-blue-500" />
                )}
                <div
                  className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl max-w-[80%] sm:max-w-[75%] whitespace-pre-wrap text-sm sm:text-base ${
                    msg.type === "bot"
                      ? "bg-white text-gray-900 border border-gray-200"
                      : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                  } bubble-hover`}
                >
                  {msg.text}
                </div>
                {msg.type === "user" && (
                  <FaUserCircle className="text-xl sm:text-2xl text-gray-500" />
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start gap-2">
                <FaRobot className="text-xl sm:text-2xl text-blue-500" />
                <div className="bg-white/90 px-3 py-2 rounded-xl shadow inline-flex items-center">
                  <span className="dot" />
                  <span className="dot delay1" />
                  <span className="dot delay2" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input */}
      {step !== "feedback" && (
        <div className="bg-white border-t flex items-center px-4 sm:px-6 py-3 z-50">
          <div className="max-w-5xl w-full mx-auto flex items-center gap-2 sm:gap-3">
            <input
              type="text"
              placeholder={
                step === "ask"
                  ? "Enter a concept to learn..."
                  : "Explain it in your words..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 px-4 py-2 sm:px-5 sm:py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-700 shadow-sm text-sm sm:text-base"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-2 sm:px-5 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm sm:text-base"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Feedback buttons */}
      {step === "feedback" && (
        <div className="bg-white border-t px-4 sm:px-6 py-3 z-50">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                setStep("explain");
                addBotMessage("Try explaining it again:");
              }}
              className="px-4 py-2 sm:px-5 rounded-full bg-yellow-400 text-white hover:bg-yellow-500 transition text-sm sm:text-base"
            >
              Need More Practice
            </button>
            <button
              onClick={handleUnderstood}
              className="px-4 py-2 sm:px-5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition text-sm sm:text-base"
            >
              I Understood
            </button>
            <button
              onClick={handleStartOver}
              className="px-4 py-2 sm:px-5 rounded-full bg-gray-400 text-white hover:bg-gray-500 transition text-sm sm:text-base"
            >
              Start New Concept
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeachBackChat;
