import { useGroupSelection } from "@/hooks/use-group-selection";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon, VideoIcon, FileIcon, SearchIcon, LayoutTemplateIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useMediaSelection } from "@/hooks/use-media-selection";
import { API_BASE } from "@/lib/queryClient";

interface ContentItem {
  Id: number;
  Name: string;
  Duration?: number;
  Type?: string;
  MimeType?: string;
  ThumbnailUrl?: string;
  ThumbnailPath?: string;
  FileSize?: number;
  Width?: number;
  Height?: number;
  itemType: "media" | "template";
}

function getThumbnailUrl(item: ContentItem): string | undefined {
  const path = item.ThumbnailPath || item.ThumbnailUrl;
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `/api/thumbnail/${path}`;
}

function getMediaTypeLabel(item: ContentItem): string {
  if (item.itemType === "template") return "Template";
  const mime = (item.MimeType || item.Type || "").toLowerCase();
  if (mime.includes("image")) return "Image";
  if (mime.includes("video")) return "Video";
  return item.Type || "File";
}

function getMediaIcon(item: ContentItem) {
  if (item.itemType === "template") return <LayoutTemplateIcon className="w-8 h-8 text-indigo-300" />;
  const mime = (item.MimeType || item.Type || "").toLowerCase();
  if (mime.includes("image")) return <ImageIcon className="w-8 h-8 text-blue-300" />;
  if (mime.includes("video")) return <VideoIcon className="w-8 h-8 text-purple-300" />;
  return <FileIcon className="w-8 h-8 text-[#d1d5db]" />;
}

function formatDuration(tenths?: number): string {
  if (!tenths || tenths <= 0) return "";
  const seconds = Math.round(tenths / 10);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m${s}s` : `${m}m`;
}

export const ContentDisplaySection = (): JSX.Element => {
  const { selectedGroupId } = useGroupSelection();
  const { selectedMediaId, selectedMediaType, selectMedia } = useMediaSelection();
  const [search, setSearch] = useState("");

  const { data: mediasData, isLoading: mediasLoading } = useQuery({
    queryKey: ["/api/medias", selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return { medias: [] };
      const res = await fetch(`${API_BASE}/api/medias?groupId=${selectedGroupId}`, { credentials: "include" });
      if (res.status === 403) return { medias: [] };
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedGroupId,
    refetchInterval: 30000,
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/templates", selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return { templates: [] };
      const res = await fetch(`${API_BASE}/api/templates?groupId=${selectedGroupId}`, { credentials: "include" });
      if (res.status === 403) return { templates: [] };
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedGroupId,
    refetchInterval: 30000,
  });

  const isLoading = mediasLoading || templatesLoading;
  const allItems: ContentItem[] = [
    ...(mediasData?.medias || []).map((m: any) => ({ ...m, itemType: "media" as const })),
    ...(templatesData?.templates || []).map((t: any) => ({ ...t, itemType: "template" as const })),
  ];

  const items = search
    ? allItems.filter((m) => m.Name?.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  return (
    <section className="flex flex-col w-64 items-start bg-white border-r border-[#e5e7eb]">
      <div className="flex items-center gap-1.5 px-2 py-1.5 w-full border-b border-[#e5e7eb] bg-[#f9fafb]">
        <SearchIcon className="w-3.5 h-3.5 text-[#9ca3af]" />
        <input
          className="flex-1 h-6 text-xs border-0 p-0 bg-transparent text-[#1f2937] placeholder-[#9ca3af] focus:outline-none"
          placeholder="Search content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search-content"
        />
        {selectedGroupId && (
          <span className="text-[10px] text-[#9ca3af] flex-shrink-0" data-testid="text-content-count">{items.length}</span>
        )}
      </div>

      <div className="flex flex-col items-start gap-0 w-full overflow-y-auto flex-1">
        {!selectedGroupId && (
          <p className="text-xs text-[#9ca3af] py-8 text-center w-full">Select a group to browse content</p>
        )}
        {isLoading && selectedGroupId && (
          <div className="flex items-center justify-center py-8 w-full">
            <Loader2Icon className="w-5 h-5 text-[#9ca3af] animate-spin" />
          </div>
        )}
        {selectedGroupId && !isLoading && items.length === 0 && (
          <p className="text-xs text-[#9ca3af] py-8 text-center w-full">{search ? "No matching content" : "No content"}</p>
        )}
        {items.map((item) => {
          const isSelected = selectedMediaId === item.Id && selectedMediaType === item.itemType;
          const thumb = getThumbnailUrl(item);
          return (
            <div
              key={`${item.itemType}-${item.Id}`}
              className={`flex items-center gap-2 w-full px-2 py-2 cursor-pointer border-b border-[#f3f4f6] transition-colors ${isSelected ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}
              onClick={() => selectMedia(isSelected ? null : item.Id, isSelected ? null : item.itemType)}
              data-testid={`row-content-${item.itemType}-${item.Id}`}
            >
              <div className="w-[50px] h-[36px] bg-[#f3f4f6] rounded-sm overflow-hidden flex items-center justify-center flex-shrink-0">
                {thumb ? (
                  <img
                    className="w-full h-full object-cover"
                    alt={item.Name}
                    src={thumb}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div className={thumb ? "hidden" : "flex items-center justify-center"}>
                  {getMediaIcon(item)}
                </div>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs text-[#1f2937] truncate font-medium">{item.Name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#9ca3af]">{formatDuration(item.Duration)}</span>
                  <span className="text-[10px] text-[#d1d5db]">|</span>
                  <span className="text-[10px] text-[#9ca3af]">{getMediaTypeLabel(item)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
