import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useGroupSelection } from "@/hooks/use-group-selection";
import { apiRequest, queryClient, API_BASE } from "@/lib/queryClient";
import { useMediaSelection } from "@/hooks/use-media-selection";

interface AddPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = [
  "#d4e157", "#8bc34a", "#4caf50", "#009688", "#00bcd4",
  "#2196f3", "#3f51b5", "#673ab7", "#9c27b0", "#e91e63",
  "#f44336", "#ff5722", "#ff9800", "#ffc107", "#ffeb3b",
  "#795548",
];

export function AddPlaylistModal({ isOpen, onClose }: AddPlaylistModalProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { selectedGroupId } = useGroupSelection();
  const { selectedMediaId, selectedMediaType } = useMediaSelection();
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[2]);
  const [shuffle, setShuffle] = useState(false);
  const [muteAudio, setMuteAudio] = useState(false);
  const [shareOfVoice, setShareOfVoice] = useState(false);
  const [canSee, setCanSee] = useState(true);
  const [maxContent, setMaxContent] = useState("0");
  const [maxDuration, setMaxDuration] = useState("00:00:00");
  const [priority, setPriority] = useState("Scheduling grid");
  const [headerPickerOpen, setHeaderPickerOpen] = useState(false);
  const [generalPickerOpen, setGeneralPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const headerPickerRef = useRef<HTMLDivElement>(null);
  const generalPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (headerPickerRef.current && !headerPickerRef.current.contains(e.target as Node)) {
        setHeaderPickerOpen(false);
      }
      if (generalPickerRef.current && !generalPickerRef.current.contains(e.target as Node)) {
        setGeneralPickerOpen(false);
      }
    }
    if (headerPickerOpen || generalPickerOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [headerPickerOpen, generalPickerOpen]);

  if (!isOpen) return null;

  const now = new Date();
  const dateLabel = now.toLocaleString(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const handleOk = async () => {
    const trimmedName = name.trim();
    if (!selectedGroupId || !trimmedName || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const createRes = await apiRequest("POST", "/api/playlists/set", {
        playlists: [
          {
            GroupId: selectedGroupId,
            Name: trimmedName,
            Color: selectedColor,
            Shuffle: shuffle,
            FitToSlot: false,
          },
        ],
      });

      const createContentType = createRes.headers.get("content-type") || "";
      if (!createContentType.includes("application/json")) {
        throw new Error("Playlist API route is not returning JSON. Restart the server and try again.");
      }

      const createData = await createRes.json();
      let playlistId = createData?.playlists?.[0]?.Id as number | undefined;

      if (!playlistId && selectedMediaId) {
        const playlistsRes = await fetch(`${API_BASE}/api/playlists?groupId=${selectedGroupId}`, { credentials: "include" });
        if (playlistsRes.ok) {
          const playlistsData = await playlistsRes.json();
          const matchingPlaylists = (playlistsData?.playlists || []).filter((playlist: { Id?: number; Name?: string }) => playlist.Name === trimmedName);
          playlistId = matchingPlaylists.reduce((highest: number | undefined, playlist: { Id?: number }) => {
            if (!playlist.Id) return highest;
            if (!highest || playlist.Id > highest) return playlist.Id;
            return highest;
          }, undefined);
        }
      }

      if (playlistId && selectedMediaId && selectedMediaType) {
        await apiRequest("POST", "/api/playlists/contents/set", {
          contents: [
            {
              Id: 0,
              PlaylistId: playlistId,
              ContentId: selectedMediaId,
              Type: selectedMediaType === "template" ? "Template" : "Media",
              Index: 0,
            },
          ],
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedGroupId] });
      if (playlistId) {
        await queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId, "contents"] });
      }
      setName("");
      setSelectedColor(COLORS[2]);
      setShuffle(false);
      setMuteAudio(false);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save playlist");
    } finally {
      setIsSaving(false);
    }
  };

  const bg = isDark ? "bg-[#0d0d0d]" : "bg-white";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-[#c8d2e0]" : "text-gray-700";
  const textDim = isDark ? "text-[#64748b]" : "text-gray-500";
  const borderLight = isDark ? "border-[#2a2f36]" : "border-gray-200";
  const dividerHeavy = isDark ? "border-[#d1d5db]" : "border-[#d1d5db]";
  const inputBg = isDark ? "bg-[#111418]" : "bg-white";

  const ColorPickerGrid = ({ onPick }: { onPick: (c: string) => void }) => (
    <div className={`absolute z-50 mt-1 p-2 ${isDark ? "bg-[#1a1f25]" : "bg-white"} border ${borderLight} rounded shadow-lg grid grid-cols-8 gap-1.5`}>
      {COLORS.map((color) => (
        <button
          key={color}
          className={`w-6 h-6 rounded-sm ${selectedColor === color ? "ring-2 ring-[#42aade]" : "hover:scale-110"} transition-all`}
          style={{ backgroundColor: color }}
          onClick={() => { onPick(color); }}
          data-testid={`button-color-${color.replace("#", "")}`}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="add-playlist-modal-backdrop">
      <div
        className={`${bg} rounded-sm shadow-2xl w-[1200px] max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        data-testid="add-playlist-modal"
      >
        <div className="flex items-center justify-between px-8 py-5 flex-shrink-0">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative" ref={headerPickerRef}>
              <button
                className="w-8 h-8 rounded-sm shadow-sm cursor-pointer"
                style={{ backgroundColor: selectedColor }}
                onClick={() => setHeaderPickerOpen(!headerPickerOpen)}
                data-testid="playlist-color-preview"
              />
              {headerPickerOpen && (
                <ColorPickerGrid onPick={(c) => { setSelectedColor(c); setHeaderPickerOpen(false); }} />
              )}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              autoFocus
              className={`flex-1 min-w-0 bg-transparent text-4xl font-light tracking-[-0.9px] ${textPrimary} placeholder:${isDark ? "text-[#546e7a]" : "text-gray-400"} outline-none`}
              data-testid="input-playlist-name"
            />
          </div>

          <div className="flex items-center gap-6 flex-shrink-0">
            <button
              className="bg-[#2ca1da] hover:bg-[#2590c4] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm px-8 py-2.5 rounded shadow-sm transition-colors"
              onClick={handleOk}
              disabled={isSaving || !selectedGroupId || !name.trim()}
              data-testid="button-playlist-ok"
            >
              {isSaving ? "Saving..." : "OK"}
            </button>
            <button
              className={`${textDim} text-lg hover:opacity-80 transition-opacity`}
              onClick={onClose}
              data-testid="button-playlist-cancel"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="px-8 flex-shrink-0">
          <div className={`border-b-2 ${dividerHeavy}`} />
          {saveError && (
            <div className={`mt-3 text-sm ${isDark ? "text-red-400" : "text-red-600"}`} data-testid="text-playlist-save-error">
              {saveError}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-8 pt-8 pb-12">
          <div className="flex gap-10">
            {/* GENERAL COLUMN */}
            <div className="flex-1 min-w-0 space-y-8">
              <div>
                <div className={`border-b ${borderLight} pb-2 mb-4`}>
                  <h3 className={`text-base font-semibold ${textPrimary}`}>General</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className={`border-b ${borderLight} pb-1`}>
                      <span className={`text-sm ${textSecondary}`}>{user?.username || "—"}</span>
                    </div>
                    <span className={`text-xs ${textDim} block mt-1`}>Revised By</span>
                  </div>

                  <div>
                    <div className={`border-b ${borderLight} pb-1`}>
                      <span className={`text-sm ${textSecondary}`}>{dateLabel}</span>
                    </div>
                    <span className={`text-xs ${textDim} block mt-1`}>On</span>
                  </div>

                  <div>
                    <div className={`border-b ${borderLight} pb-1 flex items-center justify-between`}>
                      <div className="relative flex items-center gap-2" ref={generalPickerRef}>
                        <button
                          className="w-5 h-5 rounded-sm"
                          style={{ backgroundColor: selectedColor }}
                          onClick={() => setGeneralPickerOpen(!generalPickerOpen)}
                          data-testid="button-general-color"
                        />
                        <button
                          className={textDim}
                          onClick={() => setGeneralPickerOpen(!generalPickerOpen)}
                        >
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4z" /></svg>
                        </button>
                        {generalPickerOpen && (
                          <ColorPickerGrid onPick={(c) => { setSelectedColor(c); setGeneralPickerOpen(false); }} />
                        )}
                      </div>
                    </div>
                    <span className={`text-xs ${textDim} block mt-1`}>Color</span>
                  </div>
                </div>
              </div>

              <div>
                <div className={`border-b ${borderLight} pb-2 mb-4`}>
                  <h3 className={`text-base font-semibold ${textPrimary}`}>Playback Options</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className={`border-b ${borderLight} pb-1 flex items-center justify-between`}>
                      <span className={`text-sm ${textSecondary}`}>{priority}</span>
                      <svg className={`w-3 h-3 ${textDim}`} viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4z" /></svg>
                    </div>
                    <span className={`text-xs ${textDim} block mt-1`}>Give Priority To</span>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => setMuteAudio(!muteAudio)} data-testid="checkbox-mute-audio">
                    <div className={`w-4 h-4 rounded-sm border ${muteAudio ? "bg-[#42aade] border-[#42aade]" : isDark ? "border-[#546e7a]" : "border-gray-400"} flex items-center justify-center`}>
                      {muteAudio && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                    </div>
                    <span className={`text-sm ${textSecondary}`}>Mute Audio</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => setShuffle(!shuffle)} data-testid="checkbox-shuffle">
                    <div className={`w-4 h-4 rounded-sm border ${shuffle ? "bg-[#42aade] border-[#42aade]" : isDark ? "border-[#546e7a]" : "border-gray-400"} flex items-center justify-center`}>
                      {shuffle && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                    </div>
                    <span className={`text-sm ${textSecondary}`}>Shuffle</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ROLE COLUMN */}
            <div className="flex-1 min-w-0">
              <div className={`border-b ${borderLight} pb-2 mb-4`}>
                <h3 className={`text-base font-semibold ${textPrimary}`}>Role</h3>
              </div>

              <div className={`border ${borderLight} rounded`}>
                <div className={`grid grid-cols-2 border-b ${borderLight} ${isDark ? "bg-[#111418]" : "bg-gray-50"}`}>
                  <div className={`px-3 py-2 text-xs font-semibold ${textSecondary} border-r ${borderLight}`}>Users</div>
                  <div className={`px-3 py-2 text-xs font-semibold ${textSecondary}`}>Can see</div>
                </div>
                <div className={`grid grid-cols-2 border-b ${borderLight}`}>
                  <div className={`px-3 py-2 text-sm ${textSecondary} border-r ${borderLight}`}>{user?.username || "—"}</div>
                  <div className="px-3 py-2 flex items-center">
                    <button
                      className={`w-4 h-4 rounded-sm border ${canSee ? "bg-[#42aade] border-[#42aade]" : isDark ? "border-[#546e7a]" : "border-gray-400"} flex items-center justify-center`}
                      onClick={() => setCanSee(!canSee)}
                      data-testid="checkbox-can-see"
                    >
                      {canSee && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                    </button>
                  </div>
                </div>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={`grid grid-cols-2 ${i < 4 ? `border-b ${borderLight}` : ""}`}>
                    <div className={`px-3 py-2 text-sm border-r ${borderLight} ${isDark ? "text-[#2a2f36]" : "text-gray-200"}`}>&nbsp;</div>
                    <div className="px-3 py-2">&nbsp;</div>
                  </div>
                ))}
              </div>
              <div className={`text-xs ${textDim} mt-2`}>Define user visibility</div>
            </div>

            {/* RESTRICTIONS COLUMN */}
            <div className="flex-1 min-w-0">
              <div className={`border-b ${borderLight} pb-2 mb-4`}>
                <h3 className={`text-base font-semibold ${textPrimary}`}>Restrictions</h3>
              </div>

              <div className="space-y-5">
                <div>
                  <div className={`border-b ${borderLight} pb-1`}>
                    <input
                      type="number"
                      min="0"
                      value={maxContent}
                      onChange={(e) => setMaxContent(e.target.value)}
                      className={`w-full bg-transparent text-sm ${textSecondary} outline-none`}
                      data-testid="input-max-content"
                    />
                  </div>
                  <span className={`text-xs ${textDim} block mt-1`}>Maximum Number of Content Allowed</span>
                </div>

                <div>
                  <div className={`border-b ${borderLight} pb-1`}>
                    <input
                      type="text"
                      value={maxDuration}
                      onChange={(e) => setMaxDuration(e.target.value)}
                      placeholder="00:00:00"
                      className={`w-full bg-transparent text-sm ${textSecondary} outline-none`}
                      data-testid="input-max-duration"
                    />
                  </div>
                  <span className={`text-xs ${textDim} block mt-1`}>Maximum Duration</span>
                </div>

                <label className="flex items-center justify-between cursor-pointer pt-2" onClick={() => setShareOfVoice(!shareOfVoice)} data-testid="checkbox-share-of-voice">
                  <span className={`text-sm ${textSecondary}`}>Share of Voice</span>
                  <div className={`w-4 h-4 rounded-sm border ${shareOfVoice ? "bg-[#42aade] border-[#42aade]" : isDark ? "border-[#546e7a]" : "border-gray-400"} flex items-center justify-center`}>
                    {shareOfVoice && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
