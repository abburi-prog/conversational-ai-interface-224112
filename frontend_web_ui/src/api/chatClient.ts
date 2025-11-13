/**
 * Simple API client for chat endpoint.
 * PUBLIC_INTERFACE
 * sendMessage posts to /api/chat and returns the reply string.
 */
export async function sendMessage(message: string): Promise<string> {
  /** This function calls the backend chat API and returns the assistant reply. */
  const base =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    "";
  const url = `${base}/api/chat`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!resp.ok) {
    let detail = "Failed to get reply";
    try {
      const data = await resp.json();
      if (data?.detail) detail = data.detail;
    } catch {
      // ignore parse error
    }
    throw new Error(detail);
  }

  const json = await resp.json();
  return json.reply as string;
}
