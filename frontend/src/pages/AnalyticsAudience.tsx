import { TopNavigationBarSection } from "./sections/TopNavigationBarSection";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { GroupSelectionProvider } from "@/hooks/use-group-selection";
import { PlayerSelectionProvider } from "@/hooks/use-player-selection";
import { MediaSelectionProvider } from "@/hooks/use-media-selection";
import { SearchIcon, ChevronDownIcon, ChevronRightIcon, Loader2Icon, MonitorIcon } from "lucide-react";
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

interface Player {
  Id: number;
  Name: string;
  GroupId: number;
  Active: boolean;
  LastConnection?: string;
  Version?: string;
  Resolution?: string;
  IpAddress?: string;
  MacAddress?: string;
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
        data-testid={`audience-group-${group.Id}`}
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

function AnalyticsAudiencePage() {
  const { t, isDark } = useTheme();
  const [, setLocation] = useLocation();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: groupsData } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/players"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/players", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: mediasData } = useQuery({
    queryKey: ["/api/medias", selectedGroupId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/medias?groupId=${selectedGroupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  const { data: templatesData } = useQuery({
    queryKey: ["/api/templates", selectedGroupId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/templates?groupId=${selectedGroupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  const { data: playlistsData } = useQuery({
    queryKey: ["/api/playlists", selectedGroupId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/playlists?groupId=${selectedGroupId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  const groups: PlayerGroup[] = groupsData?.groups || [];
  const allPlayers: Player[] = playersData?.players || [];

  const groupPlayers = useMemo(() => {
    let players = selectedGroupId ? allPlayers.filter(p => p.GroupId === selectedGroupId) : allPlayers;
    if (statusFilter === "Active") players = players.filter(p => p.Active);
    if (statusFilter === "Inactive") players = players.filter(p => !p.Active);
    if (playerSearch) {
      const q = playerSearch.toLowerCase();
      players = players.filter(p => p.Name?.toLowerCase().includes(q));
    }
    return players;
  }, [allPlayers, selectedGroupId, statusFilter, playerSearch]);

  const contentCount = useMemo(() => {
    return (mediasData?.medias?.length || 0) + (templatesData?.templates?.length || 0) + (playlistsData?.playlists?.length || 0);
  }, [mediasData, templatesData, playlistsData]);

  const stats = useMemo(() => {
    const total = groupPlayers.length;
    const active = groupPlayers.filter(p => p.Active).length;
    const inactive = total - active;
    return { total, active, inactive, contentCount };
  }, [groupPlayers, contentCount]);

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
                data-testid="input-search-audience"
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
            <button
              className={`px-6 py-3 text-[13px] font-medium border-b-2 border-transparent ${t.textDim} ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors`}
              onClick={() => setLocation("/analytics/content")}
              data-testid="tab-content-displayed"
            >
              Content Displayed
            </button>
            <button className={`px-6 py-3 text-[13px] font-medium border-b-2 border-[#2997cc] ${isDark ? "text-white" : "text-gray-900"}`} data-testid="tab-audience">
              Audience
            </button>
          </div>

          {selectedGroupId && (
            <div className={`grid grid-cols-4 gap-4 px-4 py-4 border-b ${t.border}`}>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded-lg p-3`}>
                <p className={`text-[10px] uppercase font-bold ${t.textDim}`}>Total Players</p>
                <p className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"} mt-1`} data-testid="stat-total-players">{stats.total}</p>
              </div>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded-lg p-3`}>
                <p className={`text-[10px] uppercase font-bold ${t.textDim}`}>Active</p>
                <p className="text-xl font-bold text-green-400 mt-1" data-testid="stat-active">{stats.active}</p>
              </div>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded-lg p-3`}>
                <p className={`text-[10px] uppercase font-bold ${t.textDim}`}>Inactive</p>
                <p className="text-xl font-bold text-red-400 mt-1" data-testid="stat-inactive">{stats.inactive}</p>
              </div>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded-lg p-3`}>
                <p className={`text-[10px] uppercase font-bold ${t.textDim}`}>Content Items</p>
                <p className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"} mt-1`} data-testid="stat-content">{stats.contentCount}</p>
              </div>
            </div>
          )}

          <div className={`flex flex-wrap items-center gap-4 px-4 py-3 border-b ${t.border}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold uppercase ${isDark ? "text-[#c8d2e0]" : "text-gray-700"}`}>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`text-[11px] ${isDark ? "bg-[#121a24] text-[#c8d2e0] border-[#1e2e3e]" : "bg-white text-gray-700 border-gray-200"} border rounded px-2 py-1 outline-none`}
                data-testid="select-status-filter"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <span className={`text-[11px] ${t.textDim}`}>Filter</span>
              <div className={`flex items-center ${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-white border-gray-200"} border rounded px-2 py-1.5 gap-2`}>
                <input
                  type="text"
                  placeholder="Search players..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className={`bg-transparent text-[11px] ${isDark ? "text-[#c8d2e0] placeholder:text-[#546e7a]" : "text-gray-700 placeholder:text-gray-400"} outline-none w-40`}
                  data-testid="input-search-audience-content"
                />
                <SearchIcon className={`w-3 h-3 ${t.textDim}`} />
              </div>
            </div>

            <span className={`text-[11px] ${t.textDim}`}>{groupPlayers.length} players</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px]">
              <thead className={`sticky top-0 z-10 ${isDark ? "bg-[#0e1620]" : "bg-white"}`}>
                <tr className={`border-b ${t.border}`}>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"}`}>#</th>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Player</th>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Group</th>
                  <th className={`text-center px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Status</th>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Last Connection</th>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Version</th>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {!selectedGroupId ? (
                  <tr>
                    <td colSpan={7} className={`text-center py-20 ${t.textFaint} text-sm`}>
                      Select a group from the sidebar to view player data
                    </td>
                  </tr>
                ) : playersLoading ? (
                  <tr>
                    <td colSpan={7} className={`text-center py-20 ${t.textFaint} text-sm`}>
                      <div className="flex items-center justify-center gap-2">
                        <Loader2Icon className="w-4 h-4 animate-spin" />
                        Loading players...
                      </div>
                    </td>
                  </tr>
                ) : groupPlayers.length > 0 ? (
                  groupPlayers.map((player, i) => (
                    <tr key={player.Id} className={`border-b ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"} ${isDark ? "hover:bg-[#1a2a3a]/30" : "hover:bg-gray-50"}`}>
                      <td className={`px-4 py-2.5 ${isDark ? "text-[#546e7a]" : "text-gray-400"} w-12`}>{i + 1}</td>
                      <td className={`px-4 py-2.5 border-l ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"}`}>
                        <div className="flex items-center gap-2">
                          <MonitorIcon className={`w-3.5 h-3.5 ${player.Active ? "text-green-400" : (isDark ? "text-[#546e7a]" : "text-gray-400")}`} />
                          <span className={isDark ? "text-[#c8d2e0]" : "text-gray-800"} data-testid={`text-player-name-${i}`}>{player.Name}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 ${isDark ? "text-[#8a9bb0]" : "text-gray-600"} border-l ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"}`}>
                        {findGroupName(groups, player.GroupId)}
                      </td>
                      <td className={`px-4 py-2.5 text-center border-l ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"}`}>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          player.Active
                            ? (isDark ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-700")
                            : (isDark ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-700")
                        }`}>
                          {player.Active ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 ${isDark ? "text-[#8a9bb0]" : "text-gray-600"} border-l ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"}`}>
                        {player.LastConnection || "-"}
                      </td>
                      <td className={`px-4 py-2.5 ${isDark ? "text-[#8a9bb0]" : "text-gray-600"} border-l ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"}`}>
                        {player.Version || "-"}
                      </td>
                      <td className={`px-4 py-2.5 ${isDark ? "text-[#8a9bb0]" : "text-gray-600"} border-l ${isDark ? "border-[#1e2e3e]/50" : "border-gray-100"}`}>
                        {player.IpAddress || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className={`text-center py-20 ${t.textFaint} text-sm`}>
                      No players found for the selected criteria
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

export default function AnalyticsAudience() {
  return (
    <ThemeProvider>
      <GroupSelectionProvider>
        <PlayerSelectionProvider>
          <MediaSelectionProvider>
            <AnalyticsAudiencePage />
          </MediaSelectionProvider>
        </PlayerSelectionProvider>
      </GroupSelectionProvider>
    </ThemeProvider>
  );
}
