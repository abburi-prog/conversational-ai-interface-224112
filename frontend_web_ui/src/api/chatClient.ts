import axios from "axios";

/**
 * Simple API client for chat endpoints.
 * PUBLIC_INTERFACE
 * - sendMessage posts to /api/chat and returns the reply string (non-streaming).
 * - streamMessage posts to /api/chat/stream and yields tokens incrementally with graceful fallback.
 */

const baseURL =
  (process.env.REACT_APP_API_BASE as string) ||
  (process.env.REACT_APP_BACKEND_URL as string) ||
  "";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" }
});

// PUBLIC_INTERFACE
export async function sendMessage(message: string): Promise<string> {
  /**
   * Calls backend chat API and returns assistant reply.
   * Reads base URL from env: REACT_APP_API_BASE or REACT_APP_BACKEND_URL.
   */
  try {
    const resp = await api.post("/api/chat", { message });
    return resp.data.reply as string;
  } catch (err: any) {
    const detail =
      err?.response?.data?.detail ||
      err?.message ||
      "Failed to get reply";
    throw new Error(detail);
  }
}

/**
 * PUBLIC_INTERFACE
 * streamMessage: Fetches /api/chat/stream and yields incremental tokens as they arrive.
 * Falls back to non-streaming if ReadableStream is unavailable.
 */
export async function* streamMessage(message: string): AsyncGenerator<string, void, unknown> {
  const base =
    (process.env.REACT_APP_API_BASE as string) ||
    (process.env.REACT_APP_BACKEND_URL as string) ||
    "";
  const urlBase = base ? base.replace(/\/$/, "") : "";
  const streamUrl = `${urlBase}/api/chat/stream`;

  const supportsStreaming =
    typeof window !== "undefined" &&
    "ReadableStream" in window &&
    typeof Response !== "undefined";

  if (!supportsStreaming) {
    const full = await sendMessage(message);
    yield full;
    return;
  }

  const resp = await fetch(streamUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  if (!resp.ok || !resp.body) {
    // Fallback: non-streaming
    const full = await sendMessage(message);
    yield full;
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) yield chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
