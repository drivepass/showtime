import { TopNavigationBarSection } from "./sections/TopNavigationBarSection";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { GroupSelectionProvider } from "@/hooks/use-group-selection";
import { PlayerSelectionProvider } from "@/hooks/use-player-selection";
import { MediaSelectionProvider } from "@/hooks/use-media-selection";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SearchIcon, Loader2Icon, RefreshCwIcon, DownloadIcon, XCircleIcon, MonitorIcon, PowerIcon, RotateCwIcon, SendIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, API_BASE } from "@/lib/queryClient";

interface Player {
  Id: number;
  Name: string;
  Active: boolean;
  GroupId: number;
  GroupName?: string;
  IpAddress?: string;
  LastConnection?: string;
  OsVersion?: string;
  PlayerVersion?: string;
  Resolution?: string;
  Status?: string;
}

interface PlayerGroup {
  Id: number;
  Name: string;
}

function GroupTreeItem({ group, selectedId, onSelect }: { group: PlayerGroup; selectedId: number | null; onSelect: (id: number) => void }) {
  const { t, isDark } = useTheme();
  const isSelected = selectedId === group.Id;

  return (
    <div
      className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer text-[11px] ${isSelected ? (isDark ? "bg-[#1a2a3a]" : "bg-blue-50") : ""} ${isDark ? "hover:bg-[#1a2a3a]/50" : "hover:bg-gray-50"} transition-colors`}
      style={{ paddingLeft: `8px` }}
      onClick={() => onSelect(group.Id)}
      data-testid={`group-tree-${group.Id}`}
    >
      <div className="w-3 flex-shrink-0" />
      <svg className={`w-3 h-3 ${isSelected ? "text-[#2997cc]" : t.textDim} flex-shrink-0`} viewBox="0 0 16 14" fill="currentColor">
        <path d="M6 0L8 2H16V14H0V0H6Z" />
      </svg>
      <span className={`truncate ${isSelected ? (isDark ? "text-[#2997cc]" : "text-blue-600") : (isDark ? "text-[#c8d2e0]" : "text-gray-700")}`}>{group.Name}</span>
    </div>
  );
}

function MonitoringContent() {
  const { t, isDark } = useTheme();
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: playersData, isLoading, refetch } = useQuery({
    queryKey: ["/api/players"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/players", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch players");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: groupsData } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
  });

  const players: Player[] = playersData?.players || [];
  const allGroups: PlayerGroup[] = groupsData?.groups || [];
  const EXCLUDED_GROUP_NAMES = new Set(["saas", "middle east and north africa", "saudi arabia"]);
  const playerGroupIds = new Set(players.map((p) => p.GroupId).filter((id): id is number => typeof id === "number"));
  const groups: PlayerGroup[] = allGroups.filter((g) => {
    if (EXCLUDED_GROUP_NAMES.has((g.Name || "").trim().toLowerCase())) return false;
    return playerGroupIds.has(g.Id);
  });

  const filteredPlayers = players.filter((p) => {
    const matchesSearch = !search || p.Name?.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = !selectedGroupId || p.GroupId === selectedGroupId;
    return matchesSearch && matchesGroup;
  });

  useEffect(() => {
    setSelectedPlayerIds([]);
  }, [selectedGroupId, search]);

  const totalGroups = groups.length;
  const totalPlayers = players.length;
  const activeCount = players.filter((p) => p.Active).length;
  const offlineCount = players.filter((p) => !p.Active).length;

  const counters = [
    { label: "Group", value: totalGroups },
    { label: "Player", value: totalPlayers },
    { label: "Active", value: activeCount },
    { label: "Offline", value: offlineCount },
    { label: "Alert", value: 0 },
    { label: "Inactive", value: 0 },
  ];

  const togglePlayerSelection = (playerId: number) => {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const selectAll = () => {
    const allIds = filteredPlayers.map(p => p.Id);
    setSelectedPlayerIds(allIds);
  };

  const clearSelection = () => {
    setSelectedPlayerIds([]);
  };

  const showFeedback = (type: "success" | "error", message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId) throw new Error("Please select a group first");
      return await apiRequest("POST", "/api/player-control/publish", {
        groupId: selectedGroupId,
        playerIds: selectedPlayerIds.length > 0 ? selectedPlayerIds : undefined,
      });
    },
    onSuccess: () => showFeedback("success", "Content published successfully"),
    onError: (err: any) => showFeedback("error", err?.message || "Publish failed"),
  });

  const remoteSettingsMutation = useMutation({
    mutationFn: async (action: string) => {
      if (selectedPlayerIds.length === 0) throw new Error("Please select players first");
      return await apiRequest("POST", "/api/player-control/remote-settings", {
        playerIds: selectedPlayerIds,
        action,
        groupId: selectedGroupId,
      });
    },
    onSuccess: (_data, action) => showFeedback("success", `${action} command sent successfully`),
    onError: (err: any) => showFeedback("error", err?.message || "Action failed"),
  });

  const isActionPending = publishMutation.isPending || remoteSettingsMutation.isPending;

  return (
    <div className={`${t.pageBg} w-full min-w-[1728px] min-h-screen flex flex-col ${t.textPrimary}`}>
      <TopNavigationBarSection activeTab="monitoring" />

      <div className="flex flex-1 overflow-hidden">
        <aside className={`w-[256px] ${isDark ? "bg-[#0e1620]" : "bg-white"} border-r ${t.border} flex flex-col flex-shrink-0`}>
          <div className={`flex items-center gap-2 px-3 py-3 border-b ${t.border}`}>
            <svg className={`w-3 h-3 ${t.textDim}`} viewBox="0 0 16 14" fill="currentColor">
              <path d="M6 0L8 2H16V14H0V0H6Z" />
            </svg>
            <span className={`text-[11px] font-medium ${t.textDim} uppercase tracking-wider`}>Players</span>
          </div>

          <div className={`px-2 py-2 border-b ${t.border}`}>
            <div className={`flex items-center ${isDark ? "bg-[#121a24]" : "bg-gray-50"} rounded px-2 py-1.5 gap-2`}>
              <SearchIcon className={`w-3 h-3 ${t.textDim}`} />
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`bg-transparent text-[11px] ${isDark ? "text-[#c8d2e0] placeholder:text-[#546e7a]" : "text-gray-700 placeholder:text-gray-400"} outline-none flex-1`}
                data-testid="input-search-monitoring"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {groups
              .filter((g) => !search || g.Name?.toLowerCase().includes(search.toLowerCase()))
              .map(group => (
                <GroupTreeItem
                  key={group.Id}
                  group={group}
                  selectedId={selectedGroupId}
                  onSelect={setSelectedGroupId}
                />
              ))}
          </ScrollArea>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex items-center gap-4 px-4 py-2.5 border-b ${t.border}`}>
            {counters.map((c) => (
              <div key={c.label} className="flex items-center gap-1.5">
                <span className={`text-[13px] font-semibold ${isDark ? "text-white" : "text-gray-900"}`} data-testid={`counter-${c.label.toLowerCase()}`}>
                  {c.value}
                </span>
                <span className={`text-[11px] ${t.textDim}`}>{c.label}</span>
              </div>
            ))}

            <div className="flex-1" />

            {selectedPlayerIds.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-medium ${isDark ? "text-[#2997cc]" : "text-blue-600"}`}>
                  {selectedPlayerIds.length} selected
                </span>
                <button
                  className={`text-[10px] ${t.textDim} underline`}
                  onClick={clearSelection}
                  data-testid="button-clear-selection"
                >
                  clear
                </button>
              </div>
            )}

            <button
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] bg-[#2997cc] hover:bg-[#2587b8] text-white rounded transition-colors disabled:opacity-50`}
              onClick={() => publishMutation.mutate()}
              disabled={isActionPending || !selectedGroupId}
              data-testid="button-publish-content"
            >
              <SendIcon className="w-3 h-3" />
              {publishMutation.isPending ? "Publishing..." : "Publish"}
            </button>

            <button
              className={`flex items-center gap-1.5 px-2 py-1 text-[11px] ${t.textDim} border ${t.border} rounded ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors disabled:opacity-50`}
              onClick={() => remoteSettingsMutation.mutate("DisplayOn")}
              disabled={isActionPending || selectedPlayerIds.length === 0}
              title="Display On"
              data-testid="button-display-on"
            >
              <MonitorIcon className="w-3 h-3" />
            </button>

            <button
              className={`flex items-center gap-1.5 px-2 py-1 text-[11px] ${t.textDim} border ${t.border} rounded ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors disabled:opacity-50`}
              onClick={() => remoteSettingsMutation.mutate("DisplayOff")}
              disabled={isActionPending || selectedPlayerIds.length === 0}
              title="Display Off"
              data-testid="button-display-off"
            >
              <PowerIcon className="w-3 h-3" />
            </button>

            <button
              className={`flex items-center gap-1.5 px-2 py-1 text-[11px] ${t.textDim} border ${t.border} rounded ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors disabled:opacity-50`}
              onClick={() => remoteSettingsMutation.mutate("Reboot")}
              disabled={isActionPending || selectedPlayerIds.length === 0}
              title="Reboot"
              data-testid="button-reboot"
            >
              <RotateCwIcon className="w-3 h-3" />
            </button>

            <button
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] ${t.textDim} border ${t.border} rounded ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors`}
              data-testid="button-clear-alerts"
            >
              <XCircleIcon className="w-3 h-3" />
              Clear alerts
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] ${t.textDim} border ${t.border} rounded ${isDark ? "hover:bg-[#1a2a3a]" : "hover:bg-gray-50"} transition-colors`}
              data-testid="button-export"
            >
              <DownloadIcon className="w-3 h-3" />
              Export
            </button>
            <button
              className={`p-1.5 rounded ${t.hoverBg} transition-colors`}
              onClick={() => refetch()}
              data-testid="button-refresh-players"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${t.textDim}`} />
            </button>
          </div>

          {actionFeedback && (
            <div className={`px-4 py-2 text-xs font-medium border-b ${
              actionFeedback.type === "success"
                ? isDark ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-700 border-green-200"
                : isDark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-700 border-red-200"
            }`} data-testid="text-action-feedback">
              {actionFeedback.message}
            </div>
          )}

          <div className={`text-[9px] font-semibold uppercase ${isDark ? "text-[#546e7a] bg-[#0e1620]" : "text-gray-400 bg-gray-50"} px-4 py-2 border-b ${t.border} flex items-center justify-between`}>
            <span>Monitored Players ({filteredPlayers.length})</span>
            {filteredPlayers.length > 0 && (
              <button
                className={`text-[9px] ${isDark ? "text-[#2997cc]" : "text-blue-600"} font-medium`}
                onClick={selectedPlayerIds.length === filteredPlayers.length ? clearSelection : selectAll}
                data-testid="button-select-all"
              >
                {selectedPlayerIds.length === filteredPlayers.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px]">
              <thead className={`sticky top-0 z-10 ${isDark ? "bg-[#0e1620]" : "bg-white"}`}>
                <tr className={`border-b ${t.border}`}>
                  <th className={`text-left px-2 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} w-8`}></th>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} w-[200px]`}>Player Name</th>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Group / Last Connection</th>
                  <th className={`text-left px-4 py-3 font-bold text-[10px] uppercase ${isDark ? "text-[#546e7a]" : "text-[#334155]"} border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-20">
                      <Loader2Icon className={`w-5 h-5 ${t.textFaint} animate-spin mx-auto`} />
                    </td>
                  </tr>
                ) : filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={`text-center py-20 text-sm ${t.textFaint}`}>
                      No players found
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player, idx) => {
                    const lastConn = player.LastConnection
                      ? new Date(player.LastConnection).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
                      : "—";
                    const isSelected = selectedPlayerIds.includes(player.Id);

                    return (
                      <tr
                        key={player.Id}
                        className={`border-b ${isDark ? "border-[#1e2e3e]/50" : "border-[#f3f4f6]"} ${
                          isSelected
                            ? isDark ? "bg-[#2997cc]/10" : "bg-blue-50"
                            : idx % 2 === 0 ? (isDark ? "bg-[#0e1620]" : "bg-white") : (isDark ? "bg-[#121a24]" : "bg-[#f9fafb]")
                        } ${isDark ? "hover:bg-[#1a2a3a]/50" : "hover:bg-blue-50/30"} transition-colors cursor-pointer`}
                        onClick={() => togglePlayerSelection(player.Id)}
                        data-testid={`row-player-${player.Id}`}
                      >
                        <td className="px-2 py-2.5 text-center">
                          <div className={`w-4 h-4 rounded border ${isSelected ? "bg-[#2997cc] border-[#2997cc]" : isDark ? "border-[#546e7a]" : "border-gray-300"} flex items-center justify-center mx-auto`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${player.Active ? "bg-green-400" : "bg-red-400"}`} />
                            <span className={`text-[11px] font-medium ${isDark ? "text-[#c8d2e0]" : "text-gray-700"}`} data-testid={`text-player-name-${player.Id}`}>
                              {player.Name}
                            </span>
                          </div>
                        </td>
                        <td className={`px-4 py-2.5 border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>
                          <div className={`text-[11px] ${isDark ? "text-[#c8d2e0]" : "text-gray-600"}`}>
                            <div>{player.GroupName || "—"}</div>
                            <div className={`text-[10px] ${t.textDim}`}>{lastConn}</div>
                          </div>
                        </td>
                        <td className={`px-4 py-2.5 border-l ${isDark ? "border-[#1e2e3e]" : "border-[#f3f4f6]"}`}>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                              player.Active
                                ? isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600"
                                : isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"
                            }`} data-testid={`status-player-${player.Id}`}>
                              {player.Active ? "Online" : "Offline"}
                            </span>
                            {player.Resolution && (
                              <span className={`text-[10px] ${t.textDim}`}>{player.Resolution}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Monitoring() {
  return (
    <ThemeProvider>
      <GroupSelectionProvider>
        <PlayerSelectionProvider>
          <MediaSelectionProvider>
            <MonitoringContent />
          </MediaSelectionProvider>
        </PlayerSelectionProvider>
      </GroupSelectionProvider>
    </ThemeProvider>
  );
}
