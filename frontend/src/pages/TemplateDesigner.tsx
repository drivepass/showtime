import { TopNavigationBarSection } from "./sections/TopNavigationBarSection";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { GroupSelectionProvider, useGroupSelection } from "@/hooks/use-group-selection";
import { PlayerSelectionProvider } from "@/hooks/use-player-selection";
import { MediaSelectionProvider } from "@/hooks/use-media-selection";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ChevronDownIcon, Loader2Icon, CheckCircleIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, API_BASE } from "@/lib/queryClient";

function TemplateCanvas({ width, height, isDark, t, bgColor }: { width: string; height: string; isDark: boolean; t: any; bgColor: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });

  const updateContainerSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ w: rect.width - 80, h: rect.height - 80 });
    }
  }, []);

  useEffect(() => {
    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, [updateContainerSize]);

  const templateW = Math.max(parseInt(width) || 1920, 100);
  const templateH = Math.max(parseInt(height) || 1080, 100);

  const scaleX = containerSize.w / templateW;
  const scaleY = containerSize.h / templateH;
  const scale = Math.min(scaleX, scaleY, 1);

  const canvasW = Math.round(templateW * scale);
  const canvasH = Math.round(templateH * scale);
  const pct = Math.round(scale * 100);

  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden" ref={containerRef}>
      <div
        className={`relative border transition-all duration-200 ${isDark ? "border-[#1e2e3e]" : "border-gray-300"}`}
        style={{ width: `${canvasW}px`, height: `${canvasH}px`, backgroundColor: bgColor }}
        data-testid="template-canvas"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm ${isDark ? "text-[#2a3a4a]" : "text-gray-300"}`}>
            {templateW} × {templateH}
          </span>
        </div>
        <div className={`absolute top-2 left-2 text-[10px] ${isDark ? "text-[#546e7a]" : "text-gray-400"}`}>
          Canvas ({pct}%)
        </div>
      </div>
    </div>
  );
}

function TemplateDesignerContent() {
  const { t, isDark } = useTheme();
  const [, setLocation] = useLocation();
  const { selectedGroupId } = useGroupSelection();
  const [templateName, setTemplateName] = useState("Template Name");
  const [width, setWidth] = useState("1920");
  const [height, setHeight] = useState("1080");
  const [duration, setDuration] = useState("00:00:15");
  const [bgType, setBgType] = useState("Color");
  const [bgColor, setBgColor] = useState("#000000");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    background: true,
    topLayers: false,
    playlists: false,
    media: false,
    dataFeed: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const effectiveGroupId = selectedGroupId;

  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ["/api/playlists", effectiveGroupId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/playlists?groupId=${effectiveGroupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch playlists");
      return res.json();
    },
    enabled: expandedSections.playlists && !!effectiveGroupId,
  });

  const { data: mediasData, isLoading: mediasLoading } = useQuery({
    queryKey: ["/api/medias", effectiveGroupId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/medias?groupId=${effectiveGroupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch medias");
      return res.json();
    },
    enabled: expandedSections.media && !!effectiveGroupId,
  });

  const parseDuration = (val: string): number => {
    const parts = val.split(":").map(Number);
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    return parseInt(val) || 15;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/templates/set", {
        templates: [{
          Name: templateName.trim(),
          Width: parseInt(width) || 1920,
          Height: parseInt(height) || 1080,
          Duration: parseDuration(duration),
          Enabled: true,
          Type: "Template",
          BackgroundColor: bgColor,
          ...(effectiveGroupId ? { GroupId: effectiveGroupId } : {}),
        }],
      });
    },
    onSuccess: () => {
      setSaveStatus("saved");
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
    onError: (err: any) => {
      setSaveStatus("error");
      setSaveError(err?.message || "Failed to save template");
    },
  });

  const handleSave = () => {
    if (!templateName.trim()) return;
    setSaveStatus("saving");
    saveMutation.mutate();
  };

  const playlists = playlistsData?.playlists || [];
  const medias = mediasData?.medias || [];

  return (
    <div className={`${t.pageBg} w-full min-w-[1728px] min-h-screen flex flex-col ${t.textPrimary}`}>
      <TopNavigationBarSection activeTab="home" />

      <div className="flex flex-1 overflow-hidden">
        <div className={`w-[280px] ${isDark ? "bg-[#0e1620]" : "bg-white"} border-r ${t.border} flex flex-col flex-shrink-0`}>
          <div className={`px-4 py-4 border-b ${t.border}`}>
            <h1 className={`text-[22px] font-normal tracking-[-0.5px] ${isDark ? "text-[#c8d2e0]" : "text-gray-800"} mb-4`} data-testid="text-template-designer-title">
              Template Designer
            </h1>

            <div className="space-y-3">
              <div>
                <div className={`border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-200"} pb-1`}>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className={`w-full bg-transparent text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} outline-none`}
                    data-testid="input-template-name"
                  />
                </div>
                <span className={`text-[10px] ${t.textDim} mt-0.5 block`}>Template Name</span>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-[11px] font-medium ${isDark ? "text-[#2997cc]" : "text-blue-600"}`}>W</span>
                    <div className={`flex-1 border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-200"} pb-0.5`}>
                      <input
                        type="text"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        className={`w-full bg-transparent text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} outline-none`}
                        data-testid="input-template-width"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-[11px] font-medium ${isDark ? "text-[#2997cc]" : "text-blue-600"}`}>H</span>
                    <div className={`flex-1 border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-200"} pb-0.5`}>
                      <input
                        type="text"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className={`w-full bg-transparent text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} outline-none`}
                        data-testid="input-template-height"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-medium ${isDark ? "text-[#2997cc]" : "text-blue-600"}`}>Manual</span>
              </div>

              <div>
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-medium ${isDark ? "text-[#2997cc]" : "text-blue-600"}`}>Duration</span>
                  <div className={`flex-1 border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-200"} pb-0.5`}>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className={`w-full bg-transparent text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} outline-none`}
                      data-testid="input-template-duration"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium ${isDark ? "text-[#2997cc]" : "text-blue-600"}`}>Snap</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                className={`px-3 py-1.5 text-[11px] font-medium ${isDark ? "text-[#2997cc] border-[#2997cc]" : "text-blue-600 border-blue-600"} border rounded ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-blue-50"} transition-colors`}
                data-testid="button-template-preview"
              >
                Preview
              </button>
              <button
                className={`px-3 py-1.5 text-[11px] font-medium bg-[#2997cc] hover:bg-[#2587b8] text-white rounded transition-colors flex items-center gap-1.5 disabled:opacity-50`}
                onClick={handleSave}
                disabled={saveMutation.isPending || !templateName.trim()}
                data-testid="button-template-save"
              >
                {saveMutation.isPending ? (
                  <><Loader2Icon className="w-3 h-3 animate-spin" /> Saving...</>
                ) : saveStatus === "saved" ? (
                  <><CheckCircleIcon className="w-3 h-3" /> Saved</>
                ) : (
                  "Save"
                )}
              </button>
              <button
                className={`px-3 py-1.5 text-[11px] font-medium ${t.textDim} ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-100"} rounded transition-colors`}
                onClick={() => setLocation("/")}
                data-testid="button-template-cancel"
              >
                Cancel
              </button>
            </div>

            {saveStatus === "error" && saveError && (
              <div className="mt-2 text-xs text-red-400">{saveError}</div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            <div className={`border-b ${t.border}`}>
              <button
                className={`flex items-center justify-between w-full px-4 py-2.5 text-[12px] font-medium ${isDark ? "text-[#2997cc]" : "text-blue-600"} ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors`}
                data-testid="button-template-add"
              >
                Add
              </button>
            </div>

            <div className={`border-b ${t.border}`}>
              <button
                className={`flex items-center justify-between w-full px-4 py-2.5 text-[12px] font-medium ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors`}
                onClick={() => toggleSection("background")}
                data-testid="button-section-background"
              >
                Background
                <ChevronDownIcon className={`w-3.5 h-3.5 ${t.textDim} transition-transform ${expandedSections.background ? "rotate-180" : ""}`} />
              </button>
              {expandedSections.background && (
                <div className="px-4 pb-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] ${isDark ? "text-[#2997cc]" : "text-blue-600"}`}>Type</span>
                    <select
                      value={bgType}
                      onChange={(e) => setBgType(e.target.value)}
                      className={`text-[11px] bg-transparent ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} outline-none border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-200"} pb-0.5`}
                      data-testid="select-bg-type"
                    >
                      <option value="Color">Color</option>
                      <option value="Image">Image</option>
                      <option value="Video">Video</option>
                    </select>
                  </div>
                  {bgType === "Color" && (
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] ${isDark ? "text-[#2997cc]" : "text-blue-600"}`}>Color</span>
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-6 h-6 rounded border border-gray-600 cursor-pointer p-0"
                        data-testid="input-bg-color"
                      />
                      <span className={`text-[10px] ${t.textDim}`}>{bgColor}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`border-b ${t.border}`}>
              <button
                className={`flex items-center justify-between w-full px-4 py-2.5 text-[12px] font-medium ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors`}
                onClick={() => toggleSection("topLayers")}
                data-testid="button-section-topLayers"
              >
                Top Layers
                <ChevronDownIcon className={`w-3.5 h-3.5 ${t.textDim} transition-transform ${expandedSections.topLayers ? "rotate-180" : ""}`} />
              </button>
              {expandedSections.topLayers && (
                <div className="px-4 pb-3">
                  <span className={`text-[10px] ${t.textDim}`}>No top layers configured</span>
                </div>
              )}
            </div>

            <div className={`border-b ${t.border}`}>
              <button
                className={`flex items-center justify-between w-full px-4 py-2.5 text-[12px] font-medium ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors`}
                onClick={() => toggleSection("playlists")}
                data-testid="button-section-playlists"
              >
                Playlists
                <ChevronDownIcon className={`w-3.5 h-3.5 ${t.textDim} transition-transform ${expandedSections.playlists ? "rotate-180" : ""}`} />
              </button>
              {expandedSections.playlists && (
                <div className="px-4 pb-3 space-y-1">
                  {playlistsLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2Icon className={`w-3 h-3 ${t.textDim} animate-spin`} />
                      <span className={`text-[10px] ${t.textDim}`}>Loading playlists...</span>
                    </div>
                  ) : playlists.length === 0 ? (
                    <span className={`text-[10px] ${t.textDim}`}>No playlists available</span>
                  ) : (
                    playlists.map((pl: any) => (
                      <div
                        key={pl.Id}
                        className={`flex items-center gap-2 py-1 px-1 rounded cursor-pointer text-[11px] ${isDark ? "text-[#c8d2e0] hover:bg-[#1a2a3a]" : "text-gray-700 hover:bg-gray-50"} transition-colors`}
                        data-testid={`playlist-item-${pl.Id}`}
                      >
                        <svg className={`w-3 h-3 ${isDark ? "text-[#2997cc]" : "text-blue-500"} flex-shrink-0`} viewBox="0 0 16 16" fill="currentColor">
                          <path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h8v2H2z" />
                        </svg>
                        <span className="truncate">{pl.Name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className={`border-b ${t.border}`}>
              <button
                className={`flex items-center justify-between w-full px-4 py-2.5 text-[12px] font-medium ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors`}
                onClick={() => toggleSection("media")}
                data-testid="button-section-media"
              >
                Media
                <ChevronDownIcon className={`w-3.5 h-3.5 ${t.textDim} transition-transform ${expandedSections.media ? "rotate-180" : ""}`} />
              </button>
              {expandedSections.media && (
                <div className="px-4 pb-3 space-y-1">
                  {mediasLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2Icon className={`w-3 h-3 ${t.textDim} animate-spin`} />
                      <span className={`text-[10px] ${t.textDim}`}>Loading media...</span>
                    </div>
                  ) : medias.length === 0 ? (
                    <span className={`text-[10px] ${t.textDim}`}>No media available</span>
                  ) : (
                    medias.slice(0, 50).map((m: any) => (
                      <div
                        key={m.Id}
                        className={`flex items-center gap-2 py-1 px-1 rounded cursor-pointer text-[11px] ${isDark ? "text-[#c8d2e0] hover:bg-[#1a2a3a]" : "text-gray-700 hover:bg-gray-50"} transition-colors`}
                        data-testid={`media-item-${m.Id}`}
                      >
                        <svg className={`w-3 h-3 ${isDark ? "text-[#546e7a]" : "text-gray-400"} flex-shrink-0`} viewBox="0 0 16 16" fill="currentColor">
                          <rect x="1" y="1" width="14" height="14" rx="1" />
                        </svg>
                        <span className="truncate">{m.Name}</span>
                        <span className={`text-[9px] ${t.textDim} ml-auto flex-shrink-0`}>{m.Type || ""}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className={`border-b ${t.border}`}>
              <button
                className={`flex items-center justify-between w-full px-4 py-2.5 text-[12px] font-medium ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors`}
                onClick={() => toggleSection("dataFeed")}
                data-testid="button-section-dataFeed"
              >
                Data Feed Manager
                <ChevronDownIcon className={`w-3.5 h-3.5 ${t.textDim} transition-transform ${expandedSections.dataFeed ? "rotate-180" : ""}`} />
              </button>
              {expandedSections.dataFeed && (
                <div className="px-4 pb-3">
                  <span className={`text-[10px] ${t.textDim}`}>No data feeds configured</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <TemplateCanvas width={width} height={height} isDark={isDark} t={t} bgColor={bgColor} />
      </div>
    </div>
  );
}

export default function TemplateDesigner() {
  return (
    <ThemeProvider>
      <GroupSelectionProvider>
        <PlayerSelectionProvider>
          <MediaSelectionProvider>
            <TemplateDesignerContent />
          </MediaSelectionProvider>
        </PlayerSelectionProvider>
      </GroupSelectionProvider>
    </ThemeProvider>
  );
}
