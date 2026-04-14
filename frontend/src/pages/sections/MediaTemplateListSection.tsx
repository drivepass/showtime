import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGroupSelection } from "@/hooks/use-group-selection";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SearchIcon, Loader2Icon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useMediaSelection } from "@/hooks/use-media-selection";
import { useTheme } from "@/hooks/use-theme";
import { useLocation } from "wouter";
import { API_BASE, fetchWithRetry } from "@/lib/queryClient";
import { AddContentModal, UploadFileModal } from "./AddContentModals";

interface Folder {
  Id: number;
  Name: string;
  ParentFolderId?: number;
  Type?: number;
}

interface FolderNode {
  folder: Folder;
  children: FolderNode[];
}

interface ContentItem {
  Id: number;
  Name: string;
  Duration?: number;
  Type?: any;
  MediaType?: any;
  MimeType?: string;
  FileName?: string;
  Filename?: string;
  Url?: string;
  FilePath?: string;
  ThumbnailPath?: string;
  ThumbnailUrl?: string;
  FileSize?: number;
  FolderId?: number;
  itemType: "media" | "template" | "feed";
}

const VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv|webm|m4v|wmv|flv|mpg|mpeg|ts)$/i;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|bmp|webp|svg|tiff?)$/i;

function detectMediaKind(item: { MimeType?: string; Type?: any; MediaType?: any; FileName?: string; Filename?: string; Url?: string; FilePath?: string; ThumbnailPath?: string; ThumbnailUrl?: string; Name?: string; }): "video" | "image" | "unknown" {
  const rawType = item.MediaType ?? item.Type;
  if (typeof rawType === "number") {
    if (rawType === 1) return "video";
    if (rawType === 2) return "image";
  }
  const sourceCandidates = [item.FileName, item.Filename, item.Url, item.FilePath, item.Name];
  for (const candidate of sourceCandidates) {
    if (!candidate) continue;
    if (VIDEO_EXTENSIONS.test(candidate)) return "video";
    if (IMAGE_EXTENSIONS.test(candidate)) return "image";
  }
  const mime = String(item.MimeType || "").toLowerCase();
  if (mime.includes("video")) return "video";
  if (mime.includes("image")) return "image";
  const typeStr = String(rawType || "").toLowerCase();
  if (typeStr.includes("video")) return "video";
  if (typeStr.includes("image") || typeStr.includes("picture") || typeStr.includes("photo")) return "image";
  return "unknown";
}

interface SelectedFilter {
  folderId: number;
  folderType: number;
  label: string;
  filterKey?: string;
}

