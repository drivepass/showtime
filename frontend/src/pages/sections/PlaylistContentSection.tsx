import { ListMusicIcon, Loader2Icon, SettingsIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGroupSelection } from "@/hooks/use-group-selection";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useTheme } from "@/hooks/use-theme";
import { AddPlaylistModal } from "./AddPlaylistModal";
import { API_BASE } from "@/lib/queryClient";

interface Playlist {
  Id: number;
  Name: string;
  Duration?: number;
  ContentCount?: number;
}

interface PlaylistContent {
  Id: number;
  ContentId?: number;
  Index?: number;
  PlaylistId?: number;
  Type?: string;
}

interface ContentDetail {
  Id: number;
  Name?: string;
  ThumbnailPath?: string;
  Duration?: number;
  MimeType?: string;
  Type?: string;
}

function formatDuration(milliseconds?: number): string {
  if (!milliseconds || milliseconds <= 0) return "0s";
  const totalSeconds = Math.round(milliseconds / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s > 0 ? `${m}m${s}s` : `${m}m`;
}

function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="4" rx="0.5" />
      <rect x="9" y="1" width="6" height="4" rx="0.5" />
      <rect x="1" y="7" width="6" height="4" rx="0.5" />
      <rect x="9" y="7" width="6" height="4" rx="0.5" />
      <rect x="1" y="13" width="14" height="2" rx="0.5" />
    </svg>
  );
}

function MediaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 1h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2zm0 1.5a.5.5 0 00-.5.5v10a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V3a.5.5 0 00-.5-.5H4z" />
    </svg>
  );
}

function getContentTypeIcon(type?: string) {
  const ct = (type || "").toLowerCase();
  if (ct.includes("template")) return <TemplateIcon className="w-5 h-5 text-gray-500" />;
  return <MediaIcon className="w-5 h-5 text-gray-500" />;
}

function getTypeLabel(type?: string): string {
  const ct = (type || "").toLowerCase();
  if (ct.includes("template")) return "Template";
  return "Media";
}

