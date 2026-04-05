import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";
import { ChevronDown, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/queryClient";

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Player {
  Id: number;
  Name: string;
  GroupId: number;
  Active: boolean;
  Version?: string;
  Resolution?: string;
  IpAddress?: string;
  LastConnection?: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PlayerProfileModal({ isOpen, onClose }: PlayerProfileModalProps) {
  const { isDark } = useTheme();
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [event1Days, setEvent1Days] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [event2Days, setEvent2Days] = useState<string[]>([]);
  const [screenOnKey, setScreenOnKey] = useState("07:00");
  const [screenOffKey, setScreenOffKey] = useState("22:00");
  const [smartEfficiency, setSmartEfficiency] = useState(false);
  const [defaultMediaName, setDefaultMediaName] = useState("");
  const [defaultMediaDuration, setDefaultMediaDuration] = useState("10");
  const [checkEvery, setCheckEvery] = useState("1 Hour");
  const [checkAt, setCheckAt] = useState("03:00");
  const [updateOn, setUpdateOn] = useState("Daily");
  const [updateAt, setUpdateAt] = useState("04:00");

  const { data: playersData, isLoading } = useQuery({
    queryKey: ["/api/players"],
    queryFn: async () => {
      const res = await fetch(API_BASE + "/api/players", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isOpen,
  });

  const players: Player[] = playersData?.players || [];
  const selectedPlayer = players.find(p => p.Id === selectedPlayerId) || null;

  useEffect(() => {
    if (players.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(players[0].Id);
    }
  }, [players, selectedPlayerId]);

  if (!isOpen) return null;

  const toggleDay = (day: string, eventDays: string[], setDays: (d: string[]) => void) => {
    setDays(eventDays.includes(day) ? eventDays.filter((d) => d !== day) : [...eventDays, day]);
  };

  const sectionHeaderClass = `text-sm font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`;
  const labelClass = `text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`;
  const valueClass = `text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`;
  const inputClass = `w-full px-3 py-2 text-sm rounded ${isDark ? "bg-[#121a24] text-gray-200 border-[#1f2228] placeholder:text-gray-600" : "bg-gray-50 text-gray-700 border-gray-200 placeholder:text-gray-400"} border outline-none focus:border-[#42aade]`;
  const sectionBorderClass = `border-b ${isDark ? "border-[#1f2228]" : "border-gray-200"} pb-2 mb-4`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose} data-testid="player-profile-modal-backdrop">
      <div
        className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded-sm shadow-2xl w-[900px] max-h-[85vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        data-testid="player-profile-modal"
      >
        <div className="flex items-center justify-between px-8 py-6">
          <h1 className={`text-2xl font-light tracking-[-0.5px] ${isDark ? "text-white" : "text-gray-900"}`} data-testid="text-player-profile-title">
            Player Technical Profile
          </h1>
          <div className="flex items-center gap-6">
            <button
              className="bg-[#42aade] hover:bg-[#3894c4] text-[#0d0d0d] font-medium text-sm px-8 py-2.5 rounded shadow-sm transition-colors"
              onClick={onClose}
              data-testid="button-profile-ok"
            >
              OK
            </button>
            <button
              className={`${isDark ? "text-[#64748b]" : "text-gray-500"} text-lg hover:opacity-80 transition-opacity`}
              onClick={onClose}
              data-testid="button-profile-cancel"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="px-8 pb-4">
          <div className={`border-b-2 ${isDark ? "border-[#2f343c]" : "border-gray-200"}`} />
        </div>

        <div className="px-8 pb-4">
          <div className="flex items-center gap-3">
            <span className={labelClass}>Select Player</span>
            <div className="relative flex-1 max-w-xs">
              <select
                value={selectedPlayerId || ""}
                onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                className={`${inputClass} appearance-none pr-8`}
                data-testid="select-player"
              >
                {isLoading ? (
                  <option>Loading...</option>
                ) : (
                  players.map(p => (
                    <option key={p.Id} value={p.Id}>{p.Name}</option>
                  ))
                )}
              </select>
              <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${isDark ? "text-gray-500" : "text-gray-400"}`} />
            </div>
          </div>

          {selectedPlayer && (
            <div className={`mt-3 grid grid-cols-4 gap-4`}>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded p-2`}>
                <p className={`text-[10px] uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>Status</p>
                <p className={`text-sm font-medium ${selectedPlayer.Active ? "text-emerald-400" : "text-red-400"}`}>{selectedPlayer.Active ? "Online" : "Offline"}</p>
              </div>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded p-2`}>
                <p className={`text-[10px] uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>Version</p>
                <p className={`text-sm ${isDark ? "text-gray-200" : "text-gray-700"}`}>{selectedPlayer.Version || "-"}</p>
              </div>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded p-2`}>
                <p className={`text-[10px] uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>Resolution</p>
                <p className={`text-sm ${isDark ? "text-gray-200" : "text-gray-700"}`}>{selectedPlayer.Resolution || "-"}</p>
              </div>
              <div className={`${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-gray-50 border-gray-200"} border rounded p-2`}>
                <p className={`text-[10px] uppercase ${isDark ? "text-gray-500" : "text-gray-400"}`}>IP Address</p>
                <p className={`text-sm ${isDark ? "text-gray-200" : "text-gray-700"}`}>{selectedPlayer.IpAddress || "-"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-8">
          <div>
            <div className={sectionBorderClass}>
              <h3 className={sectionHeaderClass} data-testid="text-display-control-title">Display Control</h3>
            </div>
            <div className="space-y-6">
              <div>
                <span className={`${labelClass} block mb-2`}>Event 1</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <button key={`e1-${day}`} onClick={() => toggleDay(day, event1Days, setEvent1Days)}
                      className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${event1Days.includes(day) ? "bg-[#42aade] text-[#0d0d0d]" : isDark ? "bg-[#121a24] text-gray-400 border border-[#1f2228]" : "bg-gray-100 text-gray-500 border border-gray-200"}`}
                      data-testid={`button-event1-${day.toLowerCase()}`}>{day}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className={`${labelClass} block mb-2`}>Event 2</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <button key={`e2-${day}`} onClick={() => toggleDay(day, event2Days, setEvent2Days)}
                      className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${event2Days.includes(day) ? "bg-[#42aade] text-[#0d0d0d]" : isDark ? "bg-[#121a24] text-gray-400 border border-[#1f2228]" : "bg-gray-100 text-gray-500 border border-gray-200"}`}
                      data-testid={`button-event2-${day.toLowerCase()}`}>{day}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className={`${labelClass} block mb-1.5`}>Screen On</span>
                  <input type="time" value={screenOnKey} onChange={(e) => setScreenOnKey(e.target.value)} className={inputClass} data-testid="input-screen-on" />
                </div>
                <div>
                  <span className={`${labelClass} block mb-1.5`}>Screen Off</span>
                  <input type="time" value={screenOffKey} onChange={(e) => setScreenOffKey(e.target.value)} className={inputClass} data-testid="input-screen-off" />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer" data-testid="checkbox-smart-efficiency">
                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${smartEfficiency ? "bg-[#42aade] border-[#42aade]" : isDark ? "border-[#546e7a]" : "border-gray-400"}`} onClick={() => setSmartEfficiency(!smartEfficiency)}>
                  {smartEfficiency && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                </div>
                <span className={valueClass}>Smart Efficiency</span>
              </label>
            </div>
          </div>

          <div>
            <div className={sectionBorderClass}>
              <h3 className={sectionHeaderClass} data-testid="text-default-media-title">Default Media</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className={`${labelClass} block mb-1.5`}>Name</span>
                <input type="text" value={defaultMediaName} onChange={(e) => setDefaultMediaName(e.target.value)} placeholder="Media name" className={inputClass} data-testid="input-default-media-name" />
              </div>
              <div>
                <span className={`${labelClass} block mb-1.5`}>Duration (s)</span>
                <input type="text" value={defaultMediaDuration} onChange={(e) => setDefaultMediaDuration(e.target.value)} placeholder="10" className={inputClass} data-testid="input-default-media-duration" />
              </div>
            </div>
          </div>

          <div>
            <div className={sectionBorderClass}>
              <h3 className={sectionHeaderClass} data-testid="text-software-update-title">Player Software Update</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className={`${labelClass} block mb-1.5`}>Check Every</span>
                  <div className="relative">
                    <select value={checkEvery} onChange={(e) => setCheckEvery(e.target.value)} className={`${inputClass} appearance-none pr-8`} data-testid="select-check-every">
                      <option value="30 Min">30 Min</option>
                      <option value="1 Hour">1 Hour</option>
                      <option value="2 Hours">2 Hours</option>
                      <option value="6 Hours">6 Hours</option>
                      <option value="12 Hours">12 Hours</option>
                      <option value="24 Hours">24 Hours</option>
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                  </div>
                </div>
                <div>
                  <span className={`${labelClass} block mb-1.5`}>At</span>
                  <input type="time" value={checkAt} onChange={(e) => setCheckAt(e.target.value)} className={inputClass} data-testid="input-check-at" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className={`${labelClass} block mb-1.5`}>Update Player On</span>
                  <div className="relative">
                    <select value={updateOn} onChange={(e) => setUpdateOn(e.target.value)} className={`${inputClass} appearance-none pr-8`} data-testid="select-update-on">
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                    <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                  </div>
                </div>
                <div>
                  <span className={`${labelClass} block mb-1.5`}>At</span>
                  <input type="time" value={updateAt} onChange={(e) => setUpdateAt(e.target.value)} className={inputClass} data-testid="input-update-at" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
