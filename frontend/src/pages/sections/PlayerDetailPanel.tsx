import { usePlayerSelection } from "@/hooks/use-player-selection";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2Icon, MonitorIcon, XIcon, WifiIcon, HardDriveIcon, CpuIcon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/use-theme";

interface PlayerDetail {
  Id: number;
  Name: string;
  GroupName?: string;
  Status?: string;
  IpAddress?: string;
  MacAddress?: string;
  Version?: string;
  Resolution?: string;
  Os?: string;
  LastConnection?: string;
  DiskSpace?: string;
  Description?: string;
  [key: string]: any;
}

function DetailRow({ label, value }: { label: string; value: string | undefined }) {
  const { t } = useTheme();
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-2 py-1.5">
      <span className={`text-[11px] ${t.textDim} font-medium shrink-0`}>{label}</span>
      <span className={`text-[11px] ${t.textSecondary} text-right break-all`}>{value}</span>
    </div>
  );
}

export const PlayerDetailPanel = (): JSX.Element | null => {
  const { selectedPlayerId, selectPlayer } = usePlayerSelection();
  const { t } = useTheme();

  const { data, isLoading, error } = useQuery<{ players: PlayerDetail[] }>({
    queryKey: ["player-detail", selectedPlayerId],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/players/details", { ids: [selectedPlayerId] });
      return res.json();
    },
    enabled: !!selectedPlayerId,
  });

  if (!selectedPlayerId) return null;

  const player = data?.players?.[0];
  const isOnline = player?.Status === "Online" || player?.Status === "Connected";

  return (
    <div className={`w-72 ${t.panelBg} border-l ${t.border} flex flex-col h-full`}>
      <header className={`flex items-center justify-between p-3 border-b ${t.border}`}>
        <div className="flex items-center gap-2">
          <MonitorIcon className={`w-4 h-4 ${t.textDim}`} />
          <h2 className={`font-['Inter',Helvetica] font-bold ${t.textDim} text-[11px] tracking-[0] leading-4 whitespace-nowrap`} data-testid="text-player-detail-header">
            PLAYER DETAILS
          </h2>
        </div>
        <Button variant="ghost" size="icon" className={`h-6 w-6 ${t.hoverBg}`} onClick={() => selectPlayer(null)} data-testid="button-close-player-detail">
          <XIcon className={`w-3.5 h-3.5 ${t.textDim}`} />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className={`w-5 h-5 ${t.textFaint} animate-spin`} />
          </div>
        )}
        {error && (
          <div className="text-[11px] text-red-400 px-3 py-8 text-center">Failed to load player details</div>
        )}
        {player && (
          <div className="p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${t.cardBg} flex items-center justify-center`}>
                <MonitorIcon className={`w-5 h-5 ${isOnline ? "text-green-400" : t.textDim}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-semibold ${t.textPrimary} truncate`} data-testid="text-player-name">{player.Name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-gray-600"}`} />
                  <span className={`text-[11px] ${isOnline ? "text-green-400" : t.textDim}`} data-testid="text-player-status">{player.Status || "Unknown"}</span>
                </div>
              </div>
            </div>
            <Separator className={`my-2 ${t.separatorBg}`} />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 mb-2"><WifiIcon className={`w-3.5 h-3.5 ${t.textDim}`} /><span className={`text-[11px] font-semibold ${t.textDim}`}>Network</span></div>
              <DetailRow label="IP Address" value={player.IpAddress} />
              <DetailRow label="MAC Address" value={player.MacAddress} />
              <DetailRow label="Group" value={player.GroupName} />
            </div>
            <Separator className={`my-2 ${t.separatorBg}`} />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 mb-2"><CpuIcon className={`w-3.5 h-3.5 ${t.textDim}`} /><span className={`text-[11px] font-semibold ${t.textDim}`}>System</span></div>
              <DetailRow label="OS" value={player.Os} />
              <DetailRow label="Version" value={player.Version} />
              <DetailRow label="Resolution" value={player.Resolution} />
            </div>
            <Separator className={`my-2 ${t.separatorBg}`} />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 mb-2"><HardDriveIcon className={`w-3.5 h-3.5 ${t.textDim}`} /><span className={`text-[11px] font-semibold ${t.textDim}`}>Storage</span></div>
              <DetailRow label="Disk Space" value={player.DiskSpace} />
            </div>
            <Separator className={`my-2 ${t.separatorBg}`} />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 mb-2"><ClockIcon className={`w-3.5 h-3.5 ${t.textDim}`} /><span className={`text-[11px] font-semibold ${t.textDim}`}>Activity</span></div>
              <DetailRow label="Last Connection" value={player.LastConnection} />
              <DetailRow label="Description" value={player.Description} />
            </div>
            {(() => {
              const knownKeys = ["Id", "Name", "GroupName", "Status", "IpAddress", "MacAddress", "Version", "Resolution", "Os", "LastConnection", "DiskSpace", "Description", "Active", "GroupId"];
              const otherEntries = Object.entries(player).filter(([key, value]) => !knownKeys.includes(key) && value !== null && value !== undefined && value !== "" && typeof value !== "object");
              return otherEntries.length > 0 ? (
                <>
                  <Separator className={`my-2 ${t.separatorBg}`} />
                  <div className="space-y-0.5">
                    <span className={`text-[11px] font-semibold ${t.textDim} block mb-2`}>Other</span>
                    {otherEntries.map(([key, value]) => (<DetailRow key={key} label={key} value={String(value)} />))}
                  </div>
                </>
              ) : null;
            })()}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