function PlaylistContentRow({ content, detail, index }: { content: PlaylistContent; detail?: ContentDetail; index: number }) {
  const { t } = useTheme();
  const typeLabel = getTypeLabel(content.Type);
  const [imgError, setImgError] = useState(false);

  const thumbPath = detail?.ThumbnailPath;
  const thumbUrl = thumbPath ? (thumbPath.startsWith("http") ? thumbPath : `/api/thumbnail/${thumbPath}`) : undefined;
  const displayName = detail?.Name || `Content ${index + 1}`;

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 ${t.hoverBg} transition-colors cursor-pointer border-b ${t.borderSubtle}`}
      data-testid={`row-playlist-content-${content.Id || index}`}
    >
      <div className={`w-[48px] h-[34px] ${t.cardBg} rounded overflow-hidden flex-shrink-0 flex items-center justify-center`}>
        {thumbUrl && !imgError ? (
          <img
            src={thumbUrl}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          getContentTypeIcon(content.Type)
        )}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className={`text-[12px] ${t.textSecondary} leading-tight font-medium break-words`}>{displayName}</span>
        <div className="flex items-center gap-1 mt-0.5">
          {detail?.Duration != null && (
            <span className={`text-[10px] ${t.textDim}`}>{formatDuration(detail.Duration)}</span>
          )}
          <span className={`text-[10px] ${t.textFaint}`}>·</span>
          <span className={`text-[10px] ${t.textDim}`}>{typeLabel}</span>
        </div>
      </div>
    </div>
  );
}

function PlaylistItem({ playlist }: { playlist: Playlist }) {
  const [expanded, setExpanded] = useState(true);
  const { t } = useTheme();

  const { data: contentsData, isLoading } = useQuery({
    queryKey: ["/api/playlists", playlist.Id, "contents"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/playlists/${playlist.Id}/contents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch playlist contents");
      return res.json();
    },
    enabled: expanded,
  });

  const contents: PlaylistContent[] = contentsData?.contents || [];

  const templateIds = useMemo(() => contents.filter(c => c.Type === "Template" && c.ContentId).map(c => c.ContentId!), [contents]);
  const mediaIds = useMemo(() => contents.filter(c => c.Type !== "Template" && c.ContentId).map(c => c.ContentId!), [contents]);

  const { data: templateDetails } = useQuery({
    queryKey: ["/api/templates/details", templateIds],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/templates/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: templateIds }),
      });
      if (!res.ok) return { templates: [] };
      return res.json();
    },
    enabled: templateIds.length > 0,
  });

  const { data: mediaDetails } = useQuery({
    queryKey: ["/api/medias/details", mediaIds],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/medias/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: mediaIds }),
      });
      if (!res.ok) return { medias: [] };
      return res.json();
    },
    enabled: mediaIds.length > 0,
  });

  const detailLookup = useMemo(() => {
    const map = new Map<number, ContentDetail>();
    for (const t of (templateDetails?.templates || [])) {
      map.set(t.Id, t);
    }
    for (const m of (mediaDetails?.medias || [])) {
      map.set(m.Id, m);
    }
    return map;
  }, [templateDetails, mediaDetails]);

  const totalDuration = contents.reduce((sum, c) => {
    const detail = c.ContentId ? detailLookup.get(c.ContentId) : undefined;
    return sum + (detail?.Duration || 0);
  }, 0);

  return (
    <div>
      <div className="px-3 pt-3 pb-1">
        <span className={`text-sm font-bold ${t.textPrimary} uppercase`} data-testid={`text-playlist-name-${playlist.Id}`}>
          {playlist.Name}
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-3 pb-2">
        <span className={`text-[11px] ${t.textDim}`}>{formatDuration(totalDuration)}</span>
        <span className={`text-[11px] ${t.textFaint}`}>·</span>
        <span className={`text-[11px] ${t.textDim}`}>CONTENT</span>
        <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#2997cc] text-white text-[10px] font-bold">{contents.length}</span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-3">
          <Loader2Icon className={`w-3 h-3 ${t.textFaint} animate-spin`} />
        </div>
      )}

      {contents.map((content, index) => (
        <PlaylistContentRow
          key={content.Id || index}
          content={content}
          detail={content.ContentId ? detailLookup.get(content.ContentId) : undefined}
          index={index}
        />
      ))}
    </div>
  );
}

export const PlaylistContentSection = (): JSX.Element => {
  const { selectedGroupId, selectedGroupName } = useGroupSelection();
  const { t } = useTheme();
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);

  const { data: playlistsData, isLoading } = useQuery({
    queryKey: ["/api/playlists", selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return { playlists: [] };
      const res = await fetch(`${API_BASE}/api/playlists?groupId=${selectedGroupId}`, { credentials: "include" });
      if (res.status === 403) return { playlists: [] };
      if (!res.ok) throw new Error("Failed to fetch playlists");
      return res.json();
    },
    enabled: !!selectedGroupId,
    refetchInterval: 30000,
  });

  const playlists: Playlist[] = playlistsData?.playlists || [];
  const playlistIds = useMemo(() => playlists.map((playlist) => playlist.Id).filter((id) => Number.isFinite(id) && id > 0), [playlists]);

  const { data: playlistDetailsData } = useQuery({
    queryKey: ["/api/playlists/details", playlistIds],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/playlists/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: playlistIds }),
      });
      if (!res.ok) return { playlists: [] };
      return res.json();
    },
    enabled: playlistIds.length > 0,
  });

  const mergedPlaylists = useMemo(() => {
    const detailLookup = new Map<number, Playlist>();
    for (const playlist of (playlistDetailsData?.playlists || [])) {
      detailLookup.set(playlist.Id, playlist);
    }
    return playlists.map((playlist) => detailLookup.get(playlist.Id) || playlist);
  }, [playlistDetailsData, playlists]);

  return (
    <aside className={`flex flex-col w-[280px] h-full ${t.panelBg} border-l-2 border-l-[#2997cc] border-r ${t.border}`}>
      <header className={`flex h-10 items-center justify-between px-3 ${t.panelBg} border-b ${t.border}`}>
        <div className="flex items-center gap-1.5">
          <ListMusicIcon className={`w-3.5 h-3.5 ${t.textDim}`} />
          <span className={`text-[11px] font-medium ${t.textDim} tracking-[0.3px] uppercase`} data-testid="text-playlists-header">
            PLAYLISTS
          </span>
        </div>
        <button
          className={`px-2 py-0.5 text-[10px] ${t.textDim} border ${t.borderAccent} rounded ${t.hoverBg} transition-colors`}
          onClick={() => setShowAddPlaylist(true)}
          data-testid="button-add-playlist"
        >
          + PLAYLIST
        </button>
      </header>

      <div className={`flex h-7 items-center justify-between px-3 ${t.panelBg} border-b ${t.border}`}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {selectedGroupName ? (
            <Badge className="bg-[#2997cc] hover:bg-[#2997cc] text-white text-[10px] font-medium px-2 py-0 h-[18px]" data-testid="badge-group-name">
              {selectedGroupName}
            </Badge>
          ) : (
            <span className={`text-[10px] ${t.textFaint} italic`}>Select a group</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button className={`p-0.5 ${t.hoverBg} rounded`} data-testid="button-playlist-search">
            <svg className={`w-3.5 h-3.5 ${t.textDim}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="5" /><line x1="11" y1="11" x2="14" y2="14" /></svg>
          </button>
          <button className={`p-0.5 ${t.hoverBg} rounded`} data-testid="button-playlist-grid">
            <svg className={`w-3.5 h-3.5 ${t.textDim}`} viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" /><rect x="9" y="1" width="6" height="6" /><rect x="1" y="9" width="6" height="6" /><rect x="9" y="9" width="6" height="6" /></svg>
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {!selectedGroupId && (
          <p className={`text-[11px] ${t.textFaint} px-3 py-6 text-center`}>Select a group</p>
        )}
        {isLoading && selectedGroupId && (
          <div className="flex items-center justify-center py-6">
            <Loader2Icon className={`w-4 h-4 ${t.textFaint} animate-spin`} />
          </div>
        )}
        {selectedGroupId && !isLoading && mergedPlaylists.length === 0 && (
          <p className={`text-[11px] ${t.textFaint} px-3 py-6 text-center`}>No playlists</p>
        )}
        {mergedPlaylists.map((playlist) => (
          <PlaylistItem key={playlist.Id} playlist={playlist} />
        ))}
      </ScrollArea>

      <div className={`flex items-center justify-center py-2 border-t ${t.border}`}>
        <SettingsIcon className={`w-3.5 h-3.5 ${t.textFaint}`} />
      </div>

      <AddPlaylistModal isOpen={showAddPlaylist} onClose={() => setShowAddPlaylist(false)} />
    </aside>
  );
};
