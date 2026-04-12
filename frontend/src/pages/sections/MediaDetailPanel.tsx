import { useMediaSelection } from "@/hooks/use-media-selection";
import { useQuery, useMutation } from "@tanstack/react-query";
import { XIcon, ImageIcon, VideoIcon, FileIcon, Loader2Icon, LayoutTemplateIcon, PencilIcon, TrashIcon, CopyIcon, CheckIcon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useGroupSelection } from "@/hooks/use-group-selection";
import { queryClient, API_BASE } from "@/lib/queryClient";
import { useState } from "react";

interface DetailItem {
  Id: number;
  Name: string;
  Duration?: number;
  Type?: string;
  MimeType?: string;
  ThumbnailUrl?: string;
  ThumbnailPath?: string;
  BigThumbnailUrl?: string;
  BigThumbnailPath?: string;
  FileSize?: number;
  Size?: number;
  Width?: number;
  Height?: number;
  FolderId?: number;
  CreatedDate?: string;
  ModifiedDate?: string;
  Enabled?: boolean;
  [key: string]: any;
}

function getThumbnail(item: DetailItem): string | undefined {
  const path = item.BigThumbnailPath || item.BigThumbnailUrl || item.ThumbnailPath || item.ThumbnailUrl;
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${API_BASE}/api/thumbnail/${encodeURIComponent(path)}`;
}

function getFileSize(item: DetailItem): number | undefined {
  const sizeKB = item.Size;
  if (sizeKB && sizeKB > 0) return sizeKB * 1024;
  return item.FileSize || item.Filesize;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv|webm|m4v|wmv|flv|mpg|mpeg|ts)$/i;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|bmp|webp|svg|tiff?)$/i;

function detectMediaKind(item: DetailItem): "video" | "image" | "unknown" {
  const rawType = (item as any).MediaType ?? item.Type;
  if (typeof rawType === "number") {
    if (rawType === 1) return "video";
    if (rawType === 2) return "image";
  }
  const sourceCandidates = [item.FileName, item.Filename, item.Url, item.FilePath, item.Name];
  for (const candidate of sourceCandidates) {
    if (!candidate) continue;
    if (VIDEO_EXTENSIONS.test(String(candidate))) return "video";
    if (IMAGE_EXTENSIONS.test(String(candidate))) return "image";
  }
  const mime = String(item.MimeType || "").toLowerCase();
  if (mime.includes("video")) return "video";
  if (mime.includes("image")) return "image";
  const typeStr = String(rawType || "").toLowerCase();
  if (typeStr.includes("video")) return "video";
  if (typeStr.includes("image") || typeStr.includes("picture") || typeStr.includes("photo")) return "image";
  return "unknown";
}

function formatDuration(milliseconds?: number): string {
  if (!milliseconds || milliseconds <= 0) return "N/A";
  const totalSeconds = Math.floor(milliseconds / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function parseDurationToCentiseconds(val: string): number {
  const parts = val.split(":").map(Number);
  let seconds = 0;
  if (parts.length === 3) seconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  else if (parts.length === 2) seconds = (parts[0] * 60) + parts[1];
  else seconds = parseInt(val) || 15;
  return seconds * 1000;
}

function formatCentisecondsToTime(milliseconds?: number): string {
  if (!milliseconds || milliseconds <= 0) return "00:00:15";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MediaDetailPanel() {
  const { selectedMediaId, selectedMediaType, selectedItem, selectMedia } = useMediaSelection();
  const { t, isDark } = useTheme();
  const { selectedGroupId } = useGroupSelection();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState("00:00:15");
  const [editEnabled, setEditEnabled] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isFeed = selectedMediaType === "feed";
  const endpoint = selectedMediaType === "template" ? "/api/templates/details" : "/api/medias/details";

  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint, selectedMediaId],
    queryFn: async () => {
      const res = await fetch(API_BASE + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ids: [selectedMediaId] }) });
      if (!res.ok) throw new Error("Failed to fetch details");
      return res.json();
    },
    enabled: !!selectedMediaId && !!selectedMediaType && !isFeed,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ name, duration, enabled }: { name: string; duration: string; enabled: boolean }) => {
      const durationCentiseconds = parseDurationToCentiseconds(duration);
      const url = selectedMediaType === "template" ? "/api/templates/set" : "/api/medias/set";
      const key = selectedMediaType === "template" ? "templates" : "medias";
      const payload = { Id: selectedMediaId, Name: name, Duration: durationCentiseconds, Enabled: enabled };
      const res = await fetch(API_BASE + url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: [payload] }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      setActionSuccess("Saved successfully");
      setTimeout(() => setActionSuccess(null), 2500);
      queryClient.invalidateQueries({ queryKey: [endpoint, selectedMediaId] });
      queryClient.invalidateQueries({ queryKey: ["/api/medias"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-window"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-default", selectedGroupId] });
    },
    onError: (err: any) => setActionError(err.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const url = selectedMediaType === "template" ? "/api/templates/delete" : "/api/medias/delete";
      const key = selectedMediaType === "template" ? "templates" : "medias";
      const res = await fetch(API_BASE + url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: [{ Id: selectedMediaId }] }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      selectMedia(null);
      queryClient.invalidateQueries({ queryKey: ["/api/medias"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-window"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-default", selectedGroupId] });
    },
    onError: (err: any) => {
      setShowDeleteConfirm(false);
      setActionError(err.message || "Failed to delete");
    },
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId) throw new Error("No group selected");
      const url = selectedMediaType === "template" ? "/api/templates/copy" : "/api/medias/copy";
      const res = await fetch(API_BASE + url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idList: [selectedMediaId], groupId: selectedGroupId, folderId: 0 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to copy");
      }
      return res.json();
    },
    onSuccess: () => {
      setActionSuccess("Copied to current group");
      setTimeout(() => setActionSuccess(null), 2500);
      queryClient.invalidateQueries({ queryKey: ["/api/medias"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-default", selectedGroupId] });
    },
    onError: (err: any) => setActionError(err.message || "Failed to copy"),
  });

  if (!selectedMediaId) return null;

  if (isFeed && selectedItem) {
    const feedThumb = getThumbnail(selectedItem);
    const feedMime = (selectedItem.MimeType || selectedItem.Type || "").toLowerCase();
    return (
      <div className={`fixed right-0 top-0 h-full w-80 ${t.panelBg} shadow-xl border-l ${t.border} z-50 flex flex-col`}>
        <div className={`flex items-center justify-between p-3 border-b ${t.border}`}>
          <h3 className={`text-sm font-semibold ${t.textSecondary}`}>DATA FEED DETAILS</h3>
          <button onClick={() => selectMedia(null)} className={`p-1 rounded ${t.hoverBg} transition-colors`} data-testid="button-close-feed-detail">
            <XIcon className={`w-4 h-4 ${t.textDim}`} />
          </button>
        </div>
        <div className="flex flex-col overflow-y-auto flex-1">
          <div className={`h-40 ${t.cardBg} flex items-center justify-center relative`}>
            {feedThumb ? (
              <img src={feedThumb} alt={selectedItem.Name} className="max-h-full max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <FileIcon className={`w-12 h-12 ${t.textFaint}`} />
            )}
          </div>
          <div className="p-3 flex flex-col gap-4">
            <div>
              <div className={`text-[10px] font-semibold ${t.textDim} uppercase mb-1`}>Name</div>
              <div className={`text-sm font-medium ${t.textPrimary}`}>{selectedItem.Name || "—"}</div>
            </div>
            <div>
              <div className={`text-[10px] font-semibold ${t.textDim} uppercase mb-1`}>Type</div>
              <div className={`text-sm ${t.textPrimary}`}>Data Feed</div>
            </div>
            {selectedItem.Type && (
              <div>
                <div className={`text-[10px] font-semibold ${t.textDim} uppercase mb-1`}>Feed Type</div>
                <div className={`text-sm ${t.textPrimary}`}>{selectedItem.Type}</div>
              </div>
            )}
            {selectedItem.Duration && selectedItem.Duration > 0 && (
              <div>
                <div className={`text-[10px] font-semibold ${t.textDim} uppercase mb-1`}>Duration</div>
                <div className={`text-sm ${t.textPrimary}`}>{formatDuration(selectedItem.Duration)}</div>
              </div>
            )}
            {selectedItem.Id && (
              <div>
                <div className={`text-[10px] font-semibold ${t.textDim} uppercase mb-1`}>ID</div>
                <div className={`text-sm ${t.textPrimary} font-mono`}>{selectedItem.Id}</div>
              </div>
            )}
            {feedMime && (
              <div>
                <div className={`text-[10px] font-semibold ${t.textDim} uppercase mb-1`}>MIME Type</div>
                <div className={`text-sm ${t.textPrimary}`}>{feedMime}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const items = selectedMediaType === "template" ? data?.templates : data?.medias;
  const item: DetailItem | undefined = items?.[0];
  const mediaKind = item ? detectMediaKind(item) : "unknown";
  const isTemplate = selectedMediaType === "template";
  const thumbnail = item ? getThumbnail(item) : undefined;
  const fileSize = item ? getFileSize(item) : undefined;

  const handleStartEdit = () => {
    if (!item) return;
    setEditName(item.Name || "");
    setEditDuration(formatCentisecondsToTime(item.Duration));
    setEditEnabled(item.Enabled !== false);
    setIsEditing(true);
    setActionError(null);
  };

  const labelClass = `text-[10px] font-semibold ${t.textDim} uppercase`;
  const valueClass = `text-sm ${t.textPrimary}`;
  const inputClass = `w-full bg-transparent border-b ${isDark ? "border-[#334155]" : "border-[#e2e8f0]"} text-sm ${t.textPrimary} outline-none pb-1 focus:border-[#2997cc]`;

  return (
    <div className={`fixed right-0 top-0 h-full w-80 ${t.panelBg} shadow-xl border-l ${t.border} z-50 flex flex-col`}>
      <div className={`flex items-center justify-between p-3 border-b ${t.border}`}>
        <h3 className={`text-sm font-semibold ${t.textSecondary}`} data-testid="text-media-detail-header">
          {isTemplate ? "TEMPLATE DETAILS" : "MEDIA DETAILS"}
        </h3>
        <button onClick={() => selectMedia(null)} className={`p-1 rounded ${t.hoverBg} transition-colors`} data-testid="button-close-media-detail">
          <XIcon className={`w-4 h-4 ${t.textDim}`} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className={`w-6 h-6 ${t.textFaint} animate-spin`} />
        </div>
      )}

      {error && !isLoading && (
        <div className="flex items-center justify-center py-12 px-4">
          <p className="text-[11px] text-red-400 text-center">Failed to load details</p>
        </div>
      )}

      {item && (
        <div className="flex flex-col overflow-y-auto flex-1">
          <div className={`h-40 ${t.cardBg} flex items-center justify-center relative`}>
            {thumbnail ? (
              <img src={thumbnail} alt={item.Name} className="max-h-full max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : null}
            <div className={thumbnail ? "hidden" : "flex items-center justify-center"}>
              {isTemplate ? <LayoutTemplateIcon className={`w-12 h-12 ${t.textFaint}`} /> : mediaKind === "image" ? <ImageIcon className={`w-12 h-12 ${t.textFaint}`} /> : mediaKind === "video" ? <VideoIcon className={`w-12 h-12 ${t.textFaint}`} /> : <FileIcon className={`w-12 h-12 ${t.textFaint}`} />}
            </div>
          </div>

          {(actionError || actionSuccess) && (
            <div className={`px-3 py-2 text-[11px] font-medium ${actionSuccess ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>
              {actionSuccess || actionError}
            </div>
          )}

          <div className="flex items-center gap-1 px-3 pt-3 pb-1">
            {!isEditing ? (
              <button
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium ${t.textMuted} border ${t.borderAccent} rounded ${t.hoverBg} transition-colors`}
                onClick={handleStartEdit}
                data-testid="button-edit-media"
              >
                <PencilIcon className="w-3 h-3" /> Edit
              </button>
            ) : (
              <>
                <button
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-[#2997cc] rounded hover:bg-[#2587b8] transition-colors disabled:opacity-50"
                  onClick={() => saveMutation.mutate({ name: editName, duration: editDuration, enabled: editEnabled })}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-media"
                >
                  <CheckIcon className="w-3 h-3" /> {saveMutation.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  className={`px-2 py-1 text-[10px] font-medium ${t.textMuted} ${t.hoverBg} rounded transition-colors`}
                  onClick={() => setIsEditing(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium ${t.textMuted} border ${t.borderAccent} rounded ${t.hoverBg} transition-colors ml-auto`}
              onClick={() => copyMutation.mutate()}
              disabled={copyMutation.isPending || !selectedGroupId}
              title="Copy to current group"
              data-testid="button-copy-media"
            >
              <CopyIcon className="w-3 h-3" /> {copyMutation.isPending ? "..." : "Copy"}
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-400 border border-red-400/30 rounded hover:bg-red-500/10 transition-colors"
              onClick={() => { setShowDeleteConfirm(true); setActionError(null); }}
              data-testid="button-delete-media"
            >
              <TrashIcon className="w-3 h-3" /> Delete
            </button>
          </div>

          {showDeleteConfirm && (
            <div className={`mx-3 mb-2 p-3 rounded border ${isDark ? "border-red-500/30 bg-red-900/20" : "border-red-200 bg-red-50"}`}>
              <p className={`text-[11px] ${t.textSecondary} mb-2`}>Delete <span className="font-semibold">{item.Name}</span>? This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 text-[10px] font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
                <button
                  className={`px-3 py-1 text-[10px] font-medium ${t.textMuted} ${t.hoverBg} rounded transition-colors`}
                  onClick={() => setShowDeleteConfirm(false)}
                  data-testid="button-cancel-delete"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="p-3 space-y-3">
            <div>
              <label className={labelClass}>Name</label>
              {isEditing ? (
                <input
                  className={inputClass}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Media name"
                  data-testid="input-edit-name"
                />
              ) : (
                <p className={valueClass} data-testid="text-detail-name">{item.Name}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Duration</label>
              {isEditing ? (
                <input
                  className={inputClass}
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  placeholder="00:00:15"
                  data-testid="input-edit-duration"
                />
              ) : (
                <p className={valueClass}>{formatDuration(item.Duration)}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setEditEnabled(!editEnabled)} data-testid="checkbox-edit-enabled">
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${editEnabled ? "bg-[#2997cc] border-transparent" : isDark ? "border-[#475569]" : "border-[#d1d5db]"}`}>
                  {editEnabled && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-sm ${t.textSecondary}`}>Enabled</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Type</label>
                <p className={valueClass}>{isTemplate ? "Template" : mediaKind === "video" ? "Video" : mediaKind === "image" ? "Image" : "Media"}</p>
              </div>
              {!isTemplate && (
                <div>
                  <label className={labelClass}>Size</label>
                  <p className={valueClass}>{formatFileSize(fileSize)}</p>
                </div>
              )}
            </div>

            {(item.Width || item.Height) && (
              <div>
                <label className={labelClass}>Dimensions</label>
                <p className={valueClass}>{item.Width} x {item.Height}</p>
              </div>
            )}

            <div>
              <label className={labelClass}>ID</label>
              <p className={valueClass}>{item.Id}</p>
            </div>

            {item.CreatedDate && (
              <div>
                <label className={labelClass}>Created</label>
                <p className={valueClass}>{item.CreatedDate}</p>
              </div>
            )}

            {item.Enabled !== undefined && !isEditing && (
              <div>
                <label className={labelClass}>Status</label>
                <p className={`text-sm font-medium ${item.Enabled !== false ? "text-green-400" : "text-red-400"}`}>
                  {item.Enabled !== false ? "Enabled" : "Disabled"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
