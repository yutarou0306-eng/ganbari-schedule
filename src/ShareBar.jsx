import React, { useState } from "react";

export default function ShareBar() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ position: "fixed", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 999 }}>
      <button
        onClick={handleCopy}
        style={{
          background: "#14588C",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif",
          boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
          cursor: "pointer",
        }}
      >
        {copied ? "✅ コピーしました！" : "🔗 このスケジュールの共有リンクをコピー"}
      </button>
    </div>
  );
}
