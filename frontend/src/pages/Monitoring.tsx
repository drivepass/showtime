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
  LastNotify?: string;
  OsVersion?: string;
  PlayerVersion?: string;
  Resolution?: string;
  Status?: string;
  Plan?: string;
  SerialNumber?: string;
  TechnicalProfileId?: number;
  Model?: string;
  FreeSpace?: string;
}

type PlayerStatus = "online" | "warning" | "offline" | "unknown";

function getPlayerStatus(player: Player): PlayerStatus {
  if (!player.LastNotify) return "unknown";
  if (player.LastNotify.startsWith("0001-01-01")) return "offline";
  const ago = Date.now() - new Date(player.LastNotify).getTime();
  if (ago <= 10 * 60 * 1000) return "online";
  if (ago <= 24 * 60 * 60 * 1000) return "warning";
  return "offline";
}

const STATUS_CONFIG: Record<PlayerStatus, { dot: string; label: string; badgeLight: string; badgeDark: string }> = {
  online:  { dot: "bg-green-400",  label: "Online",  badgeLight: "bg-green-50 text-green-600",   badgeDark: "bg-green-500/10 text-green-400" },
  warning: { dot: "bg-yellow-400", label: "Warning", badgeLight: "bg-yellow-50 text-yellow-600", badgeDark: "bg-yellow-500/10 text-yellow-400" },
  offline: { dot: "bg-red-400",    label: "Offline", badgeLight: "bg-red-50 text-red-600",       badgeDark: "bg-red-500/10 text-red-400" },
  unknown: { dot: "bg-gray-400",   label: "Unknown", badgeLight: "bg-gray-100 text-gray-500",    badgeDark: "bg-gray-500/10 text-gray-400" },
};

