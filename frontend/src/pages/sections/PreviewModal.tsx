import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { XIcon } from "lucide-react";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreviewModal({ isOpen, onClose }: PreviewModalProps) {
  const { t, isDark } = useTheme();
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const [fromDate, setFromDate] = useState(today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  const [fromTime, setFromTime] = useState("12:00:00AM");
  const [toTime, setToTime] = useState("11:59:59PM");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose} data-testid="preview-modal-backdrop">
      <div
        className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded-sm shadow-2xl w-full max-w-[1000px] max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        data-testid="preview-modal"
      >
        <div className={`flex items-center justify-between px-8 pt-6 pb-6 ${isDark ? "border-white/5" : "border-gray-200"}`}>
          <h1 className={`text-[30px] font-normal tracking-[-0.75px] ${isDark ? "text-[#c8d2e0]" : "text-gray-800"}`} data-testid="text-preview-date">
            {dateStr}
          </h1>
          <div className="flex items-center gap-4">
            <button
              className="bg-[#40a7da] hover:bg-[#3594c2] text-[#0d0d0d] font-medium text-sm px-6 py-2 rounded transition-colors"
              onClick={onClose}
              data-testid="button-preview-ok"
            >
              OK
            </button>
            <button
              className={`${isDark ? "text-[#546e7a]" : "text-gray-500"} font-medium text-sm px-2 py-2 hover:opacity-80 transition-opacity`}
              onClick={onClose}
              data-testid="button-preview-cancel"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-8 pb-8">
          <div className="flex gap-8">
            <div className={`w-[193px] flex-shrink-0 pr-4 border-r ${isDark ? "border-[#2c2c2c]" : "border-gray-200"}`}>
              <h2 className={`font-bold text-sm uppercase tracking-wider ${isDark ? "text-[#546e7a]" : "text-gray-500"} mb-6`}>
                PERIOD
              </h2>

              <div className="space-y-6">
                <div>
                  <div className={`border-b ${isDark ? "border-[#9e9e9e]" : "border-gray-300"} pb-1`}>
                    <input
                      type="text"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className={`w-full bg-transparent text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-800"} outline-none py-1`}
                      data-testid="input-preview-from-date"
                    />
                  </div>
                  <span className={`text-[10px] uppercase ${isDark ? "text-[#9ca3af]" : "text-gray-400"} mt-1 block`}>FROM</span>
                </div>

                <div>
                  <div className={`border-b ${isDark ? "border-[#9e9e9e]" : "border-gray-300"} pb-1`}>
                    <input
                      type="text"
                      value={fromTime}
                      onChange={(e) => setFromTime(e.target.value)}
                      className={`w-full bg-transparent text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-800"} outline-none py-1`}
                      data-testid="input-preview-from-time"
                    />
                  </div>
                  <span className={`text-[10px] uppercase ${isDark ? "text-[#9ca3af]" : "text-gray-400"} mt-1 block`}>FROM</span>
                </div>

                <div>
                  <div className={`border-b ${isDark ? "border-[#9e9e9e]" : "border-gray-300"} pb-1`}>
                    <input
                      type="text"
                      value={toTime}
                      onChange={(e) => setToTime(e.target.value)}
                      className={`w-full bg-transparent text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-800"} outline-none py-1`}
                      data-testid="input-preview-to-time"
                    />
                  </div>
                  <span className={`text-[10px] uppercase ${isDark ? "text-[#9ca3af]" : "text-gray-400"} mt-1 block`}>TO</span>
                </div>
              </div>
            </div>

            <div className={`flex-shrink-0 w-[260px] pr-4 border-r ${isDark ? "border-[#2c2c2c]" : "border-gray-200"}`}>
              <h2 className={`font-bold text-sm uppercase tracking-wider ${isDark ? "text-[#546e7a]" : "text-gray-500"} mb-6`}>
                SEARCH ON
              </h2>

              <div className="space-y-6">
                <div>
                  <div className={`border-b ${isDark ? "border-[#9e9e9e]" : "border-gray-300"} pb-1`}>
                    <span className={`text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-800"} block py-1`}>Content</span>
                  </div>
                  <span className={`text-[10px] uppercase ${isDark ? "text-[#9ca3af]" : "text-gray-400"} mt-1 block`}>CONTENT</span>
                </div>

                <div>
                  <div className={`border-b ${isDark ? "border-[#9e9e9e]" : "border-gray-300"} pb-1`}>
                    <span className={`text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-800"} block py-1`}>Player</span>
                  </div>
                  <span className={`text-[10px] uppercase ${isDark ? "text-[#9ca3af]" : "text-gray-400"} mt-1 block`}>PLAYER</span>
                </div>

                <div>
                  <div className={`border-b ${isDark ? "border-[#9e9e9e]" : "border-gray-300"} pb-1`}>
                    <span className={`text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-800"} block py-1`}>Playlist</span>
                  </div>
                  <span className={`text-[10px] uppercase ${isDark ? "text-[#9ca3af]" : "text-gray-400"} mt-1 block`}>PLAYLIST</span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className={`font-bold text-sm uppercase tracking-wider ${isDark ? "text-[#546e7a]" : "text-gray-500"} mb-6`}>
                RESULTS
              </h2>

              <div className={`border ${isDark ? "border-[#2c2c2c]" : "border-gray-200"} rounded overflow-hidden`}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className={`${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"}`}>
                      <th className={`text-left px-3 py-2 font-medium ${isDark ? "text-[#546e7a]" : "text-gray-500"} uppercase`}>Time</th>
                      <th className={`text-left px-3 py-2 font-medium ${isDark ? "text-[#546e7a]" : "text-gray-500"} uppercase`}>Player</th>
                      <th className={`text-left px-3 py-2 font-medium ${isDark ? "text-[#546e7a]" : "text-gray-500"} uppercase`}>Content</th>
                      <th className={`text-left px-3 py-2 font-medium ${isDark ? "text-[#546e7a]" : "text-gray-500"} uppercase`}>Playlist</th>
                      <th className={`text-left px-3 py-2 font-medium ${isDark ? "text-[#546e7a]" : "text-gray-500"} uppercase`}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className={`text-center py-12 ${isDark ? "text-[#546e7a]" : "text-gray-400"} text-sm`}>
                        No preview data available. Select search criteria and click OK.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
