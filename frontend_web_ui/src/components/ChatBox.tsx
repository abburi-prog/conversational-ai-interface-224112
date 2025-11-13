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
 * - Adds optional Voice: Speech-to-Text (webkitSpeechRecognition) and Text-to-Speech (speechSynthesis).
 */
export default function ChatBox() {
  // TypeScript message type for chat items
  type Msg = { from: "ai" | "user"; text: string };

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Feature flags (frontend env). Defaults to enabled if undefined.
  const voiceEnabled =
    (process.env.REACT_APP_VOICE_ENABLED ?? "true").toLowerCase() === "true";
  const ttsAutoSpeak =
    (process.env.REACT_APP_TTS_AUTO_SPEAK ?? "true").toLowerCase() === "true";

  // STT (Speech-to-Text) state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [sttSupported, setSttSupported] = useState<boolean>(false);
  const [sttInterim, setSttInterim] = useState<string>("");

  // TTS (Text-to-Speech) state
  const [ttsSupported, setTtsSupported] = useState<boolean>(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [speaking, setSpeaking] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);

  // refs for APIs
  const recognitionRef = useRef<any>(null);
  const abortSpeakRef = useRef<() => void>(() => {});

  // scroll to bottom when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Initialize STT support
  useEffect(() => {
    if (!voiceEnabled) return;
    const SpeechRecognition: any =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      setSttSupported(true);
      const recognition = new SpeechRecognition();
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.continuous = true;

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interim += transcript;
          }
        }
        if (interim) setSttInterim(interim);
        if (finalText) {
          setInput((prev) => {
            const combined = (prev + " " + finalText).trim();
            return combined;
          });
          setSttInterim("");
        }
      };

      recognition.onerror = (e: any) => {
        setError(e?.error ? `Speech recognition error: ${e.error}` : "Speech recognition error");
        setIsRecording(false);
      };
      recognition.onend = () => {
        setIsRecording(false);
        setSttInterim("");
      };

      recognitionRef.current = recognition;
    } else {
      setSttSupported(false);
    }
  }, [voiceEnabled]);

  // Initialize TTS support and voices
  useEffect(() => {
    if (!voiceEnabled) return;
    if ("speechSynthesis" in window) {
      setTtsSupported(true);
      const updateVoices = () => {
        const list = window.speechSynthesis.getVoices();
        setVoices(list);
        if (list.length > 0 && !selectedVoice) {
          // pick a default English voice if possible
          const en = list.find((v) => v.lang.toLowerCase().startsWith("en"));
          setSelectedVoice(en?.name || list[0].name);
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    } else {
      setTtsSupported(false);
    }
  }, [voiceEnabled, selectedVoice]);

  // TTS helpers
  const speakText = (text: string) => {
    if (!ttsSupported || !text) return;
    // stop current
    try {
      window.speechSynthesis.cancel();
    } catch {
      // no-op
    }
    const utter = new SpeechSynthesisUtterance(text);
    const v = voices.find((vo) => vo.name === selectedVoice);
    if (v) utter.voice = v;
    utter.onstart = () => {
      setSpeaking(true);
      setPaused(false);
    };
    utter.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utter.onerror = () => {
      setSpeaking(false);
      setPaused(false);
      setError("Speech synthesis error");
    };
    window.speechSynthesis.speak(utter);
    abortSpeakRef.current = () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      setSpeaking(false);
      setPaused(false);
    };
  };

  const pauseSpeak = () => {
    if (!ttsSupported) return;
    try {
      window.speechSynthesis.pause();
      setPaused(true);
    } catch {
      // ignore
    }
  };
  const resumeSpeak = () => {
    if (!ttsSupported) return;
    try {
      window.speechSynthesis.resume();
      setPaused(false);
    } catch {
      // ignore
    }
  };
  const stopSpeak = () => {
    if (!ttsSupported) return;
    try {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setPaused(false);
    } catch {
      // ignore
    }
  };

  // When last message from AI updates, optionally auto-speak it
  useEffect(() => {
    if (!voiceEnabled || !ttsSupported || !ttsAutoSpeak) return;
    const last = messages[messages.length - 1];
    if (last && last.from === "ai" && last.text) {
      speakText(last.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const onSend = async () => {
    setError(null);
    const text = input.trim();
    if (!text) return;

    // Stop recording when sending, to prevent accidental appends
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    setSttInterim("");

    // Append user message
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      // Prepare an empty assistant message to progressively fill
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

  const toggleRecording = () => {
    if (!sttSupported || !voiceEnabled) return;
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      if (!isRecording) {
        setError(null);
        setSttInterim("");
        rec.start();
        setIsRecording(true);
      } else {
        rec.stop();
        setIsRecording(false);
      }
    } catch (e: any) {
      setError(e?.message || "Unable to access microphone");
      setIsRecording(false);
    }
  };

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
                {voiceEnabled && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-600">Voice</h4>
                    {/* TTS voice picker */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="voice" className="text-[11px] text-slate-500">
                        Speaker voice
                      </label>
                      <select
                        id="voice"
                        className="flex-1 border border-slate-200 rounded-lg text-xs px-2 py-1"
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        disabled={!ttsSupported}
                        aria-label="Select text to speech voice"
                      >
                        {!ttsSupported && <option>Not supported</option>}
                        {ttsSupported &&
                          voices.map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                      </select>
                    </div>
                    {/* TTS controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const last = messages[messages.length - 1];
                          if (last?.text) speakText(last.text);
                        }}
                        disabled={!ttsSupported}
                        className={`px-3 py-1 rounded-md text-xs ${
                          ttsSupported
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-glow"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                        aria-label="Play last assistant message"
                      >
                        Play
                      </button>
                      <button
                        type="button"
                        onClick={paused ? resumeSpeak : pauseSpeak}
                        disabled={!ttsSupported || !speaking}
                        className={`px-3 py-1 rounded-md text-xs ${
                          ttsSupported && speaking
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                        aria-label={paused ? "Resume speech" : "Pause speech"}
                      >
                        {paused ? "Resume" : "Pause"}
                      </button>
                      <button
                        type="button"
                        onClick={stopSpeak}
                        disabled={!ttsSupported || !speaking}
                        className={`px-3 py-1 rounded-md text-xs ${
                          ttsSupported && speaking
                            ? "bg-white border border-slate-200"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                        aria-label="Stop speech"
                      >
                        Stop
                      </button>
                    </div>
                    {!ttsSupported && (
                      <p className="text-[11px] text-slate-400">
                        Text-to-Speech is not available in this browser.
                      </p>
                    )}
                  </div>
                )}
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
                    className="w-full rounded-xl border border-slate-300/70 bg-white px-4 py-3 pr-36 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-300/60 focus:border-blue-400 transition"
                    aria-label="Message input"
                  />
                  {/* Voice controls to the right of input */}
                  {voiceEnabled && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {/* Mic button */}
                      <button
                        type="button"
                        onClick={toggleRecording}
                        disabled={!sttSupported}
                        aria-pressed={isRecording}
                        aria-label={
                          sttSupported
                            ? isRecording
                              ? "Stop microphone"
                              : "Start microphone"
                            : "Speech recognition not supported"
                        }
                        title={
                          sttSupported
                            ? isRecording
                              ? "Stop microphone"
                              : "Start microphone"
                            : "Speech-to-Text not supported in this browser"
                        }
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition border ${
                          isRecording
                            ? "bg-red-50 text-red-600 border-red-200"
                            : sttSupported
                            ? "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200"
                        }`}
                      >
                        {isRecording ? "Stop" : "Mic"}
                      </button>

                      {/* Speaker button - quick play/pause/stop dropdown-like trio */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const last = messages[messages.length - 1];
                            if (last?.text) speakText(last.text);
                          }}
                          disabled={!ttsSupported}
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition border ${
                            ttsSupported
                              ? "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200"
                          }`}
                          aria-label="Play last assistant message"
                          title="Play last assistant message"
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          onClick={paused ? resumeSpeak : pauseSpeak}
                          disabled={!ttsSupported || !speaking}
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition border ${
                            ttsSupported && speaking
                              ? "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200"
                          }`}
                          aria-label={paused ? "Resume speech" : "Pause speech"}
                          title={paused ? "Resume speech" : "Pause speech"}
                        >
                          {paused ? "⏯" : "⏸"}
                        </button>
                        <button
                          type="button"
                          onClick={stopSpeak}
                          disabled={!ttsSupported || !speaking}
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition border ${
                            ttsSupported && speaking
                              ? "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200"
                          }`}
                          aria-label="Stop speech"
                          title="Stop speech"
                        >
                          ⏹
                        </button>
                      </div>

                      {/* Send */}
                      <button
                        onClick={onSend}
                        disabled={loading || !input.trim()}
                        className={`rounded-lg ml-1 px-4 py-2 text-sm font-medium transition ${
                          loading || !input.trim()
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-glow"
                        }`}
                        aria-disabled={loading || !input.trim()}
                      >
                        Send
                      </button>
                    </div>
                  )}
                  {!voiceEnabled && (
                    <button
                      onClick={onSend}
                      disabled={loading || !input.trim()}
                      className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                        loading || !input.trim()
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-glow"
                      }`}
                      aria-disabled={loading || !input.trim()}
                    >
                      Send
                    </button>
                  )}
                </div>
                {/* Interim STT line */}
                {voiceEnabled && isRecording && sttInterim && (
                  <div className="mt-2 text-[12px] text-slate-500" aria-live="polite">
                    {sttInterim}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-400">Powered by your backend</span>
                  <span className="text-[11px] text-slate-400">
                    Tip: Press Enter to send{voiceEnabled ? " • Use mic to dictate" : ""}
                  </span>
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
