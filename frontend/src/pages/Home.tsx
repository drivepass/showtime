import { DashboardMainSection } from "./sections/DashboardMainSection";
import { MediaTemplateListSection } from "./sections/MediaTemplateListSection";
import { NavigationMenuSection } from "./sections/NavigationMenuSection";
import { PlaylistContentSection } from "./sections/PlaylistContentSection";
import { TopNavigationBarSection } from "./sections/TopNavigationBarSection";
import { PlayerDetailPanel } from "./sections/PlayerDetailPanel";
import { PlayerSelectionProvider } from "@/hooks/use-player-selection";
import { GroupSelectionProvider } from "@/hooks/use-group-selection";
import { MediaSelectionProvider } from "@/hooks/use-media-selection";
import { MediaDetailPanel } from "./sections/MediaDetailPanel";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";

function HomeContent() {
  const { t } = useTheme();
  return (
    <div className={`${t.pageBg} w-full min-w-[1728px] min-h-screen flex flex-col ${t.textPrimary}`}>
      <TopNavigationBarSection />
      <div className="flex flex-1 overflow-hidden">
        <NavigationMenuSection />
        <MediaTemplateListSection />
        <PlaylistContentSection />
        <DashboardMainSection />
        <PlayerDetailPanel />
        <MediaDetailPanel />
      </div>
    </div>
  );
}

export const Home = (): JSX.Element => {
  return (
    <ThemeProvider>
      <GroupSelectionProvider>
        <PlayerSelectionProvider>
          <MediaSelectionProvider>
            <HomeContent />
          </MediaSelectionProvider>
        </PlayerSelectionProvider>
      </GroupSelectionProvider>
    </ThemeProvider>
  );
};
