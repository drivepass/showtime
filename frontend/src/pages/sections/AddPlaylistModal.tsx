import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useGroupSelection } from "@/hooks/use-group-selection";
import { apiRequest, queryClient, API_BASE } from "@/lib/queryClient";
import { useMediaSelection } from "@/hooks/use-media-selection";
import { useQuery } from "@tanstack/react-query";

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
  const { t, isDark } = useTheme();
  const { user } = useAuth();
  const { selectedGroupName, selectedGroupId } = useGroupSelection();
  const { selectedMediaId, selectedMediaType } = useMediaSelection();
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[2]);
  const [shuffle, setShuffle] = useState(false);
  const [fitToSlot, setFitToSlot] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedContentEndpoint = selectedMediaType === "template" ? "/api/templates/details" : "/api/medias/details";
  const { data: selectedContentData } = useQuery({
    queryKey: [selectedContentEndpoint, selectedMediaId, "playlist-create-preview"],
    queryFn: async () => {
      const res = await fetch(API_BASE + selectedContentEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [selectedMediaId] }),
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedMediaId && !!selectedMediaType && isOpen,
  });

  const selectedContentItem = selectedMediaType === "template"
    ? selectedContentData?.templates?.[0]
    : selectedContentData?.medias?.[0];

  if (!isOpen) return null;

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
            FitToSlot: fitToSlot,
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
      setFitToSlot(false);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save playlist");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="add-playlist-modal-backdrop">
      <div
        className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded-sm shadow-2xl w-[1200px] max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        data-testid="add-playlist-modal"
      >
        <div className="flex items-center justify-between px-8 py-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div
              className="w-8 h-8 rounded-sm shadow-sm"
              style={{ backgroundColor: selectedColor }}
              data-testid="playlist-color-preview"
            />
            <h1 className={`text-4xl font-light tracking-[-0.9px] ${isDark ? "text-white" : "text-gray-900"}`} data-testid="text-playlist-title">
              {name || "Name"}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <button
              className="bg-[#2ca1da] hover:bg-[#2590c4] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm px-8 py-2.5 rounded shadow-sm transition-colors"
              onClick={handleOk}
              disabled={isSaving || !selectedGroupId || !name.trim()}
              data-testid="button-playlist-ok"
            >
              {isSaving ? "Saving..." : "OK"}
            </button>
            <button
              className={`${isDark ? "text-[#64748b]" : "text-gray-500"} text-lg hover:opacity-80 transition-opacity`}
              onClick={onClose}
              data-testid="button-playlist-cancel"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="px-8 flex-shrink-0">
          <div className={`border-b-2 ${isDark ? "border-[#d1d5db]" : "border-[#d1d5db]"}`} />
          {saveError && (
            <div className={`mt-3 text-sm ${isDark ? "text-red-400" : "text-red-600"}`} data-testid="text-playlist-save-error">
              {saveError}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-8 pt-8 pb-12">
          <div className="flex gap-12">
            <div className="w-[347px] flex-shrink-0 space-y-10">
              <div>
                <div className={`border-b ${isDark ? "border-[#e5e7eb]" : "border-[#e5e7eb]"} pb-2 mb-4`}>
                  <h3 className={`text-base ${isDark ? "text-white" : "text-gray-900"}`}>General</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className={`border-b ${isDark ? "border-[#e5e7eb]" : "border-gray-200"} pb-1`}>
                      <span className={`text-sm font-medium ${isDark ? "text-[#c8d2e0]" : "text-gray-700"}`}>
                        {user?.username || "—"}
                      </span>
                    </div>
                    <span className={`text-base font-medium ${isDark ? "text-white" : "text-gray-900"} block mt-0.5`}>Revised By</span>
                  </div>

                  <div>
                    <div className={`border-b ${isDark ? "border-[#e5e7eb]" : "border-gray-200"} pb-1`}>
                      <span className={`text-sm font-medium ${isDark ? "text-[#c8d2e0]" : "text-gray-700"}`}>Professional</span>
                    </div>
                  </div>

                  <div>
                    <div className={`border-b ${isDark ? "border-[#e5e7eb]" : "border-gray-200"} pb-1`}>
                      <span className={`text-sm font-medium ${isDark ? "text-[#c8d2e0]" : "text-gray-700"}`}>
                        {selectedGroupName || "—"}
                      </span>
                    </div>
                    <span className={`text-base font-medium ${isDark ? "text-white" : "text-gray-900"} block mt-0.5`}>Group</span>
                  </div>

                  <div>
                    <div className={`border-b ${isDark ? "border-[#e5e7eb]" : "border-gray-200"} pb-1`}>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter playlist name"
                        autoFocus
                        className={`w-full bg-transparent text-sm font-medium ${isDark ? "text-[#c8d2e0] placeholder:text-[#546e7a]" : "text-gray-700 placeholder:text-gray-400"} outline-none`}
                        data-testid="input-playlist-name"
                      />
                    </div>
                    <span className={`text-base font-medium ${isDark ? "text-white" : "text-gray-900"} block mt-0.5`}>Name</span>
                  </div>
                </div>
              </div>

              <div>
                <div className={`border-b ${isDark ? "border-[#e5e7eb]" : "border-gray-200"} pb-2 mb-4`}>
                  <h3 className={`text-base ${isDark ? "text-white" : "text-gray-900"}`}>Options</h3>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => setShuffle(!shuffle)} data-testid="checkbox-shuffle">
                    <div className={`w-4 h-4 rounded-sm border ${shuffle ? "bg-[#42aade] border-[#42aade]" : isDark ? "border-[#546e7a]" : "border-gray-400"} flex items-center justify-center`}>
                      {shuffle && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                    </div>
                    <span className={`text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-700"}`}>Shuffle</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => setFitToSlot(!fitToSlot)} data-testid="checkbox-fit-to-slot">
                    <div className={`w-4 h-4 rounded-sm border ${fitToSlot ? "bg-[#42aade] border-[#42aade]" : isDark ? "border-[#546e7a]" : "border-gray-400"} flex items-center justify-center`}>
                      {fitToSlot && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                    </div>
                    <span className={`text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-700"}`}>Fit to slot</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="w-[347px] flex-shrink-0 space-y-10">
              <div>
                <div className={`border-b ${isDark ? "border-[#e5e7eb]" : "border-gray-200"} pb-2 mb-4`}>
                  <h3 className={`text-base ${isDark ? "text-white" : "text-gray-900"}`}>Color</h3>
                </div>

                <div className="grid grid-cols-8 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-sm transition-all ${selectedColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#0d0d0d]" : "hover:scale-110"}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      data-testid={`button-color-${color.replace("#", "")}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className={`border-b ${isDark ? "border-[#e5e7eb]" : "border-gray-200"} pb-2 mb-4`}>
                <h3 className={`text-base ${isDark ? "text-white" : "text-gray-900"}`}>Contents</h3>
              </div>

              <div className={`h-[350px] border ${isDark ? "border-[#e5e7eb]" : "border-gray-200"} rounded p-4`}>
                {selectedContentItem ? (
                  <div className={`rounded border ${isDark ? "border-[#1f2228] bg-[#111827]" : "border-gray-200 bg-gray-50"} p-4`} data-testid="selected-playlist-content-preview">
                    <div className={`text-xs uppercase ${isDark ? "text-[#546e7a]" : "text-gray-500"}`}>Selected content</div>
                    <div className={`mt-2 text-base font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{selectedContentItem.Name}</div>
                    <div className={`mt-1 text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-600"}`}>
                      {selectedMediaType === "template" ? "Template" : selectedContentItem.Type || "Media"}
                    </div>
                    <div className={`mt-3 text-xs ${isDark ? "text-[#94a3b8]" : "text-gray-500"}`}>
                      This item will be added as the first playlist content when you click OK.
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center px-6">
                    <span className={`text-sm ${isDark ? "text-[#546e7a]" : "text-gray-400"}`}>
                      Select a media or template from the content library first if you want to add an initial playlist item.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
