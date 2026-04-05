import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { API_BASE } from "@/lib/queryClient";

interface StixPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Player {
  Id: number;
  Name: string;
  GroupId: number;
  Active: boolean;
  Version?: string;
  IpAddress?: string;
  MacAddress?: string;
  LastConnection?: string;
  Resolution?: string;
}

interface GroupNode {
  Id: number;
  Name: string;
  children?: GroupNode[];
}

function findGroupName(groups: GroupNode[], id: number): string {
  for (const g of groups) {
    if (g.Id === id) return g.Name;
    if (g.children) {
      const found = findGroupName(g.children, id);
      if (found) return found;
    }
  }
  return "";
}

type FilterTab = "all" | "active" | "inactive";

export function StixPlayersModal({ isOpen, onClose }: StixPlayersModalProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/players"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/players", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isOpen,
  });

  const { data: groupsData } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const allPlayers: Player[] = playersData?.players || [];
  const groups: GroupNode[] = groupsData?.groups || [];

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All (${allPlayers.length})` },
    { key: "active", label: `Active (${allPlayers.filter(p => p.Active).length})` },
    { key: "inactive", label: `Inactive (${allPlayers.filter(p => !p.Active).length})` },
  ];

  let filteredPlayers = allPlayers;
  if (activeTab === "active") filteredPlayers = filteredPlayers.filter(p => p.Active);
  if (activeTab === "inactive") filteredPlayers = filteredPlayers.filter(p => !p.Active);
  if (search) {
    const q = search.toLowerCase();
    filteredPlayers = filteredPlayers.filter(p => p.Name?.toLowerCase().includes(q) || p.IpAddress?.toLowerCase().includes(q));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose} data-testid="stix-players-modal-backdrop">
      <div
        className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded-sm shadow-2xl w-[1100px] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        data-testid="stix-players-modal"
      >
        <div className="flex items-center justify-between px-8 py-6">
          <h1 className={`text-2xl font-light tracking-[-0.5px] ${isDark ? "text-white" : "text-gray-900"}`} data-testid="text-stix-players-title">
            Media Players
          </h1>
          <div className="flex items-center gap-6">
            <button
              className="bg-[#42aade] hover:bg-[#3894c4] text-[#0d0d0d] font-medium text-sm px-8 py-2.5 rounded shadow-sm transition-colors"
              onClick={onClose}
              data-testid="button-stix-ok"
            >
              OK
            </button>
            <button
              className={`${isDark ? "text-[#64748b]" : "text-gray-500"} text-lg hover:opacity-80 transition-opacity`}
              onClick={onClose}
              data-testid="button-stix-cancel"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="px-8 pb-2">
          <div className={`border-b-2 ${isDark ? "border-[#2f343c]" : "border-gray-200"}`} />
        </div>

        <div className="px-8 pt-4 pb-2 flex items-center gap-4">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`px-4 py-1.5 text-sm rounded transition-colors ${activeTab === tab.key ? "bg-[#42aade] text-[#0d0d0d] font-medium" : isDark ? "text-gray-400 hover:text-gray-200 hover:bg-[#1a2a3a]/40" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
                onClick={() => setActiveTab(tab.key)}
                data-testid={`button-tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className={`flex items-center gap-2 ${isDark ? "bg-[#121a24] border-[#1f2228]" : "bg-gray-50 border-gray-200"} border rounded px-2 py-1.5`}>
            <Search className={`w-3 h-3 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players..."
              className={`bg-transparent text-xs outline-none w-40 ${isDark ? "text-gray-300 placeholder:text-gray-600" : "text-gray-700 placeholder:text-gray-400"}`}
              data-testid="input-search-stix"
            />
          </div>
        </div>

        <div className="px-8 py-4 flex-1 overflow-auto max-h-[60vh]">
          {playersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-gray-500" : "text-gray-400"}`} />
            </div>
          ) : (
            <table className="w-full" data-testid="table-stix-players">
              <thead>
                <tr className={`border-b ${isDark ? "border-[#1f2228]" : "border-gray-200"}`}>
                  <th className={`text-left py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Name</th>
                  <th className={`text-left py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Group</th>
                  <th className={`text-left py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Status</th>
                  <th className={`text-left py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Version</th>
                  <th className={`text-left py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>IP Address</th>
                  <th className={`text-left py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Resolution</th>
                  <th className={`text-left py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Last Connection</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.length > 0 ? filteredPlayers.map((player, idx) => (
                  <tr
                    key={player.Id}
                    className={`border-b ${isDark ? "border-[#1a1e24]" : "border-gray-100"} ${isDark ? "hover:bg-[#1a2a3a]/30" : "hover:bg-gray-50"} transition-colors`}
                    data-testid={`row-stix-player-${idx}`}
                  >
                    <td className={`py-3 text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>{player.Name}</td>
                    <td className={`py-3 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{findGroupName(groups, player.GroupId)}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${player.Active ? (isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-100 text-emerald-700") : (isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500")}`} data-testid={`badge-status-${idx}`}>
                        {player.Active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={`py-3 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{player.Version || "-"}</td>
                    <td className={`py-3 text-sm font-mono ${isDark ? "text-gray-400" : "text-gray-500"}`}>{player.IpAddress || "-"}</td>
                    <td className={`py-3 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{player.Resolution || "-"}</td>
                    <td className={`py-3 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{player.LastConnection || "-"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className={`py-8 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      No players found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
