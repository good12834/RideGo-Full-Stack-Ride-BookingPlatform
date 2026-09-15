import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Zap,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Loader2,
  Car,
  MapPin,
  Clock,
  CheckCircle2,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";

const QUICK_PROMPTS = [
  { label: "✈️ Book to Airport", text: "Take me from Downtown Central Station to Airport Terminal 3 in Comfort" },
  { label: "🏷️ Active Promos", text: "What promo codes are available right now?" },
  { label: "🛡️ Safety Features", text: "How does RideGo AI safety and PIN protection work?" },
  { label: "💳 Stripe Protection", text: "Explain how payments are secured via Stripe" },
];

export default function AiCopilot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: `👋 Hi${user ? ` ${user.name.split(" ")[0]}` : ""}! I am **RideGo AI Copilot**.\n\nI can help you plan AI-optimized rides, predict traffic & dynamic fares, explain our **Stripe bank-grade payment protection**, and book rides instantly!`,
      suggestions: ["Book ride to Airport", "How does Stripe protect me?", "Show active promos"],
    },
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function handleSend(customText) {
    const textToSend = typeof customText === "string" ? customText : input;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/ai/copilot", {
        message: textToSend.trim(),
        history: messages.slice(-6).map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
      });

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.reply,
        action: data.action,
        suggestions: data.suggestions,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "⚠️ Sorry, I encountered a temporary connection issue. Please try again or check your booking directly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleActionClick(action) {
    if (action.type === "RIDE_QUOTE" && action.pickup && action.destination) {
      const params = new URLSearchParams({
        pickup: JSON.stringify(action.pickup),
        destination: JSON.stringify(action.destination),
        type: action.rideType || "economy",
      });
      if (action.promoCode) params.set("promo", action.promoCode);
      setIsOpen(false);
      navigate(`/passenger/book?${params.toString()}`);
      toast.success("AI route loaded into booking form!");
    }
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-600 via-primary-500 to-amber-400 text-white shadow-glow"
          aria-label="Open AI Copilot"
        >
          <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white ring-2 ring-white">
            AI
          </div>
          <Bot className="h-7 w-7 transition-transform hover:rotate-12" />
        </motion.button>
      </div>

      {/* Copilot Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-4 z-50 flex h-[580px] w-[92vw] max-w-[420px] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-2xl sm:right-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-night-100 bg-gradient-to-r from-night-950 via-night-900 to-night-950 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-amber-400 text-white shadow-glow">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
                    RideGo AI Copilot
                    <span className="rounded-md bg-primary-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary-300">
                      v2.0
                    </span>
                  </h3>
                  <p className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Neural Engine Active
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-1.5 text-night-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm scrollbar-thin">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-primary-500 text-white rounded-br-none shadow-sm"
                        : "bg-night-50 text-night-800 border border-night-100 rounded-bl-none shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line text-[13px]">{msg.text}</p>

                    {msg.engine === "gemini" && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50/70 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                        ✨ Powered by Gemini Neural Engine{msg.aiModel ? ` • ${msg.aiModel}` : ""}
                      </span>
                    )}

                    {/* Interactive Action Card if AI calculated a route */}
                    {msg.action && msg.action.type === "RIDE_QUOTE" && (
                      <div className="mt-3 rounded-xl border border-primary-200 bg-white p-3 text-night-900 shadow-sm">
                        <div className="flex items-center justify-between border-b border-night-100 pb-2 text-xs font-bold text-primary-600">
                          <span className="flex items-center gap-1">
                            <Car className="h-3.5 w-3.5" /> {msg.action.rideType?.toUpperCase()} RIDE
                          </span>
                          <span className="text-base font-extrabold text-night-900">
                            ${msg.action.fare.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-night-600">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">{msg.action.pickup.address}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <span className="truncate">{msg.action.destination.address}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleActionClick(msg.action)}
                          className="btn-primary mt-3 w-full !py-2 !text-xs"
                        >
                          Book This Ride <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Suggestions pills */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(s)}
                          className="rounded-full border border-primary-200 bg-primary-50/60 px-2.5 py-1 text-[11px] font-semibold text-primary-700 hover:bg-primary-100 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-night-400">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-night-100">
                    <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                  </div>
                  <span>RideGo AI is analyzing routes & fares...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick action bar */}
            <div className="border-t border-night-100 bg-night-50/80 px-3 py-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {QUICK_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.text)}
                    className="shrink-0 rounded-lg border border-night-200 bg-white px-2.5 py-1 text-[11px] font-medium text-night-700 hover:border-primary-300 hover:bg-primary-50 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 border-t border-night-100 bg-white p-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AI anything or say 'Book ride to...'"
                className="input-base !py-2 !text-xs"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="btn-primary !p-2.5 rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
