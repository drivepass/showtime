import { useLocation } from "wouter";

export default function Launching() {
  const [, setLocation] = useLocation();

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
        padding: 24,
        overflow: "auto",
      }}
    >
      <style>{`
        .showtime-card {
          background: #111827;
          border: 1px solid #1e2e3e;
          border-radius: 12px;
          padding: 40px;
          width: 360px;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        }
        .showtime-card:hover {
          border-color: #1A91E2;
          box-shadow: 0 0 0 1px #1A91E2, 0 10px 40px rgba(26, 145, 226, 0.25);
          transform: translateY(-2px);
        }
        .showtime-btn-primary {
          background: #1A91E2;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s;
        }
        .showtime-btn-primary:hover { background: #1578c2; }
        .showtime-btn-outline {
          background: transparent;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 16px;
          border: 1px solid #fff;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .showtime-btn-outline:hover {
          background: #fff;
          color: #0a0f1a;
        }
      `}</style>

      {/* TOP */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <img src="/DP_logo_White.png" alt="drivepass" style={{ width: 200 }} />
        <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginTop: 8 }}>Welcome to Showtime</div>
        <div style={{ fontSize: 14, color: "#1A91E2" }}>by drivepass©</div>
        <div style={{ fontSize: 16, color: "#9CA3AF", marginTop: 8 }}>What would you like to do today?</div>
      </div>

      {/* CARDS */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {/* Card 1 — Scheduling Platform */}
        <div className="showtime-card">
          <div style={{ fontSize: 48, lineHeight: 1 }}>📅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Scheduling Platform</div>
          <div style={{ fontSize: 14, color: "#9CA3AF", lineHeight: 1.5 }}>
            Manage your digital signage, playlists, scheduling and monitoring
          </div>
          <button
            className="showtime-btn-primary"
            style={{ marginTop: 8 }}
            onClick={() => {
              window.location.href = "https://saas.navori.com";
            }}
          >
            Launch Platform →
          </button>
        </div>

        {/* Card 2 — AI Content Studio */}
        <div className="showtime-card">
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: "rgba(26, 145, 226, 0.15)",
              color: "#1A91E2",
              border: "1px solid rgba(26, 145, 226, 0.4)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: "4px 8px",
              borderRadius: 999,
            }}
          >
            Powered by Showtime
          </div>
          <div style={{ fontSize: 48, lineHeight: 1, color: "#1A91E2" }}>✦</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>AI Content Studio</div>
          <div style={{ fontSize: 14, color: "#9CA3AF", lineHeight: 1.5 }}>
            Generate stunning automotive signage content with artificial intelligence
          </div>
          <button
            className="showtime-btn-outline"
            style={{ marginTop: 8 }}
            onClick={() => setLocation("/ai-studio")}
          >
            Create Content →
          </button>
        </div>
      </div>

      {/* BOTTOM */}
      <div
        style={{
          marginTop: 56,
          fontSize: 12,
          letterSpacing: 2,
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        <span style={{ color: "#fff" }}>AUTOMOTIVE </span>
        <span style={{ color: "#1A91E2" }}>ABSOLUTE.</span>
      </div>
    </div>
  );
}
