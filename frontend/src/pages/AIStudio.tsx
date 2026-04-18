import { useState } from "react";
import { API_BASE } from "@/lib/queryClient";

type GeneratedImage = { url: string; label: string };

const QUICK_STARTS = [
  { icon: "🚗", label: "New Inventory", prompt: "A premium promotional slide showcasing our newest vehicle inventory, sleek modern design with dealership branding" },
  { icon: "🔧", label: "Service Specials", prompt: "An eye-catching service specials promotion for oil changes, tire rotations and seasonal maintenance offers" },
  { icon: "💰", label: "Finance Offers", prompt: "A bold finance offer slide featuring 0% APR financing, trade-in bonuses, and monthly payment highlights" },
  { icon: "🏁", label: "Test Drive Promo", prompt: "A dynamic test drive invitation slide with motion blur, open road imagery and a strong call to action" },
];

const CONTENT_TYPES = ["Static", "Video"];
const USE_CASES = ["Promotion", "Announcement", "Menu", "Event"];
const ORIENTATIONS = ["Landscape", "Portrait"];
const RESOLUTIONS = ["1920×1080", "3840×2160", "1280×720"];
const ASPECTS = ["16:9", "9:16", "1:1"];

export default function AIStudio() {
  const [prompt, setPrompt] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [contentType, setContentType] = useState("Static");
  const [useCase, setUseCase] = useState("Promotion");
  const [orientation, setOrientation] = useState("Landscape");
  const [resolution, setResolution] = useState("1920×1080");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [aiModel, setAiModel] = useState("flux");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedImage[] | null>(null);
  const [resultModel, setResultModel] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState<string>("");

  const saveToNavori = async () => {
    if (selectedIdx === null || !results?.[selectedIdx]) return;
    const imageUrl = results[selectedIdx].url;
    setUploadState("uploading");
    setUploadError("");
    try {
      const res = await fetch(API_BASE + "/api/aistudio/publish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, prompt: prompt || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const status = data?.navoriStatus;
        const msg = status
          ? `Navori upload failed (${status}). Please try again or contact support.`
          : (data?.message || data?.error || `Upload failed (${res.status})`);
        throw new Error(msg);
      }
      setUploadState("success");
      setTimeout(() => setUploadState("idle"), 3000);
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed");
      setUploadState("error");
    }
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResults(null);
    setSelectedIdx(null);
    setError("");
    try {
      const res = await fetch(API_BASE + "/api/ai/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, contentType, useCase, orientation, resolution, aspectRatio, model: aiModel }),
      });
      if (!res.ok) throw new Error(`Generation failed (${res.status})`);
      const data = await res.json();
      setResults(data.images || []);
      setResultModel(data.model || null);
    } catch (e: any) {
      setError(e?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .aistudio-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(26, 145, 226, 0.2);
          border-top-color: #1A91E2;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        .pill {
          background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 999px;
          padding: 6px 14px; font-size: 13px; cursor: pointer; color: #111827;
          display: inline-flex; align-items: center; gap: 6px;
          transition: background 0.15s;
        }
        .pill:hover { background: #e5e7eb; }
        .seg { display: inline-flex; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .seg button { background: #fff; border: none; padding: 8px 14px; font-size: 13px; cursor: pointer; color: #374151; }
        .seg button.active { background: #1A91E2; color: #fff; }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #e5e7eb", padding: "16px 32px", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src="/DP_logo_Black.png" onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/DP_logo_White.png")} alt="drivepass" style={{ height: 32 }} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>AI Content Studio</div>
          <a
            href="https://saas.navori.com"
            style={{
              fontSize: 13,
              color: "#1A91E2",
              textDecoration: "none",
              border: "1px solid #1A91E2",
              borderRadius: 6,
              padding: "8px 14px",
              fontWeight: 600,
            }}
          >
            Back to Platform
          </a>
        </div>
        <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13, marginTop: 6 }}>
          Generate stunning signage content with artificial intelligence
        </div>
      </div>

      {/* QUICK STARTS */}
      <div style={{ padding: "14px 32px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280" }}>QUICK STARTS:</span>
        {QUICK_STARTS.map((q) => (
          <button key={q.label} className="pill" onClick={() => setPrompt(q.prompt)}>
            <span>{q.icon}</span>
            <span>{q.label}</span>
          </button>
        ))}
      </div>

      {/* MAIN */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px" }}>
        {/* INPUT */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the content you want to create... e.g. 'A premium promotional slide for the new 2025 BMW X5 launch with sleek dark theme and gold accents'"
            style={{
              width: "100%", minHeight: 120, padding: 14, fontSize: 14,
              border: "1px solid #d1d5db", borderRadius: 8, resize: "vertical",
              fontFamily: "inherit", marginBottom: 16, boxSizing: "border-box",
            }}
          />

          <button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            style={{
              width: "100%", background: "#1A91E2", color: "#fff",
              fontWeight: 700, fontSize: 15, padding: "12px 16px",
              border: "none", borderRadius: 8,
              cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
              opacity: loading || !prompt.trim() ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span>✦</span>
            <span>{loading ? "Generating..." : "Generate"}</span>
          </button>

          {/* Configuration Options */}
          <div style={{ marginTop: 20, borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
            <button
              onClick={() => setConfigOpen(!configOpen)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, color: "#374151",
                display: "flex", alignItems: "center", gap: 6, padding: 0,
              }}
            >
              <span style={{ transform: configOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
              Configuration Options
            </button>
            {configOpen && (
              <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                <ConfigRow label="Content Type" options={CONTENT_TYPES} value={contentType} onChange={setContentType} />
                <ConfigRow label="Use Case" options={USE_CASES} value={useCase} onChange={setUseCase} />
                <ConfigRow label="Orientation" options={ORIENTATIONS} value={orientation} onChange={setOrientation} />
                <ConfigRow label="Resolution" options={RESOLUTIONS} value={resolution} onChange={setResolution} />
                <ConfigRow label="Aspect Ratio" options={ASPECTS} value={aspectRatio} onChange={setAspectRatio} />
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", minWidth: 120 }}>AI Model</div>
                  <div className="seg">
                    <button
                      className={aiModel === "flux" ? "active" : ""}
                      onClick={() => setAiModel("flux")}
                      title="Best for vehicles and lifestyle photography"
                    >
                      Photorealistic
                    </button>
                    <button
                      className={aiModel === "ideogram" ? "active" : ""}
                      onClick={() => setAiModel("ideogram")}
                      title="Best for price cards and banners with text"
                    >
                      Text & Graphics
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    {aiModel === "flux" ? "FLUX.1 Pro — best for vehicles & lifestyle" : "Ideogram v2 Turbo — best for price cards & banners with text"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 16, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* RESULTS */}
        {(loading || results) && (
          <div style={{ marginTop: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "40px 0" }}>
                <div className="aistudio-spinner" />
                <div style={{ fontSize: 14, color: "#6b7280" }}>Generating 4 professional options...</div>
              </div>
            )}

            {results && !loading && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    Generated 4 professional options based on your prompt
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="pill" onClick={generate}>Regenerate</button>
                    <button className="pill" onClick={() => setConfigOpen(true)}>Change Style</button>
                    <button className="pill" onClick={() => document.querySelector("textarea")?.focus()}>Adjust Prompt</button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {results.map((img, idx) => {
                    const selected = selectedIdx === idx;
                    return (
                      <div
                        key={idx}
                        style={{
                          border: `2px solid ${selected ? "#1A91E2" : "#e5e7eb"}`,
                          borderRadius: 12, overflow: "hidden", background: "#fff",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <div style={{ position: "relative", background: "#f3f4f6", aspectRatio: "16 / 9" }}>
                          <img src={img.url} alt={img.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          <div
                            style={{
                              position: "absolute", bottom: 8, right: 8,
                              background: "rgba(0,0,0,0.7)", color: "#fff",
                              fontSize: 10, fontWeight: 600, padding: "4px 8px",
                              borderRadius: 4, letterSpacing: 0.5,
                            }}
                          >
                            Powered by Showtime
                          </div>
                        </div>
                        <div style={{ padding: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{img.label}</div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="pill"
                              style={{ flex: 1, justifyContent: "center" }}
                              onClick={() => window.open(img.url, "_blank")}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setSelectedIdx(idx)}
                              style={{
                                flex: 1,
                                background: selected ? "#1A91E2" : "#fff",
                                color: selected ? "#fff" : "#1A91E2",
                                border: `1px solid #1A91E2`,
                                borderRadius: 999, padding: "6px 14px",
                                fontSize: 13, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              {selected ? "Selected" : "Select"}
                            </button>
                          </div>
                          <button
                            disabled={downloadingIdx === idx}
                            onClick={async () => {
                              setDownloadingIdx(idx);
                              try {
                                const response = await fetch(img.url);
                                const blob = await response.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `showtime-ai-option-${idx + 1}.jpg`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              } catch {
                                // download failed silently
                              } finally {
                                setDownloadingIdx(null);
                              }
                            }}
                            style={{
                              width: "100%",
                              marginTop: 8,
                              background: "#fff",
                              color: "#1A91E2",
                              border: "1px solid #1A91E2",
                              borderRadius: 6,
                              padding: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: downloadingIdx === idx ? "not-allowed" : "pointer",
                              opacity: downloadingIdx === idx ? 0.7 : 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            {downloadingIdx === idx ? (
                              <>
                                <span className="aistudio-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              "⬇ Download Image"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedIdx !== null && (
                  <div style={{ marginTop: 20 }}>
                    <button
                      onClick={saveToNavori}
                      disabled={uploadState === "uploading" || uploadState === "success"}
                      style={{
                        width: "100%",
                        background: uploadState === "success" ? "#16a34a" : "#1A91E2",
                        color: "#fff",
                        fontWeight: 700, fontSize: 15, padding: "12px 16px",
                        border: "none", borderRadius: 8,
                        cursor: uploadState === "uploading" || uploadState === "success" ? "not-allowed" : "pointer",
                        opacity: uploadState === "uploading" ? 0.75 : 1,
                        transition: "background 0.2s",
                      }}
                    >
                      {uploadState === "uploading" && "Uploading to Navori..."}
                      {uploadState === "success" && "Saved to Navori ✓"}
                      {(uploadState === "idle" || uploadState === "error") && "Save to Navori Library"}
                    </button>
                    <div style={{ minHeight: 34, marginTop: 8 }}>
                      {uploadState === "error" ? (
                        <div style={{ fontSize: 12, color: "#b91c1c" }}>
                          {uploadError}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          Uploads to your Navori media library. Build playlists manually in Navori via Launch Platform.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigRow({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", minWidth: 120 }}>{label}</div>
      <div className="seg">
        {options.map((opt) => (
          <button
            key={opt}
            className={value === opt ? "active" : ""}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
