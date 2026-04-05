import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/queryClient";

interface ServerPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ServerPropertiesModal({ isOpen, onClose }: ServerPropertiesModalProps) {
  const { isDark } = useTheme();
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoAddress, setSsoAddress] = useState("");

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

  const isLoading = groupsLoading || playersLoading;
  const players = playersData?.players || [];
  const groups = groupsData?.groups || [];

  function countGroups(list: any[]): number {
    let c = 0;
    for (const g of list) {
      c++;
      if (g.children) c += countGroups(g.children);
    }
    return c;
  }

  const totalGroups = countGroups(groups);
  const totalPlayers = players.length;
  const activePlayers = players.filter((p: any) => p.Active).length;
  const inactivePlayers = totalPlayers - activePlayers;

  const labelClass = `text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`;
  const valueClass = `text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose} data-testid="server-properties-modal-backdrop">
      <div
        className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded-sm shadow-2xl w-[520px] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        data-testid="server-properties-modal"
      >
        <div className="flex items-center justify-between px-8 py-6">
          <h1 className={`text-2xl font-light tracking-[-0.5px] ${isDark ? "text-white" : "text-gray-900"}`} data-testid="text-server-properties-title">
            Server Properties
          </h1>
          <div className="flex items-center gap-6">
            <button
              className="bg-[#42aade] hover:bg-[#3894c4] text-[#0d0d0d] font-medium text-sm px-8 py-2.5 rounded shadow-sm transition-colors"
              onClick={onClose}
              data-testid="button-server-ok"
            >
              OK
            </button>
            <button
              className={`${isDark ? "text-[#64748b]" : "text-gray-500"} text-lg hover:opacity-80 transition-opacity`}
              onClick={onClose}
              data-testid="button-server-cancel"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="px-8 pb-2">
          <div className={`border-b-2 ${isDark ? "border-[#2f343c]" : "border-gray-200"}`} />
        </div>

        <div className="px-8 py-6 space-y-6">
          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>
              Server Info
            </h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={labelClass}>API Server</span>
                  <span className={valueClass} data-testid="text-api-server">saas.navori.com</span>
                </div>
                <div className="flex justify-between">
                  <span className={labelClass}>Total Groups</span>
                  <span className={valueClass} data-testid="text-total-groups">{totalGroups}</span>
                </div>
                <div className="flex justify-between">
                  <span className={labelClass}>Total Players</span>
                  <span className={valueClass} data-testid="text-total-players">{totalPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className={labelClass}>Active Players</span>
                  <span className={`text-sm font-medium text-emerald-400`} data-testid="text-active-players">{activePlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className={labelClass}>Inactive Players</span>
                  <span className={`text-sm font-medium text-red-400`} data-testid="text-inactive-players">{inactivePlayers}</span>
                </div>
              </div>
            )}
          </div>

          <div className={`border-t ${isDark ? "border-[#1f2228]" : "border-gray-200"} pt-6`}>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>
              Authenticat254b3b3e-89cf-44b3-9c0f-9529bfe79e36:8f1f732d7f660e41104a3d0edf20b8acion
            </h3>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>SSO</span>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {ssoEnabled ? "Active" : "Inactive"}
                </span>
                <button
                  className={`relative w-11 h-6 rounded-full transition-colors ${ssoEnabled ? "bg-[#42aade]" : isDark ? "bg-[#2f343c]" : "bg-gray-300"}`}
                  onClick={() => setSsoEnabled(!ssoEnabled)}
                  data-testid="toggle-sso"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ssoEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
            <div>
              <label className={`block text-sm mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>SSO Address</label>
              <div className={`border-b ${isDark ? "border-[#1f2228]" : "border-gray-200"} pb-1`}>
                <input
                  type="text"
                  value={ssoAddress}
                  onChange={(e) => setSsoAddress(e.target.value)}
                  placeholder="https://sso.example.com"
                  disabled={!ssoEnabled}
                  className={`w-full bg-transparent text-sm ${isDark ? "text-[#c8d2e0] placeholder:text-[#546e7a]" : "text-gray-700 placeholder:text-gray-400"} outline-none ${!ssoEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  data-testid="input-sso-address"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
