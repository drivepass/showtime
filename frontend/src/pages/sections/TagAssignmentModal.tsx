import { useState, useMemo } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Search, ChevronDown, Tag, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/queryClient";

interface TagAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Player {
  Id: number;
  Name: string;
  GroupId: number;
  Active: boolean;
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

function collectGroupNames(groups: GroupNode[]): string[] {
  const names: string[] = [];
  for (const g of groups) {
    names.push(g.Name);
    if (g.children) names.push(...collectGroupNames(g.children));
  }
  return names;
}

export function TagAssignmentModal({ isOpen, onClose }: TagAssignmentModalProps) {
  const { isDark } = useTheme();
  const [tagSearch, setTagSearch] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [groupFilter, setGroupFilter] = useState("All");
  const [playerSearch, setPlayerSearch] = useState("");

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

  const players: Player[] = playersData?.players || [];
  const groups: GroupNode[] = groupsData?.groups || [];
  const groupNames = ["All", ...Array.from(new Set(collectGroupNames(groups)))];

  const tags = useMemo(() => {
    const tagSet = new Set<string>();
    players.forEach(p => {
      const groupName = findGroupName(groups, p.GroupId);
      if (groupName) tagSet.add(groupName);
    });
    return Array.from(tagSet).map((name, i) => ({ id: i + 1, name }));
  }, [players, groups]);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const filteredPlayers = players.filter((p) => {
    const groupName = findGroupName(groups, p.GroupId);
    const matchesGroup = groupFilter === "All" || groupName === groupFilter;
    const matchesSearch = !playerSearch || p.Name?.toLowerCase().includes(playerSearch.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  if (!isOpen) return null;

  const togglePlayer = (id: number) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedPlayers.length === filteredPlayers.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(filteredPlayers.map(p => p.Id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose} data-testid="tag-assignment-modal-backdrop">
      <div
        className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded-sm shadow-2xl w-[1100px] min-h-[650px] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        data-testid="tag-assignment-modal"
      >
        <div className="flex items-center justify-between px-8 py-6">
          <h1 className={`text-2xl font-light tracking-[-0.5px] ${isDark ? "text-white" : "text-gray-900"}`} data-testid="text-tag-assignment-title">
            Tag Assignment
          </h1>
          <div className="flex items-center gap-6">
            <button
              className="bg-[#42aade] hover:bg-[#3894c4] text-[#0d0d0d] font-medium text-sm px-8 py-2.5 rounded shadow-sm transition-colors"
              onClick={onClose}
              data-testid="button-tag-ok"
            >
              OK
            </button>
            <button
              className={`${isDark ? "text-[#64748b]" : "text-gray-500"} text-lg hover:opacity-80 transition-opacity`}
              onClick={onClose}
              data-testid="button-tag-cancel"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="px-8 pb-4">
          <div className={`border-b-2 ${isDark ? "border-[#2f343c]" : "border-gray-200"}`} />
        </div>

        <div className="flex flex-1 px-8 pb-8 gap-6">
          <div className={`w-[300px] flex-shrink-0 flex flex-col border-r ${isDark ? "border-[#1f2228]" : "border-gray-200"} pr-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`} data-testid="text-tag-section-title">
                Groups
              </h3>
            </div>

            <div className="relative mb-4">
              <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search groups..."
                className={`w-full pl-8 pr-3 py-2 text-sm rounded ${isDark ? "bg-[#121a24] text-gray-200 placeholder:text-gray-600 border-[#1f2228]" : "bg-gray-50 text-gray-700 placeholder:text-gray-400 border-gray-200"} border outline-none focus:border-[#42aade]`}
                data-testid="input-tag-search"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTagId(tag.id)}
                  className={`w-full text-left px-3 py-2.5 rounded text-sm flex items-center gap-2 transition-colors ${
                    selectedTagId === tag.id
                      ? isDark ? "bg-[#1a2a3a] text-[#42aade]" : "bg-blue-50 text-blue-700"
                      : isDark ? "text-gray-300 hover:bg-[#121a24]" : "text-gray-700 hover:bg-gray-50"
                  }`}
                  data-testid={`button-tag-${tag.id}`}
                >
                  <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{tag.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`} data-testid="text-players-section-title">
                Players ({filteredPlayers.length})
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Search players..."
                    className={`pl-7 pr-3 py-1.5 text-xs rounded ${isDark ? "bg-[#121a24] text-gray-300 border-[#1f2228]" : "bg-gray-50 text-gray-600 border-gray-200"} border outline-none w-40`}
                    data-testid="input-player-search"
                  />
                </div>
                <div className="relative">
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className={`appearance-none pl-3 pr-7 py-1.5 text-xs rounded ${isDark ? "bg-[#121a24] text-gray-300 border-[#1f2228]" : "bg-gray-50 text-gray-600 border-gray-200"} border outline-none focus:border-[#42aade]`}
                    data-testid="select-group-filter"
                  >
                    {groupNames.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {playersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? "border-[#1f2228]" : "border-gray-200"}`}>
                      <th className="w-10 py-2 text-left">
                        <input type="checkbox" className="rounded" onChange={toggleAll} checked={selectedPlayers.length === filteredPlayers.length && filteredPlayers.length > 0} data-testid="checkbox-select-all-players" />
                      </th>
                      <th className={`py-2 text-left font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Name</th>
                      <th className={`py-2 text-left font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Group</th>
                      <th className={`py-2 text-left font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((player) => (
                      <tr
                        key={player.Id}
                        className={`border-b ${isDark ? "border-[#1a1f26] hover:bg-[#121a24]" : "border-gray-100 hover:bg-gray-50"} transition-colors`}
                        data-testid={`row-player-${player.Id}`}
                      >
                        <td className="py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedPlayers.includes(player.Id)}
                            onChange={() => togglePlayer(player.Id)}
                            className="rounded"
                            data-testid={`checkbox-player-${player.Id}`}
                          />
                        </td>
                        <td className={`py-2.5 ${isDark ? "text-gray-200" : "text-gray-800"}`} data-testid={`text-player-name-${player.Id}`}>
                          {player.Name}
                        </td>
                        <td className={`py-2.5 ${isDark ? "text-gray-400" : "text-gray-500"}`} data-testid={`text-player-group-${player.Id}`}>
                          {findGroupName(groups, player.GroupId)}
                        </td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            player.Active
                              ? isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-100 text-emerald-700"
                              : isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"
                          }`}>
                            {player.Active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