function formatLastNotify(lastNotify?: string): string {
  if (!lastNotify || lastNotify.startsWith("0001-01-01")) return "\u2014";
  const d = new Date(lastNotify);
  if (isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function getDownloadStatus(player: Player): string {
  if (!player.LastNotify || player.LastNotify.startsWith("0001-01-01")) return "\u2014";
  const ago = Date.now() - new Date(player.LastNotify).getTime();
  if (ago <= 24 * 60 * 60 * 1000) return "Done";
  return "\u2014";
}

interface PlayerGroup {
  Id: number;
  Name: string;
}

const TABLE_COLUMNS = [
  { key: "group",     label: "Group",      minW: "min-w-[120px]" },
  { key: "players",   label: "Players",    minW: "min-w-[140px]" },
  { key: "date",      label: "Date",       minW: "min-w-[90px]" },
  { key: "by",        label: "By",         minW: "min-w-[60px]" },
  { key: "status",    label: "Status",     minW: "min-w-[80px]" },
  { key: "display",   label: "Display",    minW: "min-w-[60px]" },
  { key: "player",    label: "Player",     minW: "min-w-[120px]" },
  { key: "playlist",  label: "Playlist",   minW: "min-w-[80px]" },
  { key: "model",     label: "Model",      minW: "min-w-[80px]" },
  { key: "os",        label: "OS",         minW: "min-w-[80px]" },
  { key: "version",   label: "Version",    minW: "min-w-[80px]" },
  { key: "profile",   label: "Profile",    minW: "min-w-[80px]" },
  { key: "freespace", label: "Free Space", minW: "min-w-[80px]" },
  { key: "plan",      label: "Plan",       minW: "min-w-[80px]" },
] as const;

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
  const EXCLUDED_GROUP_NAMES = new Set([
    "saas",
    "middle east and north africa",
    "saudi arabia",
    "middle east",
    "mena",
  ]);
  const groups: PlayerGroup[] = allGroups.filter((g) => {
    const name = (g.Name || "").trim().toLowerCase();
    if (!name) return true;
    if (EXCLUDED_GROUP_NAMES.has(name)) return false;
    if (name.includes("middle east")) return false;
    if (name.includes("north africa")) return false;
    return true;
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
  const onlineCount = players.filter((p) => getPlayerStatus(p) === "online").length;
  const warningCount = players.filter((p) => getPlayerStatus(p) === "warning").length;
  const offlineCount = players.filter((p) => getPlayerStatus(p) === "offline").length;
  const unknownCount = players.filter((p) => getPlayerStatus(p) === "unknown").length;

  const counters = [
    { label: "Group", value: totalGroups },
    { label: "Player", value: totalPlayers },
    { label: "Online", value: onlineCount },
    { label: "Warning", value: warningCount },
    { label: "Offline", value: offlineCount },
    { label: "Unknown", value: unknownCount },
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

  const thCls = `text-left px-3 py-2.5 font-bold text-[9px] uppercase tracking-wider whitespace-nowrap ${isDark ? "text-[#546e7a]" : "text-[#334155]"}`;
  const tdCls = `px-3 py-2 text-[10px] whitespace-nowrap ${isDark ? "text-[#8fa4b5]" : "text-gray-600"}`;

  return (
    <div className={`${t.pageBg} w-full min-h-screen flex flex-col ${t.textPrimary}`}>
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

          <div className="flex-1 overflow-auto overflow-hidden">
            <table className="w-full text-[11px] table-fixed" style={{ minWidth: "1400px" }}>
              <thead className={`sticky top-0 z-10 ${isDark ? "bg-[#0e1620]" : "bg-white"}`}>
                <tr className={`border-b ${t.border}`}>
                  <th className={`${thCls} w-8`}></th>
                  {TABLE_COLUMNS.map((col) => (
                    <th key={col.key} className={`${thCls} ${col.minW}`}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={TABLE_COLUMNS.length + 1} className="text-center py-20">
                      <Loader2Icon className={`w-5 h-5 ${t.textFaint} animate-spin mx-auto`} />
                    </td>
                  </tr>
                ) : filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLUMNS.length + 1} className={`text-center py-20 text-sm ${t.textFaint}`}>
                      {selectedGroupId ? "No players in this group" : "Select a group to view players"}
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player, idx) => {
                    const isSelected = selectedPlayerIds.includes(player.Id);
                    const status = getPlayerStatus(player);
                    const cfg = STATUS_CONFIG[status];

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
                        {/* Checkbox */}
                        <td className="px-2 py-2 text-center w-8">
                          <div className={`w-4 h-4 rounded border ${isSelected ? "bg-[#2997cc] border-[#2997cc]" : isDark ? "border-[#546e7a]" : "border-gray-300"} flex items-center justify-center mx-auto`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>
                            )}
                          </div>
                        </td>
                        {/* GROUP */}
                        <td className={tdCls}>{player.GroupName || "\u2014"}</td>
                        {/* PLAYERS */}
                        <td className={`${tdCls} !text-[11px] font-medium ${isDark ? "!text-[#c8d2e0]" : "!text-gray-700"}`}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <span className="truncate" data-testid={`text-player-name-${player.Id}`}>{player.Name}</span>
                          </div>
                        </td>
                        {/* DATE */}
                        <td className={tdCls}>{formatLastNotify(player.LastNotify)}</td>
                        {/* BY */}
                        <td className={tdCls}>{"\u2014"}</td>
                        {/* STATUS */}
                        <td className={tdCls}>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${isDark ? cfg.badgeDark : cfg.badgeLight}`} data-testid={`status-player-${player.Id}`}>
                            {getDownloadStatus(player) === "Done" ? "Done" : cfg.label}
                          </span>
                        </td>
                        {/* DISPLAY */}
                        <td className={tdCls}>{"\u2014"}</td>
                        {/* PLAYER (serial/hardware) */}
                        <td className={tdCls}>
                          <span className="truncate max-w-[120px] block" title={player.SerialNumber || "\u2014"}>
                            {player.SerialNumber ? player.SerialNumber.slice(0, 20) : "\u2014"}
                          </span>
                        </td>
                        {/* PLAYLIST */}
                        <td className={tdCls}>{"\u2014"}</td>
                        {/* MODEL */}
                        <td className={tdCls}>
                          <span className="truncate max-w-[120px] block" title={player.Model || "\u2014"}>
                            {player.Model ? player.Model.slice(0, 20) : "\u2014"}
                          </span>
                        </td>
                        {/* OS */}
                        <td className={tdCls}>
                          <span className="truncate max-w-[120px] block" title={player.OsVersion || "\u2014"}>
                            {player.OsVersion ? player.OsVersion.slice(0, 15) : "\u2014"}
                          </span>
                        </td>
                        {/* VERSION */}
                        <td className={tdCls}>
                          <span className="truncate max-w-[120px] block" title={player.PlayerVersion || "\u2014"}>
                            {player.PlayerVersion ? player.PlayerVersion.slice(0, 10) : "\u2014"}
                          </span>
                        </td>
                        {/* PROFILE */}
                        <td className={tdCls}>{player.TechnicalProfileId ? `Profile ${player.TechnicalProfileId}` : "Default"}</td>
                        {/* FREE SPACE */}
                        <td className={tdCls}>{player.FreeSpace || "\u2014"}</td>
                        {/* PLAN */}
                        <td className={tdCls}>{player.Plan || "\u2014"}</td>
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
