import React, { useState } from "react";

const pillStyle = {
  border: "none",
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif",
  boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
  cursor: "pointer",
};

export default function ShareBar() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleBackHome() {
    window.location.href = window.location.pathname;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999,
        display: "flex",
        gap: 8,
      }}
    >
      <button onClick={handleBackHome} style={{ ...pillStyle, background: "rgba(11,61,98,0.85)", color: "#fff" }}>
        🏠 トップへ
      </button>
      <button onClick={handleCopy} style={{ ...pillStyle, background: "#14588C", color: "#fff" }}>
        {copied ? "✅ コピーしました！" : "🔗 共有リンクをコピー"}
      </button>
    </div>
  );
}
