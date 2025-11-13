import React from "react";
import ChatBox from "./components/ChatBox.tsx";

/**
 * PUBLIC_INTERFACE
 * App: Root rendering the Blue Glow Chat UI.
 */
export default function App() {
  return (
    <div className="min-h-screen">
      <ChatBox />
    </div>
  );
}
