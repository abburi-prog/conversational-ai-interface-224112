import axios from "axios";

/**
 * Simple API client for chat endpoint.
 * PUBLIC_INTERFACE
 * sendMessage posts to /api/chat and returns the reply string.
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
