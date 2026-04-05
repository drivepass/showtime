import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Search, ChevronRight, ChevronDown, Check, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/queryClient";

interface DomainUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroupNode {
  Id: number;
  Name: string;
  children?: GroupNode[];
}

interface Player {
  Id: number;
  Name: string;
  GroupId: number;
  Active: boolean;
  LastConnection?: string;
  IpAddress?: string;
  Version?: string;
}

function DomainTreeNode({
  node,
  level,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  isDark,
}: {
  node: GroupNode;
  level: number;
  selectedId: number | null;
  expandedIds: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  isDark: boolean;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.Id);
  const isSelected = selectedId === node.Id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 px-2 cursor-pointer rounded-sm transition-colors ${
          isSelected
            ? isDark ? "bg-[#1a2a3a]" : "bg-[#e0f2fe]"
            : isDark ? "hover:bg-[#141e28]" : "hover:bg-gray-100"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          onSelect(node.Id);
          if (hasChildren) onToggle(node.Id);
        }}
        data-testid={`domain-node-${node.Id}`}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
          ) : (
            <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
          )
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        <span className={`text-sm truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>
          {node.Name}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <DomainTreeNode
              key={child.Id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
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

function collectGroupIds(groups: GroupNode[]): number[] {
  const ids: number[] = [];
  for (const g of groups) {
    ids.push(g.Id);
    if (g.children) ids.push(...collectGroupIds(g.children));
  }
  return ids;
}

export function DomainUserModal({ isOpen, onClose }: DomainUserModalProps) {
  const { isDark } = useTheme();
  const [domainSearch, setDomainSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isOpen,
  });

  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ["/api/players"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/players", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const groups: GroupNode[] = groupsData?.groups || [];
  const allPlayers: Player[] = playersData?.players || [];

  const groupPlayers = selectedGroupId
    ? allPlayers.filter(p => p.GroupId === selectedGroupId)
    : allPlayers;

  const handleToggle = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (expandedIds.size === 0 && groups.length > 0) {
    const firstIds = groups.map(g => g.Id);
    setExpandedIds(new Set(firstIds));
  }

  if (selectedGroupId === null && groups.length > 0) {
    setSelectedGroupId(groups[0]?.Id || null);
  }

  const statusColor = (active: boolean) => {
    if (active) return isDark ? "text-emerald-400" : "text-emerald-600";
    return isDark ? "text-gray-500" : "text-gray-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose} data-testid="domain-user-modal-backdrop">
      <div
        className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded-sm shadow-2xl w-[1100px] min-h-[700px] max-h-[85vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        data-testid="domain-user-modal"
      >
        <div className="flex items-center justify-between px-8 py-6">
          <h1 className={`text-3xl font-light tracking-[-0.5px] ${isDark ? "text-white" : "text-gray-900"}`} data-testid="text-modal-title">
            Domain & User Management
          </h1>
          <div className="flex items-center gap-6">
            <button
              className="bg-[#42aade] hover:bg-[#3894c4] text-[#0d0d0d] font-medium text-sm px-8 py-2.5 rounded-sm shadow-sm transition-colors"
              onClick={onClose}
              data-testid="button-domain-ok"
            >
              OK
            </button>
            <button
              className={`${isDark ? "text-[#64748b]" : "text-gray-500"} text-lg hover:opacity-80 transition-opacity`}
              onClick={onClose}
              data-testid="button-domain-cancel"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="px-8">
          <div className={`border-b-2 ${isDark ? "border-[#2f343c]" : "border-gray-200"}`} />
        </div>

        <div className="flex flex-1 overflow-hidden px-8 py-6 gap-6">
          <div className={`w-[280px] flex-shrink-0 flex flex-col border-r ${isDark ? "border-[#1e2e3e]" : "border-gray-200"} pr-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-[#2196f3]"}`} data-testid="text-domains-header">
                Groups
              </h3>
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-sm mb-4 ${isDark ? "bg-[#121a24]" : "bg-gray-100"}`}>
              <Search className={`w-3.5 h-3.5 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              <input
                type="text"
                value={domainSearch}
                onChange={(e) => setDomainSearch(e.target.value)}
                placeholder="Search groups"
                className={`w-full bg-transparent text-sm outline-none ${isDark ? "text-gray-300 placeholder:text-gray-600" : "text-gray-700 placeholder:text-gray-400"}`}
                data-testid="input-domain-search"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {groupsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                </div>
              ) : (
                groups.map((group) => (
                  <DomainTreeNode
                    key={group.Id}
                    node={group}
                    level={0}
                    selectedId={selectedGroupId}
                    expandedIds={expandedIds}
                    onSelect={setSelectedGroupId}
                    onToggle={handleToggle}
                    isDark={isDark}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-[#2196f3]"}`} data-testid="text-users-header">
                Players {selectedGroupId ? `(${findGroupName(groups, selectedGroupId)})` : ""}
              </h3>
              <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {groupPlayers.length} player{groupPlayers.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              {playersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                </div>
              ) : (
                <table className="w-full" data-testid="table-users">
                  <thead>
                    <tr className={`border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-200"}`}>
                      <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Name</th>
                      <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Group</th>
                      <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Status</th>
                      <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Last Connection</th>
                      <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupPlayers.length > 0 ? groupPlayers.map((player) => (
                      <tr
                        key={player.Id}
                        className={`border-b transition-colors ${isDark ? "border-[#141e28] hover:bg-[#121a24]" : "border-gray-100 hover:bg-gray-50"}`}
                        data-testid={`row-user-${player.Id}`}
                      >
                        <td className={`py-3 px-4 text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>{player.Name}</td>
                        <td className={`py-3 px-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{findGroupName(groups, player.GroupId)}</td>
                        <td className={`py-3 px-4 text-sm ${statusColor(player.Active)}`}>
                          <span className="flex items-center gap-1.5">
                            {player.Active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            {player.Active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{player.LastConnection || "-"}</td>
                        <td className={`py-3 px-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{player.IpAddress || "-"}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className={`py-8 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          No players in this group
                        </td>
                      </tr>
                    )}
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
