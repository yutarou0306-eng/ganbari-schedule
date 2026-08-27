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
  whiteSpace: "nowrap",
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

  function handleLineShare() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://social-plugins.line.me/lineit/share?url=${url}`, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div style={{ position: "fixed", top: 8, left: 8, zIndex: 999 }}>
        <button onClick={handleBackHome} style={{ ...pillStyle, background: "rgba(11,61,98,0.85)", color: "#fff" }}>
          🏠 トップへ
        </button>
      </div>

      <div style={{ position: "fixed", top: 8, right: 8, zIndex: 999, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "60%" }}>
        <button onClick={handleLineShare} style={{ ...pillStyle, background: "#06C755", color: "#fff" }}>
          LINEでシェア
        </button>
        <button onClick={handleCopy} style={{ ...pillStyle, background: "#14588C", color: "#fff" }}>
          {copied ? "✅ コピーしました！" : "🔗 リンクをコピー"}
        </button>
      </div>
    </>
  );
}
