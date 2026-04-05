import { useTheme } from "@/hooks/use-theme";
import { Download, ExternalLink } from "lucide-react";

interface DownloadPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLAYERS = [
  {
    brand: "Windows",
    model: "Windows 10/11 64-bit",
    serverUrl: "https://saas.navori.com",
    installer: "QL Player Standard - Windows 64 bits",
    guide: true,
    setup: true,
  },
  {
    brand: "ChromeOS",
    model: "Any ChromeOS device",
    serverUrl: "https://saas.navori.com",
    installer: "QL Player for ChromeOS",
    guide: true,
    setup: true,
  },
  {
    brand: "Generic",
    model: "Any Android device",
    serverUrl: "https://saas.navori.com",
    installer: "QL Player for Android",
    guide: true,
    setup: false,
  },
  {
    brand: "Samsung",
    model: "Tizen 4.0+",
    serverUrl: "https://saas.navori.com",
    installer: "QL Player for Samsung Tizen",
    guide: true,
    setup: true,
  },
  {
    brand: "LG",
    model: "webOS 3.0+",
    serverUrl: "https://saas.navori.com",
    installer: "QL Player for LG webOS",
    guide: true,
    setup: true,
  },
  {
    brand: "Sony",
    model: "BRAVIA VH1 - Android 10",
    serverUrl: "https://saas.navori.com",
    installer: "QL Player for Sony BRAVIA",
    guide: true,
    setup: false,
  },
  {
    brand: "Philips",
    model: "D Line 2021 - Android 8",
    serverUrl: "https://saas.navori.com",
    installer: "QL Player for Philips",
    guide: true,
    setup: false,
  },
  {
    brand: "BrightSign",
    model: "XT/XD/HD Series",
    serverUrl: "https://saas.navori.com",
    installer: "QL Player for BrightSign",
    guide: true,
    setup: true,
  },
  {
    brand: "Innes",
    model: "TAB10s / AMP300",
    serverUrl: "https://saas.navori.com",
    installer: "QL Player for Innes TAB/AMP",
    guide: false,
    setup: false,
  },
  {
    brand: "Innes",
    model: "DMB400 / SMA300",
    serverUrl: "https://saas.navori.com",
    installer: "QL Player for Innes DMB/SMA",
    guide: false,
    setup: false,
  },
  {
    brand: "Navori",
    model: "Stix 3700",
    serverUrl: "https://saas.navori.com",
    installer: "Navori Stix Player",
    guide: true,
    setup: true,
  },
  {
    brand: "Navori",
    model: "Stix 3800",
    serverUrl: "https://saas.navori.com",
    installer: "Navori Stix 3800 Player",
    guide: true,
    setup: true,
  },
];

export function DownloadPlayerModal({ isOpen, onClose }: DownloadPlayerModalProps) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose} data-testid="download-player-modal-backdrop">
      <div
        className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded-sm shadow-2xl w-[1100px] max-h-[85vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        data-testid="download-player-modal"
      >
        <div className="flex items-center justify-between px-8 py-6">
          <h1 className={`text-2xl font-light tracking-[-0.5px] ${isDark ? "text-white" : "text-gray-900"}`} data-testid="text-download-player-title">
            Download QL player
          </h1>
          <div className="flex items-center gap-6">
            <button
              className="bg-[#42aade] hover:bg-[#3894c4] text-[#0d0d0d] font-medium text-sm px-8 py-2.5 rounded shadow-sm transition-colors"
              onClick={onClose}
              data-testid="button-download-ok"
            >
              OK
            </button>
          </div>
        </div>

        <div className="px-8 pb-2">
          <div className={`border-b-2 ${isDark ? "border-[#2f343c]" : "border-gray-200"}`} />
        </div>

        <div className={`px-8 py-3`}>
          <p className={`text-sm ${isDark ? "text-[#546e7a]" : "text-gray-500"}`} data-testid="text-server-url-label">
            Server URL to use for activation
          </p>
        </div>

        <div className="px-8 py-4 flex-1 overflow-auto">
          <table className="w-full" data-testid="table-download-players">
            <thead>
              <tr className={`border-b ${isDark ? "border-[#1f2228]" : "border-gray-200"}`}>
                <th className={`text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Brand</th>
                <th className={`text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Model</th>
                <th className={`text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Server URL</th>
                <th className={`text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Installer</th>
                <th className={`text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Guide</th>
                <th className={`text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Setup</th>
                <th className={`text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#42aade]" : "text-blue-600"}`}>Download</th>
              </tr>
            </thead>
            <tbody>
              {PLAYERS.map((player, idx) => (
                <tr
                  key={idx}
                  className={`border-b ${isDark ? "border-[#1a1e24]" : "border-gray-100"} ${isDark ? "hover:bg-[#1a2a3a]/30" : "hover:bg-gray-50"} transition-colors`}
                  data-testid={`row-download-player-${idx}`}
                >
                  <td className={`py-2.5 pr-4 text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>{player.brand}</td>
                  <td className={`py-2.5 pr-4 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{player.model}</td>
                  <td className={`py-2.5 pr-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{player.serverUrl}</td>
                  <td className={`py-2.5 pr-4 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{player.installer}</td>
                  <td className="py-2.5 px-2 text-center">
                    {player.guide && (
                      <button
                        className="text-[#42aade] hover:text-[#3894c4] transition-colors inline-flex items-center justify-center"
                        data-testid={`button-guide-${idx}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {player.setup && (
                      <button
                        className="text-[#42aade] hover:text-[#3894c4] transition-colors inline-flex items-center justify-center"
                        data-testid={`button-setup-${idx}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      className="text-[#42aade] hover:text-[#3894c4] transition-colors inline-flex items-center justify-center"
                      data-testid={`button-download-${idx}`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
