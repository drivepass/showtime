import { useEffect } from "react";

export default function Launching() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "https://saas.navori.com";
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0f1a",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .showtime-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(26, 145, 226, 0.2);
          border-top-color: #1A91E2;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <img src="/DP_logo_White.png" alt="drivepass" style={{ width: 220 }} />
        <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginTop: 8 }}>Showtime</div>
        <div style={{ fontSize: 16, color: "#1A91E2" }}>by drivepass©</div>
        <div className="showtime-spinner" style={{ marginTop: 8 }} />
        <div style={{ fontSize: 14, color: "#9CA3AF" }}>Launching your platform...</div>
        <a
          href="/ai-studio"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 13,
            color: "#1A91E2",
            textDecoration: "none",
            marginTop: 12,
            opacity: 0.85,
          }}
        >
          Open AI Content Studio →
        </a>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 32,
          right: 40,
          fontSize: 12,
          letterSpacing: 2,
          fontWeight: 600,
        }}
      >
        <span style={{ color: "#fff" }}>AUTOMOTIVE </span>
        <span style={{ color: "#1A91E2" }}>ABSOLUTE.</span>
      </div>
    </div>
  );
}
