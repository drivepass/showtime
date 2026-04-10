import { LogOut, SunIcon, MoonIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { DomainUserModal } from "./DomainUserModal";
import { TagAssignmentModal } from "./TagAssignmentModal";
import { PlayerProfileModal } from "./PlayerProfileModal";
import { DownloadPlayerModal } from "./DownloadPlayerModal";
import { StixPlayersModal } from "./StixPlayersModal";
import { ServerPropertiesModal } from "./ServerPropertiesModal";

interface TopNavProps {
  activeTab?: "home" | "monitoring" | "analytics";
}

type AdminModal = "domain" | "tags" | "playerProfile" | "download" | "stix" | "server" | null;

export const TopNavigationBarSection = ({ activeTab = "home" }: TopNavProps): JSX.Element => {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { isDark, toggleTheme, t } = useTheme();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<AdminModal>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        avatarRef.current && !avatarRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [activeModal]);

  const handleLogout = async () => {
    setAvatarMenuOpen(false);
    await logout();
    setLocation("/login");
  };

  const openModal = (modal: AdminModal) => {
    setActiveModal(modal);
    setAvatarMenuOpen(false);
  };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";

  const modals = (
    <>
      <DomainUserModal isOpen={activeModal === "domain"} onClose={() => setActiveModal(null)} />
      <TagAssignmentModal isOpen={activeModal === "tags"} onClose={() => setActiveModal(null)} />
      <PlayerProfileModal isOpen={activeModal === "playerProfile"} onClose={() => setActiveModal(null)} />
      <DownloadPlayerModal isOpen={activeModal === "download"} onClose={() => setActiveModal(null)} />
      <StixPlayersModal isOpen={activeModal === "stix"} onClose={() => setActiveModal(null)} />
      <ServerPropertiesModal isOpen={activeModal === "server"} onClose={() => setActiveModal(null)} />
    </>
  );

  return (
    <>
      <header className={`flex h-10 items-center justify-between w-full ${isDark ? "bg-[#0e1620]" : "bg-white"} border-b ${t.border} z-10 relative`}>
        <nav className="flex items-center h-full">
          <div className={`flex items-center justify-center h-full px-3 ${isDark ? "bg-[#0a0e14]" : "bg-black"} border-r ${t.border}`} data-testid="logo-navori">
            <img
              className="w-[30px] h-[30px]"
              alt="Navori Logo"
              src="/figmaAssets/button-2.svg"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
              }}
            />
          </div>

          <div
            className={`flex items-center justify-center h-full px-3 ${activeTab === "home" ? "bg-[#2997cc]" : isDark ? "bg-[#0a0e14]" : "bg-gray-100"} border-r ${t.border} cursor-pointer transition-colors`}
            onClick={() => setLocation("/")}
            data-testid="button-home"
          >
            <svg className={`w-[14px] h-[12px] ${activeTab === "home" ? "text-white" : t.textDim}`} viewBox="0 0 15 13" fill="currentColor">
              <path d="M6 0L7.5 2H15V13H0V0H6Z" />
            </svg>
          </div>

          <a
            className={`flex items-center justify-center h-full px-5 border-r ${t.border} cursor-pointer ${activeTab === "monitoring" ? "bg-[#2997cc]" : ""} ${t.hoverBg} transition-colors`}
            onClick={() => setLocation("/monitoring")}
            data-testid="link-monitoring"
          >
            <span className={`font-['Inter',Helvetica] font-medium ${activeTab === "monitoring" ? "text-white" : t.textMuted} text-[13px] leading-5 whitespace-nowrap`}>
              MONITORING
            </span>
          </a>

          <a
            className={`flex items-center justify-center h-full px-5 border-r ${t.border} cursor-pointer ${activeTab === "analytics" ? "bg-[#2997cc]" : ""} ${t.hoverBg} transition-colors`}
            onClick={() => setLocation("/analytics/content")}
            data-testid="link-analytics"
          >
            <span className={`font-['Inter',Helvetica] font-medium ${activeTab === "analytics" ? "text-white" : t.textMuted} text-[13px] leading-5 whitespace-nowrap`}>
              ANALYTICS
            </span>
          </a>
        </nav>

        <div className="flex items-center gap-3 px-3">
          <button
            className={`w-7 h-7 rounded-full ${t.cardBg} border ${t.borderAccent} flex items-center justify-center ${t.hoverBg} transition-colors`}
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            data-testid="button-theme-toggle"
          >
            {isDark ? (
              <SunIcon className={`w-3.5 h-3.5 ${t.textDim}`} />
            ) : (
              <MoonIcon className={`w-3.5 h-3.5 ${t.textDim}`} />
            )}
          </button>

          <div ref={avatarRef}>
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              data-testid="button-user-menu"
            >
              <div className="flex flex-col items-end pr-1">
                <span className="font-['Inter',Helvetica] font-medium text-[#2997cc] text-xs leading-[15px] whitespace-nowrap" data-testid="text-username">
                  {user?.username || "Guest"}
                </span>
                <span className={`font-['Inter',Helvetica] font-normal ${t.textDim} text-[10px] leading-4 whitespace-nowrap`} data-testid="text-org">
                  Systemrapid - 56059
                </span>
              </div>

              <div className="bg-[#1A91E2] rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0" data-testid="img-avatar">
                <span className="font-['Inter',Helvetica] font-semibold text-white text-[10px]">{initials}</span>
              </div>
            </div>

            {avatarMenuOpen && createPortal(
              <div
                ref={dropdownRef}
                className={`fixed w-56 ${isDark ? "bg-[#121a24] border-[#1e2e3e]" : "bg-white border-gray-200"} border rounded-lg shadow-xl py-1`}
                style={{
                  zIndex: 99999,
                  top: avatarRef.current ? avatarRef.current.getBoundingClientRect().bottom + 4 : 0,
                  right: avatarRef.current ? window.innerWidth - avatarRef.current.getBoundingClientRect().right : 0,
                }}
              >
                <div className={`px-4 py-2 border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-100"} select-none cursor-default`} data-testid="text-logged-in-as">
                  <p className={`text-[11px] ${isDark ? "text-[#6b7a8d]" : "text-gray-500"}`}>Logged in as: <span className="font-medium">{user?.username || "Guest"}</span></p>
                  <p className={`text-[10px] ${isDark ? "text-[#546e7a]" : "text-gray-400"}`}>Systemrapid - 56059</p>
                </div>

                <div className={`py-1 border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-100"}`}>
                  <button className={`w-full px-4 py-2 text-left text-[12px] ${isDark ? "text-[#c8d2e0] hover:bg-[#1a2a3a]" : "text-gray-700 hover:bg-gray-50"} transition-colors`} onClick={() => openModal("domain")} data-testid="menu-domain-user">
                    Domain & User Management
                  </button>
                  <button className={`w-full px-4 py-2 text-left text-[12px] ${isDark ? "text-[#c8d2e0] hover:bg-[#1a2a3a]" : "text-gray-700 hover:bg-gray-50"} transition-colors`} onClick={() => openModal("tags")} data-testid="menu-tag-assignment">
                    Tag Assignment
                  </button>
                  <button className={`w-full px-4 py-2 text-left text-[12px] ${isDark ? "text-[#c8d2e0] hover:bg-[#1a2a3a]" : "text-gray-700 hover:bg-gray-50"} transition-colors`} onClick={() => openModal("playerProfile")} data-testid="menu-player-profile">
                    Player Technical Profile
                  </button>
                </div>

                <div className={`py-1 border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-100"}`}>
                  <button className={`w-full px-4 py-2 text-left text-[12px] ${isDark ? "text-[#c8d2e0] hover:bg-[#1a2a3a]" : "text-gray-700 hover:bg-gray-50"} transition-colors`} onClick={() => openModal("download")} data-testid="menu-download-player">
                    Download QL Player
                  </button>
                  <button className={`w-full px-4 py-2 text-left text-[12px] ${isDark ? "text-[#c8d2e0] hover:bg-[#1a2a3a]" : "text-gray-700 hover:bg-gray-50"} transition-colors`} onClick={() => openModal("stix")} data-testid="menu-stix-players">
                    Stix Media Players
                  </button>
                </div>

                <div className={`py-1 border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-100"}`}>
                  <button className={`w-full px-4 py-2 text-left text-[12px] ${isDark ? "text-[#c8d2e0] hover:bg-[#1a2a3a]" : "text-gray-700 hover:bg-gray-50"} transition-colors`} onClick={() => openModal("server")} data-testid="menu-server-properties">
                    Server Properties
                  </button>
                </div>

                <div className={`py-1 border-b ${isDark ? "border-[#1e2e3e]" : "border-gray-100"}`}>
                  <button className={`w-full px-4 py-2 text-left text-[12px] ${isDark ? "text-[#c8d2e0] hover:bg-[#1a2a3a]" : "text-gray-700 hover:bg-gray-50"} transition-colors`} onClick={() => { setAvatarMenuOpen(false); setLocation("/template-designer"); }} data-testid="menu-template-designer">
                    Template Designer
                  </button>
                  <button className={`w-full px-4 py-2 text-left text-[12px] ${isDark ? "text-[#c8d2e0] hover:bg-[#1a2a3a]" : "text-gray-700 hover:bg-gray-50"} transition-colors`} onClick={() => { setAvatarMenuOpen(false); setLocation("/ai-content-studio"); }} data-testid="menu-ai-studio">
                    AI Content Studio
                  </button>
                </div>

                <div className="py-1">
                  <button className={`w-full px-4 py-2 text-left text-[12px] ${isDark ? "text-red-400" : "text-red-600"} hover:bg-[#ef4444] hover:text-white transition-colors flex items-center gap-2`} onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="w-3.5 h-3.5" />
                    Log Out
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </header>

      {createPortal(modals, document.body)}
    </>
  );
};