function buildFolderTree(folders: Folder[]): FolderNode[] {
  const map = new Map<number, FolderNode>();
  const roots: FolderNode[] = [];
  folders.forEach((f) => map.set(f.Id, { folder: f, children: [] }));
  folders.forEach((f) => {
    const node = map.get(f.Id)!;
    if (f.ParentFolderId && map.has(f.ParentFolderId)) {
      map.get(f.ParentFolderId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

const INDENT = 18;

function TreeLineConnectors({ continuations, isLast }: { continuations: boolean[]; isLast: boolean }) {
  const { t } = useTheme();
  const depth = continuations.length;
  if (depth === 0) return null;
  return (
    <div className="flex flex-shrink-0" style={{ width: `${depth * INDENT}px` }}>
      {continuations.map((continues, i) => {
        const isCurrentLevel = i === depth - 1;
        return (
          <div key={i} className="relative flex-shrink-0" style={{ width: `${INDENT}px`, height: "100%" }}>
            {isCurrentLevel ? (
              <>
                <div className="absolute" style={{ left: "7px", top: 0, width: "1px", height: isLast ? "50%" : "100%", backgroundColor: t.treeLine }} />
                <div className="absolute" style={{ left: "7px", top: "50%", width: `${INDENT - 7}px`, height: "1px", backgroundColor: t.treeLine }} />
              </>
            ) : continues ? (
              <div className="absolute" style={{ left: "7px", top: 0, width: "1px", height: "100%", backgroundColor: t.treeLine }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function FolderTreeItem({ node, continuations, isLast, selectedFolderId, onSelectFolder, folderType }: { node: FolderNode; continuations: boolean[]; isLast: boolean; selectedFolderId: number | null; onSelectFolder: (filter: SelectedFilter | null) => void; folderType: number }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTheme();
  const hasChildren = node.children.length > 0;
  const isSelected = selectedFolderId === node.folder.Id;
  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center min-h-[26px] ${isSelected ? t.selectedBg : t.hoverBg} transition-colors cursor-pointer`}
        onClick={() => onSelectFolder(isSelected ? null : { folderId: node.folder.Id, folderType, label: node.folder.Name })}
        data-testid={`button-folder-${node.folder.Id}`}
      >
        <TreeLineConnectors continuations={continuations} isLast={isLast} />
        {hasChildren ? (
          <button
            className={`w-[14px] h-[14px] border ${t.checkboxBorder} bg-transparent ${t.textDim} flex items-center justify-center text-[10px] font-bold leading-none flex-shrink-0 mr-1.5`}
            style={{ fontFamily: "monospace" }}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? "−" : "+"}
          </button>
        ) : (
          <span className="w-[14px] flex-shrink-0 mr-1.5" />
        )}
        <span className={`font-['Inter',Helvetica] font-normal ${isSelected ? "text-[#2997cc] font-medium" : t.textMuted} text-xs leading-4 truncate`}>
          {node.folder.Name}
        </span>
      </div>
      {expanded && node.children.map((child, idx) => (
        <FolderTreeItem
          key={child.folder.Id}
          node={child}
          continuations={[...continuations, !isLast]}
          isLast={idx === node.children.length - 1}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          folderType={folderType}
        />
      ))}
    </div>
  );
}

function getThumbnailUrl(item: ContentItem): string | undefined {
  const path = item.ThumbnailPath || item.ThumbnailUrl;
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${API_BASE}/api/thumbnail/${encodeURIComponent(path)}`;
}

function MediaThumbnailCard({ item }: { item: ContentItem }) {
  const { selectedMediaId, selectedMediaType, selectMedia } = useMediaSelection();
  const { t } = useTheme();
  const isSelected = selectedMediaId === item.Id && selectedMediaType === item.itemType;
  const thumb = getThumbnailUrl(item);
  const mediaKind = detectMediaKind(item);
  const isVideo = mediaKind === "video";
  const duration = item.Duration && item.Duration > 0 ? `${Math.floor(item.Duration / 1000)}s` : "";
  const typeLabel = item.itemType === "template"
    ? "Template"
    : item.itemType === "feed"
      ? "Data Feed"
      : mediaKind === "video"
        ? "Video"
        : mediaKind === "image"
          ? "Image"
          : "Media";
  const [imgError, setImgError] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("mediaItem", JSON.stringify({
      Id: item.Id,
      Name: item.Name,
      Type: item.itemType,
      Duration: item.Duration,
    }));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      className={`cursor-pointer rounded overflow-hidden ${isSelected ? "ring-1 ring-[#2997cc]" : ""}`}
      onClick={() => selectMedia(isSelected ? null : item.Id, isSelected ? null : item.itemType, isSelected ? null : item)}
      draggable={true}
      onDragStart={handleDragStart}
      data-testid={`card-media-${item.itemType}-${item.Id}`}
    >
      <div className={`relative w-full aspect-[16/10] ${t.cardBg} overflow-hidden flex items-center justify-center rounded`}>
        {thumb && !imgError ? (
          <img
            className="w-full h-full object-cover"
            alt={item.Name}
            src={thumb}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center justify-center">
            {isVideo ? (
              <svg className="w-12 h-12 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            ) : (
              <svg className="w-10 h-10 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><path d="m21 15-5-5L5 21" /></svg>
            )}
          </div>
        )}
        {isVideo && thumb && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-black/30 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        )}
      </div>
      <div className="py-1.5 px-0.5">
        <p className={`text-[12px] ${t.textPrimary} font-semibold leading-tight break-words`} data-testid={`text-media-name-${item.Id}`}>{item.Name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] ${t.textDim}`}>{duration}</span>
          {duration && <span className={`text-[10px] ${t.textFaint}`}>|</span>}
          <span className={`text-[10px] ${t.textDim}`}>{typeLabel}</span>
        </div>
      </div>
    </div>
  );
}

function SidebarClickableItem({ name, isSelected, onClick, continuations, isLast, hasChildren, children }: {
  name: string;
  isSelected: boolean;
  onClick: () => void;
  continuations: boolean[];
  isLast: boolean;
  hasChildren?: boolean;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTheme();

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center min-h-[26px] ${isSelected ? t.selectedBg : t.hoverBg} transition-colors cursor-pointer`}
        onClick={onClick}
      >
        <TreeLineConnectors continuations={continuations} isLast={isLast} />
        {hasChildren ? (
          <button
            className={`w-[14px] h-[14px] border ${t.checkboxBorder} bg-transparent ${t.textDim} flex items-center justify-center text-[10px] font-bold leading-none flex-shrink-0 mr-1.5`}
            style={{ fontFamily: "monospace" }}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? "−" : "+"}
          </button>
        ) : (
          <span className="w-[14px] flex-shrink-0 mr-1.5" />
        )}
        <span className={`font-['Inter',Helvetica] font-normal ${isSelected ? "text-[#2997cc] font-medium" : t.textMuted} text-xs leading-4 truncate`}>
          {name}
        </span>
      </div>
      {expanded && hasChildren && children}
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false, onClick, isClickable = false, isActive = false }: { title: string; children?: React.ReactNode; defaultOpen?: boolean; onClick?: () => void; isClickable?: boolean; isActive?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useTheme();

  const handleClick = () => {
    if (isClickable && onClick) {
      onClick();
    } else {
      setOpen(!open);
    }
  };

  return (
    <div className={`border-b ${t.border} flex-shrink-0`}>
      <button
        className={`flex items-center w-full px-3 py-2 ${isActive ? "bg-[#2997cc]/10" : ""} ${t.hoverBg} transition-colors text-left`}
        onClick={handleClick}
        data-testid={`button-section-${title.toLowerCase().replace(/\s/g, '-')}`}
      >
        <span className={`font-['Inter',Helvetica] font-semibold ${isActive ? "text-[#2997cc]" : "text-[#2997cc]"} text-xs leading-4 uppercase`}>
          {title}
        </span>
      </button>
      {!isClickable && open && (
        <div className="max-h-[200px] overflow-y-auto pb-1">
          {children}
        </div>
      )}
    </div>
  );
}

export const MediaTemplateListSection = (): JSX.Element => {
  const { selectedGroupId, selectedGroupName } = useGroupSelection();
  const { t, isDark } = useTheme();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<SelectedFilter | null>(null);
  const [addMediaDropdownOpen, setAddMediaDropdownOpen] = useState(false);
  const [contentModalType, setContentModalType] = useState<"url" | "video" | "hdmi" | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const addMediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedFilter(null);
  }, [selectedGroupId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMediaRef.current && !addMediaRef.current.contains(e.target as Node)) {
        setAddMediaDropdownOpen(false);
      }
    }
    if (addMediaDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [addMediaDropdownOpen]);

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ["/api/folders", selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return { folders: [] };
      const res = await fetchWithRetry(`${API_BASE}/api/folders?groupId=${selectedGroupId}`, { credentials: "include" });
      if (res.status === 403) return { folders: [] };
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
    enabled: !!selectedGroupId,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: contentWindowData, isLoading: contentWindowLoading } = useQuery({
    queryKey: ["/api/content-window", selectedGroupId, selectedFilter?.filterKey || selectedFilter?.folderId, selectedFilter?.folderType],
    queryFn: async () => {
      if (!selectedGroupId || !selectedFilter) return null;
      const res = await fetchWithRetry(`${API_BASE}/api/content-window`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: selectedGroupId,
          folderId: selectedFilter.folderId,
          folderType: selectedFilter.folderType,
        }),
      });
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("Failed to fetch content window");
      return res.json();
    },
    enabled: !!selectedGroupId && !!selectedFilter,
    refetchInterval: 30000,
  });

  const { data: defaultContentData, isLoading: defaultContentLoading } = useQuery({
    queryKey: ["/api/content-default", selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return null;
      const res = await fetchWithRetry(`${API_BASE}/api/content-window`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId: selectedGroupId,
          folderId: 0,
          folderType: 1,
        }),
      });
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("Failed to fetch default content window");
      return res.json();
    },
    enabled: !!selectedGroupId && !selectedFilter,
    refetchInterval: 30000,
  });

  const folders: Folder[] = foldersData?.folders || [];
  const folderTree = buildFolderTree(folders);

  const activeContent = selectedFilter ? contentWindowData : defaultContentData;
  const allMedia: ContentItem[] = activeContent
    ? [
        ...(activeContent.medias || []).map((m: any) => ({ ...m, itemType: "media" as const })),
        ...(activeContent.templates || []).map((tt: any) => ({ ...tt, itemType: "template" as const })),
        ...(activeContent.feeds || []).map((f: any) => ({ ...f, itemType: "feed" as const })),
        ...(activeContent.banners || []).map((b: any) => ({ ...b, itemType: "template" as const })),
      ]
    : [];
  const contentLoading = selectedFilter ? contentWindowLoading : defaultContentLoading;

  const handleSelectFilter = (filter: SelectedFilter | null) => {
    if (filter && selectedFilter) {
      const currentKey = selectedFilter.filterKey || `${selectedFilter.folderId}-${selectedFilter.folderType}`;
      const newKey = filter.filterKey || `${filter.folderId}-${filter.folderType}`;
      if (currentKey === newKey) {
        setSelectedFilter(null);
        return;
      }
    }
    setSelectedFilter(filter);
  };

  const tickersItems = [
    { name: "Published", folderId: -1, folderType: 1, filterKey: "tickers-published" },
    { name: "Not published", folderId: -2, folderType: 1, filterKey: "tickers-notpublished" },
  ];

  const triggersItems = [
    { name: "Published", folderId: -3, folderType: 1, filterKey: "triggers-published" },
    { name: "Not published", folderId: -4, folderType: 1, filterKey: "triggers-notpublished" },
  ];

  const smartFoldersItems = [
    { name: "Tagged", folderId: -11, folderType: 1, filterKey: "smart-tagged" },
    { name: "Untagged", folderId: -12, folderType: 1, filterKey: "smart-untagged" },
    { name: "To be approved", folderId: -13, folderType: 1, filterKey: "smart-toapprove" },
    { name: "Expired", folderId: -14, folderType: 1, filterKey: "smart-expired" },
    { name: "Edited last month", folderId: -15, folderType: 1, filterKey: "smart-editedlastmonth", children: [
      { name: "Sajid Hafesjee", folderId: 46962, folderType: 3, filterKey: "smart-sajid" },
    ]},
  ];

  return (
    <div className={`flex flex-col flex-shrink-0 h-full border-r ${t.border}`}>
      <header className={`${isDark ? "bg-[#0e1620]" : t.panelBg2} border-b ${t.border} flex items-center flex-shrink-0`} style={{ height: "36px", padding: "0 12px", gap: "8px" }}>
        <svg className={`w-4 h-4 ${t.textDim} flex-shrink-0`} viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>
        <span className={`text-[11px] ${t.textMuted} font-medium whitespace-nowrap`}>CONTENT</span>
        <div className="flex items-center gap-2">
          <div className="relative" ref={addMediaRef}>
            <button
              className={`inline-flex items-center px-2 text-[10px] ${t.textMuted} border ${t.borderAccent} rounded ${t.hoverBg} transition-colors whitespace-nowrap m-0`}
              style={{ height: "24px" }}
              data-testid="button-add-media"
              onClick={() => setAddMediaDropdownOpen(!addMediaDropdownOpen)}
            >
              + MEDIA
            </button>
            {addMediaDropdownOpen && (
              <div className={`absolute top-full left-0 mt-1 ${isDark ? "bg-[#1a2a3a]" : "bg-white"} border ${t.border} rounded shadow-lg z-50 min-w-[140px]`} data-testid="dropdown-add-media">
                <button
                  className={`w-full text-left px-3 py-1.5 text-[11px] ${t.textMuted} ${t.hoverBg} transition-colors`}
                  onClick={() => { setShowUploadModal(true); setAddMediaDropdownOpen(false); }}
                  data-testid="button-upload-file"
                >
                  Upload File
                </button>
                <button
                  className={`w-full text-left px-3 py-1.5 text-[11px] ${t.textMuted} ${t.hoverBg} transition-colors`}
                  onClick={() => { setContentModalType("url"); setAddMediaDropdownOpen(false); }}
                  data-testid="button-add-url"
                >
                  Add URL
                </button>
                <button
                  className={`w-full text-left px-3 py-1.5 text-[11px] ${t.textMuted} ${t.hoverBg} transition-colors`}
                  onClick={() => { setContentModalType("video"); setAddMediaDropdownOpen(false); }}
                  data-testid="button-add-video-stream"
                >
                  Add Video Stream
                </button>
                <button
                  className={`w-full text-left px-3 py-1.5 text-[11px] ${t.textMuted} ${t.hoverBg} transition-colors`}
                  onClick={() => { setContentModalType("hdmi"); setAddMediaDropdownOpen(false); }}
                  data-testid="button-add-hdmi-input"
                >
                  Add HDMI Input
                </button>
              </div>
            )}
          </div>
          <button className={`inline-flex items-center px-2 text-[10px] ${t.textMuted} border ${t.borderAccent} rounded ${t.hoverBg} transition-colors whitespace-nowrap m-0`} style={{ height: "24px" }} onClick={() => setLocation("/template-designer")} data-testid="button-add-template">+ TEMPLATE</button>
        </div>
        <button className="ml-auto inline-flex items-center px-2.5 text-[10px] text-white bg-[#2997cc] rounded hover:bg-[#2587b8] transition-colors gap-1 whitespace-nowrap m-0" style={{ height: "24px" }} onClick={() => setLocation("/ai-content-studio")} data-testid="button-ai-studio">
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l1.5 4.5L12 6l-4.5 1.5L6 12 4.5 7.5 0 6l4.5-1.5z" /></svg>
          AI CONTENT STUDIO
        </button>
      </header>

      <nav className={`h-7 flex items-center px-2 ${isDark ? "bg-[#121a24]" : t.panelBg} border-b ${t.border} flex-shrink-0`}>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {selectedGroupName ? (
            <>
              <span className={`font-['Inter',Helvetica] font-normal ${t.textDim} text-[10px] leading-4 truncate max-w-[70px]`}>
                {selectedGroupName?.slice(0, 12)}...
              </span>
              <Badge className="bg-[#2997cc] hover:bg-[#2997cc] text-white h-[16px] px-1.5 rounded font-['Inter',Helvetica] font-normal text-[9px]">
                Professional
              </Badge>
            </>
          ) : (
            <span className={`text-[10px] ${t.textFaint} italic`}>Select a group</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button className={`p-0.5 ${t.hoverBg} rounded`}><SearchIcon className={`w-3 h-3 ${t.textDim}`} /></button>
          <button className={`p-0.5 ${t.hoverBg} rounded`}>
            <svg className={`w-3 h-3 ${t.textDim}`} viewBox="0 0 12 12" fill="currentColor"><path d="M0 1h12v1.5H0zM0 5.25h12v1.5H0zM0 9.5h12v1.5H0z" /></svg>
          </button>
          <button className={`p-0.5 ${t.hoverBg} rounded`}>
            <svg className={`w-3 h-3 ${t.textDim}`} viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="0" width="5" height="5" /><rect x="7" y="0" width="5" height="5" /><rect x="0" y="7" width="5" height="5" /><rect x="7" y="7" width="5" height="5" /></svg>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 min-h-0">
        <aside className={`w-[200px] flex flex-col ${isDark ? "bg-[#121a24]" : t.panelBg} border-r ${t.border}`}>
          <ScrollArea className="flex-1">
            <CollapsibleSection title="MEDIA & TEMPLATES" defaultOpen={true}>
              {foldersLoading && selectedGroupId && (
                <p className={`text-xs ${t.textFaint} px-4 py-2 text-center`}>Loading...</p>
              )}
              {folderTree.length > 0 ? (
                <div className="flex flex-col pb-1">
                  {folderTree.map((node, idx) => (
                    <FolderTreeItem
                      key={node.folder.Id}
                      node={node}
                      continuations={[true]}
                      isLast={idx === folderTree.length - 1}
                      selectedFolderId={selectedFilter?.folderId ?? null}
                      onSelectFolder={handleSelectFilter}
                      folderType={1}
                    />
                  ))}
                </div>
              ) : !foldersLoading && selectedGroupId ? (
                <p className={`text-xs ${t.textFaint} px-4 py-2 text-center`}>No folders</p>
              ) : null}
            </CollapsibleSection>

            <CollapsibleSection
              title="DATAFEED"
              onClick={() => handleSelectFilter({ folderId: -5, folderType: 1, label: "Datafeed", filterKey: "datafeed" })}
              isClickable={true}
              isActive={selectedFilter?.filterKey === "datafeed"}
            />

            <CollapsibleSection title="TICKERS">
              {tickersItems.map((item, idx) => (
                <SidebarClickableItem
                  key={item.filterKey}
                  name={item.name}
                  isSelected={selectedFilter?.filterKey === item.filterKey}
                  onClick={() => handleSelectFilter({ folderId: item.folderId, folderType: item.folderType, label: item.name, filterKey: item.filterKey })}
                  continuations={[true]}
                  isLast={idx === tickersItems.length - 1}
                />
              ))}
            </CollapsibleSection>

            <CollapsibleSection title="TRIGGERS">
              {triggersItems.map((item, idx) => (
                <SidebarClickableItem
                  key={item.filterKey}
                  name={item.name}
                  isSelected={selectedFilter?.filterKey === item.filterKey}
                  onClick={() => handleSelectFilter({ folderId: item.folderId, folderType: item.folderType, label: item.name, filterKey: item.filterKey })}
                  continuations={[true]}
                  isLast={idx === triggersItems.length - 1}
                />
              ))}
            </CollapsibleSection>

            <CollapsibleSection title="SMART FOLDERS">
              {smartFoldersItems.map((item, idx) => (
                <SidebarClickableItem
                  key={item.filterKey}
                  name={item.name}
                  isSelected={selectedFilter?.filterKey === item.filterKey}
                  onClick={() => handleSelectFilter({ folderId: item.folderId, folderType: item.folderType, label: item.name, filterKey: item.filterKey })}
                  continuations={[true]}
                  isLast={idx === smartFoldersItems.length - 1}
                  hasChildren={!!item.children}
                >
                  {item.children?.map((child, cidx) => (
                    <SidebarClickableItem
                      key={child.filterKey}
                      name={child.name}
                      isSelected={selectedFilter?.filterKey === child.filterKey}
                      onClick={() => handleSelectFilter({ folderId: child.folderId, folderType: child.folderType, label: child.name, filterKey: child.filterKey })}
                      continuations={[true, true]}
                      isLast={cidx === (item.children!.length - 1)}
                    />
                  ))}
                </SidebarClickableItem>
              ))}
            </CollapsibleSection>
          </ScrollArea>
        </aside>

        <ScrollArea className={`w-[300px] ${isDark ? "bg-[#0e1620]" : t.panelBg2}`}>
          <div className="flex flex-col gap-4 p-3">
            {selectedFilter && (
              <div className="flex items-center justify-between">
                <span className={`text-[10px] ${t.textDim} font-medium`}>
                  {selectedFilter.label}
                </span>
                <button
                  className={`text-[10px] text-[#2997cc] hover:underline`}
                  onClick={() => setSelectedFilter(null)}
                  data-testid="button-clear-folder-filter"
                >
                  Clear
                </button>
              </div>
            )}
            {!selectedGroupId && (
              <p className={`text-xs ${t.textFaint} py-8 text-center`}>Select a group</p>
            )}
            {contentLoading && selectedGroupId && (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className={`w-4 h-4 ${t.textFaint} animate-spin`} />
              </div>
            )}
            {!contentLoading && allMedia.length > 0 ? (
              allMedia.map((item) => (
                <MediaThumbnailCard key={`${item.itemType}-${item.Id}`} item={item} />
              ))
            ) : !contentLoading && selectedGroupId ? (
              <p className={`text-xs ${t.textFaint} py-8 text-center`}>No content</p>
            ) : null}
          </div>
        </ScrollArea>
      </div>

      {contentModalType && (
        <AddContentModal
          isOpen={true}
          onClose={() => {
            setContentModalType(null);
            queryClient.invalidateQueries({ queryKey: ["/api/content-window"], refetchType: "all" });
            queryClient.invalidateQueries({ queryKey: ["/api/content-default"], refetchType: "all" });
          }}
          type={contentModalType}
        />
      )}
      <UploadFileModal isOpen={showUploadModal} onClose={() => {
        setShowUploadModal(false);
        queryClient.invalidateQueries({ queryKey: ["/api/content-window"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["/api/content-default"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["/api/folders"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["/api/medias"], refetchType: "all" });
      }} />
    </div>
  );
};
