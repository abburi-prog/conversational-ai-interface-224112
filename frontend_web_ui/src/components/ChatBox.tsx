import React, { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReactTyped } from "react-typed";
import { sendMessage, streamMessage } from "../api/chatClient.ts";

/**
 * PUBLIC_INTERFACE
 * ChatBox: Blue Glow themed conversational UI with subtle animations.
 * - Uses Tailwind for layout and oceanic glow.
 * - Uses framer-motion for message transitions.
 * - Uses react-typed to simulate assistant typing indicator.
 */
export default function ChatBox() {
  // TypeScript message type for chat items
  type Msg = { from: "ai" | "user"; text: string };

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const disabled = loading || !input.trim();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const onSend = async () => {
    setError(null);
    const text = input.trim();
    if (!text) return;

    // Append user message
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      // Prepare an empty assistant message to progressively fill
      const aiIndex = messages.length + 1; // after appending user above
      setMessages((m) => [...m, { from: "ai", text: "" }]);

      let anyStreamed = false;
      try {
        for await (const chunk of streamMessage(text)) {
          anyStreamed = true;
          // Append chunk to the last AI message
          setMessages((m) => {
            const updated = [...m];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].from === "ai") {
              updated[lastIdx] = { ...updated[lastIdx], text: updated[lastIdx].text + chunk };
            }
            return updated;
          });
        }
      } catch {
        // swallow and fall back below
      }

      if (!anyStreamed) {
        // Fallback to non-streaming API for reliability
        const full = await sendMessage(text);
        setMessages((m) => {
          const updated = [...m];
          // Replace the last AI message (empty placeholder) with full text
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].from === "ai") {
            updated[lastIdx] = { ...updated[lastIdx], text: full };
          } else {
            updated.push({ from: "ai", text: full });
          }
          return updated;
        });
      }
    } catch (e: any) {
      const detail = e?.message || "Failed to get reply";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const headerSubtitle = useMemo(
    () => ["Ask about code", "Brainstorm ideas", "Summarize documents", "Plan next steps"],
    []
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <nav className="backdrop-blur-md bg-white/70 border-b border-slate-200/60">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-glow" />
            <span className="font-semibold text-slate-800 tracking-tight">Talk 2 AI</span>
          </div>
          <div className="text-xs text-slate-500">Ocean Professional</div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar (placeholder for conversations) */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700">Conversations</h3>
                <p className="text-xs text-slate-500 mt-2">Coming soon</p>
              </div>
            </div>
          </aside>

          {/* Chat Panel */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <header className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
              </div>
              <div className="relative">
                <h1 className="text-2xl font-semibold text-slate-800">Hello, how can I help?</h1>
                <p className="text-sm text-slate-500 mt-1">
                  <ReactTyped
                    strings={headerSubtitle}
                    typeSpeed={40}
                    backSpeed={20}
                    backDelay={1400}
                    loop
                  />
                </p>
              </div>
            </header>

            {/* Messages */}
            <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-4 shadow-sm min-h-[360px] flex flex-col">
              <div className="flex-1 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div
                      key={`${m.from}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className={`my-2 flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow ${
                          m.from === "user"
                            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-glow"
                            : "bg-white border border-slate-200/60 text-slate-800"
                        }`}
                      >
                        {m.text}
                        {/* Typing pulse while loading on the latest assistant message */}
                        {i === messages.length - 1 && m.from === "ai" && loading && (
                          <span className="ml-2 inline-flex items-center">
                            <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && messages.length === 0 && (
                  <div className="my-2 flex justify-start">
                    <div className="max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2 text-sm bg-white border border-slate-200/60 text-slate-800">
                      <span className="text-slate-500">
                        <ReactTyped
                          strings={["Thinking...", "Formulating a response..."]}
                          typeSpeed={35}
                          backSpeed={0}
                          backDelay={1200}
                          loop
                        />
                      </span>
                    </div>
                  </div>
                )}
                {error && <div className="my-2 text-xs text-ocean-error">{error}</div>}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="mt-3">
                <div className="relative">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSend();
                    }}
                    placeholder="Type your message..."
                    className="w-full rounded-xl border border-slate-300/70 bg-white px-4 py-3 pr-24 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-300/60 focus:border-blue-400 transition"
                  />
                  <button
                    onClick={onSend}
                    disabled={disabled}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                      disabled
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-glow"
                    }`}
                    aria-disabled={disabled}
                  >
                    Send
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-400">Powered by your backend</span>
                  <span className="text-[11px] text-slate-400">Tip: Press Enter to send</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Talk 2 AI
      </footer>
    </div>
  );
}
