import { SearchIcon, Loader2Icon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { usePlayerSelection } from "@/hooks/use-player-selection";
import { useGroupSelection } from "@/hooks/use-group-selection";
import { useTheme } from "@/hooks/use-theme";

interface Player {
  Id: number;
  Name: string;
  GroupId?: number;
  GroupName?: string;
  Status?: string;
  [key: string]: any;
}

interface Group {
  Id: number;
  Name: string;
  [key: string]: any;
}

interface TreeNode {
  type: "group" | "player";
  id: number;
  name: string;
  children: TreeNode[];
  player?: Player;
  group?: Group;
}

function buildTree(groups: Group[], players: Player[]): TreeNode[] {
  const groupMap = new Map<number, TreeNode>();
  const rootNodes: TreeNode[] = [];

  for (const group of groups) {
    const node: TreeNode = { type: "group", id: group.Id, name: group.Name, children: [], group };
    groupMap.set(group.Id, node);
    rootNodes.push(node);
  }
  for (const player of players) {
    const playerNode: TreeNode = { type: "player", id: player.Id, name: player.Name, children: [], player };
    if (player.GroupId && groupMap.has(player.GroupId)) {
      groupMap.get(player.GroupId)!.children.push(playerNode);
    } else {
      rootNodes.push(playerNode);
    }
  }
  return rootNodes;
}

function filterTree(nodes: TreeNode[], search: string): TreeNode[] {
  if (!search) return nodes;
  const lower = search.toLowerCase();
  return nodes.reduce<TreeNode[]>((acc, node) => {
    if (node.type === "player") {
      if (node.name.toLowerCase().includes(lower)) acc.push(node);
    } else {
      const filteredChildren = filterTree(node.children, search);
      if (filteredChildren.length > 0 || node.name.toLowerCase().includes(lower))
        acc.push({ ...node, children: filteredChildren });
    }
    return acc;
  }, []);
}

const INDENT = 18;

function TreeLines({ continuations, isLast }: { continuations: boolean[]; isLast: boolean }) {
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

function PlayerItem({ node, continuations, isLast }: { node: TreeNode; continuations: boolean[]; isLast: boolean }) {
  const player = node.player!;
  const { selectedPlayerId, selectPlayer } = usePlayerSelection();
  const { t } = useTheme();
  const isSelected = selectedPlayerId === player.Id;

  return (
    <div
      className={`flex items-center min-h-[24px] cursor-pointer ${isSelected ? t.selectedBg : t.hoverBg}`}
      onClick={() => selectPlayer(isSelected ? null : player.Id)}
      data-testid={`row-player-${player.Id}`}
    >
      <TreeLines continuations={continuations} isLast={isLast} />
      <div className={`w-[12px] h-[12px] border ${t.checkboxBorder} bg-transparent flex-shrink-0 mr-1.5`} />
      <span className={`text-xs truncate pr-2 ${isSelected ? "text-[#2997cc] font-medium" : t.textMuted}`}>
        {player.Name}
      </span>
    </div>
  );
}

function GroupTreeItem({ node, continuations, isLast }: { node: TreeNode; continuations: boolean[]; isLast: boolean }) {
  const [expanded, setExpanded] = useState(continuations.length < 2);
  const { selectedGroupId, selectGroup } = useGroupSelection();
  const { t } = useTheme();
  const hasChildren = node.children.length > 0;
  const isSelected = selectedGroupId === node.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleSelect = () => {
    selectGroup(node.id, node.name);
  };

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center min-h-[24px] cursor-pointer ${isSelected ? t.selectedBg : t.hoverBg}`}
        onClick={handleSelect}
        data-testid={`row-group-${node.id}`}
      >
        <TreeLines continuations={continuations} isLast={isLast} />
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className={`w-[14px] h-[14px] border ${t.checkboxBorder} bg-transparent ${t.textDim} flex items-center justify-center text-[10px] font-bold leading-none flex-shrink-0 mr-1`}
            style={{ fontFamily: "monospace" }}
            data-testid={`button-toggle-${node.id}`}
          >
            {expanded ? "−" : "+"}
          </button>
        ) : (
          <span className="w-[14px] flex-shrink-0 mr-1" />
        )}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelect}
          className="w-[12px] h-[12px] flex-shrink-0 mr-1.5 accent-[#2997cc]"
          onClick={(e) => e.stopPropagation()}
          data-testid={`checkbox-group-${node.id}`}
        />
        <span className={`text-xs truncate pr-2 ${isSelected ? "text-[#2997cc] font-semibold" : `${t.textSecondary} font-medium`}`}>
          {node.name}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child, idx) => {
            const childIsLast = idx === node.children.length - 1;
            const childContinuations = [...continuations, !isLast];
            return (
              <TreeNodeItem key={`${child.type}-${child.id}`} node={child} continuations={childContinuations} isLast={childIsLast} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function TreeNodeItem({ node, continuations, isLast }: { node: TreeNode; continuations: boolean[]; isLast: boolean }) {
  if (node.type === "player") return <PlayerItem node={node} continuations={continuations} isLast={isLast} />;
  return <GroupTreeItem node={node} continuations={continuations} isLast={isLast} />;
}

export const NavigationMenuSection = (): JSX.Element => {
  const [search, setSearch] = useState("");
  const { t } = useTheme();

  const { data: groupsData, isLoading: groupsLoading, error: groupsError, refetch: refetchGroups } = useQuery<{ groups: Group[] }>({ queryKey: ["/api/groups"], retry: 2, retryDelay: 1000 });
  const { data: playersData, isLoading: playersLoading, error: playersError, refetch: refetchPlayers } = useQuery<{ players: Player[] }>({ queryKey: ["/api/players"], refetchInterval: 30000, retry: 2, retryDelay: 1000 });
  const error = groupsError || playersError;

  const { selectedGroupId, selectGroup } = useGroupSelection();
  const isLoading = groupsLoading || playersLoading;
  const groups = groupsData?.groups || [];
  const players = playersData?.players || [];
  const tree = buildTree(groups, players);
  const filtered = filterTree(tree, search);

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      const playerGroupIds = new Set(players.map((p) => p.GroupId));
      const groupWithPlayers = groups.find((g) => playerGroupIds.has(g.Id));
      const target = groupWithPlayers || groups[0];
      selectGroup(target.Id, target.Name);
    }
  }, [groups, players, selectedGroupId, selectGroup]);

  return (
    <aside className={`w-[200px] h-full flex flex-col items-start ${t.panelBg} border-r ${t.border}`}>
      <header className={`flex items-center px-2 py-2 border-b ${t.border} w-full`}>
        <div className="inline-flex items-center gap-1.5">
          <svg className={`w-[10px] h-[10px] ${t.textDim}`} viewBox="0 0 11 10" fill="currentColor">
            <rect width="4" height="4" /><rect x="6" width="4" height="4" /><rect y="6" width="4" height="4" /><rect x="6" y="6" width="4" height="4" />
          </svg>
          <h2 className={`font-['Inter',Helvetica] font-bold ${t.textDim} text-[11px] tracking-[0] leading-4 whitespace-nowrap uppercase`} data-testid="text-players-header">
            PLAYERS
          </h2>
        </div>
      </header>

      <div className="flex flex-col items-start gap-2 p-2 w-full flex-1 overflow-hidden">
        <div className="relative w-full">
          <SearchIcon className={`absolute top-[7px] left-[8px] w-[12px] h-[12px] ${t.textFaint}`} />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-6 pr-6 py-1 ${t.inputBg} border ${t.border} rounded text-[11px] font-['Inter',Helvetica] ${t.textSecondary} placeholder:${t.textFaint} focus:outline-none focus:border-[#2997cc]`}
            data-testid="input-search-players"
          />
          <div className="absolute right-2 top-[6px]">
            <svg className={`w-[3px] h-[10px] ${t.textFaint}`} viewBox="0 0 3 11" fill="currentColor">
              <circle cx="1.5" cy="1.5" r="1.5" /><circle cx="1.5" cy="5.5" r="1.5" /><circle cx="1.5" cy="9.5" r="1.5" />
            </svg>
          </div>
        </div>

        <div className="w-full flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2Icon className={`w-4 h-4 ${t.textFaint} animate-spin`} />
            </div>
          )}
          {error && (
            <div className="text-[11px] text-red-400 px-2 py-4 text-center">
              Failed to load
              <button
                onClick={() => { refetchGroups(); refetchPlayers(); }}
                className="block mx-auto mt-2 px-3 py-1 text-[10px] text-[#2997cc] border border-[#2997cc] rounded hover:bg-[#2997cc]/10 transition-colors"
                data-testid="button-retry-load"
              >
                Retry
              </button>
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className={`text-[11px] ${t.textFaint} px-2 py-4 text-center`}>
              {search ? "No results" : "No players"}
            </div>
          )}
          <nav className="flex flex-col w-full">
            {filtered.map((node, idx) => (
              <TreeNodeItem key={`${node.type}-${node.id}`} node={node} continuations={[]} isLast={idx === filtered.length - 1} />
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
};
