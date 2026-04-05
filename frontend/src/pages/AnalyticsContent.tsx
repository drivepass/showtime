import { TopNavigationBarSection } from "./sections/TopNavigationBarSection";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { GroupSelectionProvider } from "@/hooks/use-group-selection";
import { PlayerSelectionProvider } from "@/hooks/use-player-selection";
import { MediaSelectionProvider } from "@/hooks/use-media-selection";
import { SearchIcon, ChevronDownIcon, ChevronRightIcon, Loader2Icon, DownloadIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { API_BASE } from "@/lib/queryClient";

interface PlayerGroup {
  Id: number;
  Name: string;
  children?: PlayerGroup[];
}

interface ContentRow {
  name: string;
  type: string;
  duration: number;
  groupName: string;
  groupId: number;
}

function GroupTreeItem({ group, level, selectedId, onSelect }: { group: PlayerGroup; level: number; selectedId: number | null; onSelect: (id: number) => void }) {
  const [expanded, setExpanded] = useState(level === 0);
  const { t, isDark } = useTheme();
  const hasChildren = group.children && group.children.length > 0;
  const isSelected = selectedId === group.Id;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer text-[11px] ${isSelected ? (isDark ? "bg-[#1a2a3a]" : "bg-blue-50") : ""} ${isDark ? "hover:bg-[#1a2a3a]/50" : "hover:bg-gray-50"} transition-colors`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={() => { onSelect(group.Id); if (hasChildren) setExpanded(!expanded); }}
        data-testid={`analytics-group-${group.Id}`}
      >
        {hasChildren ? (
          expanded ? <ChevronDownIcon className={`w-3 h-3 ${t.textDim} flex-shrink-0`} /> : <ChevronRightIcon className={`w-3 h-3 ${t.textDim} flex-shrink-0`} />
        ) : <div className="w-3 flex-shrink-0" />}
        <svg className={`w-3 h-3 ${isSelected ? "text-[#2997cc]" : t.textDim} flex-shrink-0`} viewBox="0 0 16 14" fill="currentColor">
          <path d="M6 0L8 2H16V14H0V0H6Z" />
        </svg>
        <span className={`truncate ${isSelected ? (isDark ? "text-[#2997cc]" : "text-blue-600") : (isDark ? "text-[#c8d2e0]" : "text-gray-700")}`}>{group.Name}</span>
      </div>
      {expanded && hasChildren && group.children!.map(child => (
        <GroupTreeItem key={child.Id} group={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function findGroupName(groups: PlayerGroup[], id: number): string {
  for (const g of groups) {
    if (g.Id === id) return g.Name;
    if (g.children) {
      const found = findGroupName(g.children, id);
      if (found) return found;
    }
  }
  return "";
}

function AnalyticsContentPage() {
  const { t, isDark } = useTheme();
  const [, setLocation] = useLocation();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [contentSearch, setContentSearch] = useState("");
  const [aggregation, setAggregation] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const { data: groupsData } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: mediasData, isLoading: mediasLoading } = useQuery({
    queryKey: ["/api/medias", selectedGroupId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/medias?groupId=${selectedGroupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/templates", selectedGroupId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/templates?groupId=${selectedGroupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ["/api/playlists", selectedGroupId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/playlists?groupId=${selectedGroupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  const { data: playersData } = useQuery({
    queryKey: ["/api/players"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/players", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const groups: PlayerGroup[] = groupsData?.groups || [];
  const isLoading = mediasLoading || templatesLoading || playlistsLoading;

  const allContent: ContentRow[] = useMemo(() => {
    const rows: ContentRow[] = [];
    const groupName = selectedGroupId ? findGroupName(groups, selectedGroupId) : "";

    (mediasData?.medias || []).forEach((m: any) => {
      rows.push({
        name: m.Name || m.FileName || "Untitled",
        type: m.Type || m.MediaType || "Media",
        duration: m.Duration || 0,
        groupName,
        groupId: m.GroupId || selectedGroupId || 0,
      });
    });

    (templatesData?.templates || []).forEach((t: any) => {
      rows.push({
        name: t.Name || "Untitled",
        type: "Template",
        duration: t.Duration || 0,
        groupName,
        groupId: t.GroupId || selectedGroupId || 0,
      });
    });

    (playlistsData?.playlists || []).forEach((p: any) => {
      rows.push({
        name: p.Name || "Untitled",
        type: "Playlist",
        duration: p.Duration || 0,
        groupName,
        groupId: p.GroupId || selectedGroupId || 0,
      });
    });

    return rows;
  }, [mediasData, templatesData, playlistsData, groups, selectedGroupId]);

  const filteredContent = useMemo(() => {
    let rows = allContent;
    if (typeFilter !== "All") {
      rows = rows.filter(r => r.type.toLowerCase().includes(typeFilter.toLowerCase()));
    }
    if (contentSearch) {
      const q = contentSearch.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
    }
    return rows;
  }, [allContent, typeFilter, contentSearch]);

  const players = playersData?.players || [];
  const groupPlayers = selectedGroupId ? players.filter((p: any) => p.GroupId === selectedGroupId) : [];

  const stats = useMemo(() => {
    const totalItems = filteredContent.length;
    const totalDuration = filteredContent.reduce((acc, r) => acc + (r.duration || 0), 0);
    const types = new Set(filteredContent.map(r => r.type));
    return { totalItems, totalDuration, uniqueTypes: types.size, playerCount: groupPlayers.length };
  }, [filteredContent, groupPlayers]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(allContent.map(r => r.type));
    return Array.from(types).sort();
  }, [allContent]);

  return (
    <div className={`${t.pageBg} w-full min-w-[1728px] min-h-screen flex flex-col ${t.textPrimary}`}>
      <TopNavigationBarSection activeTab="analytics" />

      <div className="flex flex-1 overflow-hidden">
        <aside className={`w-[256px] ${isDark ? "bg-[#0e1620]" : "bg-white"} border-r ${t.border} flex flex-col flex-shrink-0`}>
          <div className={`flex items-center gap-2 px-3 py-3 border-b ${t.border}`}>
            <svg className={`w-3 h-3 ${t.textDim}`} viewBox="0 0 16 14" fill="currentColor">
              <path d="M6 0L8 2H16V14H0V0H6Z" />
            </svg>
            <span className={`text-[11px] font-medium ${t.textDim} uppercase tracking-wider`}>Player Groups</span>
          </div>

          <div className={`px-2 py-2 border-b ${t.border}`}>
            <div className={`flex items-center ${isDark ? "bg-[#121a24]" : "bg-gray-50"} rounded px-2 py-1.5 gap-2`}>
              <SearchIcon className={`w-3 h-3 ${t.textDim}`} />
              <input
                type="text"
                placeholder="Search groups"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className={`bg-transparent text-[11px] ${isDark ? "text-[#c8d2e0] placeholder:text-[#546e7a]" : "text-gray-700 placeholder:text-gray-400"} outline-none flex-1`}
                data-testid="input-search-analytics"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {groups.map(group => (
              <GroupTreeItem key={group.Id} group={group} level={0} selectedId={selectedGroupId} onSelect={setSelectedGroupId} />
            ))}
          </ScrollArea>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex items-center border-b ${t.border}`}>
            <button className={`px-6 py-3 text-[13px] font-medium border-b-2 border-[#2997cc] ${isDark ? "text-white" : "text-gray-900"}`} data-testid="tab-content-displayed">
              Content Displayed
            </button>
            <button
              className={`px-6 py-3 text-[13px] font-medium border-b-2 border-transparent ${t.textDim} ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors`}
              onClick={() => setLocation("/analytics/audience")}
              data-testid="tab-audience"
            >
              Audience
            </button>
          </div>

          {selectedGroupId && (
            <div className={`grid grid-cols-4 gap-4 px-4 py-4 border-b ${t.border}`}>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded-lg p-3`}>
                <p className={`text-[10px] uppercase font-bold ${t.textDim}`}>Total Items</p>
                <p className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"} mt-1`} data-testid="stat-total-items">{stats.totalItems}</p>
              </div>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded-lg p-3`}>
                <p className={`text-[10px] uppercase font-bold ${t.textDim}`}>Total Duration</p>
                <p className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"} mt-1`} data-testid="stat-total-duration">{formatDuration(stats.totalDuration)}</p>
              </div>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded-lg p-3`}>
                <p className={`text-[10px] uppercase font-bold ${t.textDim}`}>Content Types</p>
                <p className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"} mt-1`} data-testid="stat-types">{stats.uniqueTypes}</p>
              </div>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded-lg p-3`}>
                <p className={`text-[10px] uppercase font-bold ${t.textDim}`}>Players in Group</p>
                <p className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"} mt-1`} data-testid="stat-players">{stats.playerCount}</p>
              </div>
            </div>
          )}

          <div className={`flex flex-wrap items-center gap-4 px-4 py-3 border-b ${t.border}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold uppercase ${isDark ? "text-[#c8d2e0]" : "text-gray-700"}`}>Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`text-[11px] ${isDark ? "bg-[#121a24] text-[#c8d2e0] border-[#1e2e3e]" : "bg-white text-gray-700 border-gray-200"} border rounded px-2 py-1 outline-none`}
                data-testid="select-type-filter"
              >
                <option value="All">All</option>
                {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <span className={`text-[11px] ${t.textDim}`}>Filter</span>
              <div className={`flex items-center ${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-white border-gray-200"} border rounded px-2 py-1.5 gap-2`}>
                <input
                  type="text"
                  placeholder="Search content..."
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  className={`bg-transparent text-[11px] ${isDark ? "text-[#c8d2e0] placeholder:text-[#546e7a]" : "text-gray-700 placeholder:text-gray-400"} outline-none w-48`}
                  data-testid="input-search-content"
                />
                <SearchIcon className={`w-3 h-3 ${t.textDim}`} />
              </div>
            </div>

            <span className={`text-[11px] ${t.textDim}`}>{filteredContent.length} items</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px]">
              <thead className={`sticky top-0 z-10 ${isDark ? "bg-[#0e1620]" : "bg-white"}`}>
                <tr className={`border-b ${t.border}`}>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"}`}>#</th>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Content</th>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Type</th>
                  <th className={`text-right px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Duration</th>
                  <th className={`text-right px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Group</th>
                </tr>
              </thead>
              <tbody>
                {!selectedGroupId ? (
                  <tr>
                    <td colSpan={5} className={`text-center py-20 ${t.textFaint} text-sm`}>
                      Select a group from the sidebar to view content data
                    </td>
                  </tr>
                ) : isLoading ? (
                  <tr>
                    <td colSpan={5} className={`text-center py-20 ${t.textFaint} text-sm`}>
                      <div className="flex items-center justify-center gap-2">
                        <Loader2Icon className="w-4 h-4 animate-spin" />
                        Loading content...
                      </div>
                    </td>
                  </tr>
                ) : filteredContent.length > 0 ? (
                  filteredContent.map((row, i) => (
                    <tr key={i} className={`border-b ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"} ${isDark ? "hover:bg-[#1a2a3a]/30" : "hover:bg-gray-50"}`}>
                      <td className={`px-4 py-2.5 ${isDark ? "text-[#546e7a]" : "text-gray-400"} w-12`}>{i + 1}</td>
                      <td className={`px-4 py-2.5 ${isDark ? "text-[#c8d2e0]" : "text-gray-800"} border-l ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"}`} data-testid={`text-content-name-${i}`}>
                        {row.name}
                      </td>
                      <td className={`px-4 py-2.5 border-l ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"}`}>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.type === "Template" ? (isDark ? "bg-purple-900/30 text-purple-300" : "bg-purple-100 text-purple-700") :
                          row.type === "Playlist" ? (isDark ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-700") :
                          (isDark ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-700")
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-right ${isDark ? "text-[#8a9bb0]" : "text-gray-600"} border-l ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"}`}>
                        {formatDuration(row.duration)}
                      </td>
                      <td className={`px-4 py-2.5 text-right ${isDark ? "text-[#8a9bb0]" : "text-gray-600"} border-l ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"}`}>
                        {row.groupName}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={`text-center py-20 ${t.textFaint} text-sm`}>
                      No content found for the selected criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsContent() {
  return (
    <ThemeProvider>
      <GroupSelectionProvider>
        <PlayerSelectionProvider>
          <MediaSelectionProvider>
            <AnalyticsContentPage />
          </MediaSelectionProvider>
        </PlayerSelectionProvider>
      </GroupSelectionProvider>
    </ThemeProvider>
  );
}
