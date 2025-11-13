import React, { useState } from "react";
import { sendMessage } from "../api/chatClient";

/**
 * PUBLIC_INTERFACE
 * ChatBox is a basic chat component that sends messages to the backend and displays the reply.
 */
export default function ChatBox() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSend = async () => {
    setError(null);
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    try {
      const reply = await sendMessage(text);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError(e?.message || "Failed to get reply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Talk 2 AI</h2>
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 12,
          minHeight: 240,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              margin: "8px 0",
              textAlign: m.role === "user" ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 12,
                background: m.role === "user" ? "#2563EB" : "#F3F4F6",
                color: m.role === "user" ? "#fff" : "#111827",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ opacity: 0.7 }}>Thinking...</div>}
        {error && <div style={{ color: "#EF4444" }}>{error}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            outline: "none",
          }}
        />
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#2563EB",
            color: "#fff",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
