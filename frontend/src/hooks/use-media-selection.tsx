import { createContext, useContext, useState, type ReactNode } from "react";

interface MediaSelectionContextType {
  selectedMediaId: number | null;
  selectedMediaType: "media" | "template" | "feed" | null;
  selectedItem: any | null;
  selectMedia: (id: number | null, type?: "media" | "template" | "feed" | null, item?: any) => void;
}

const MediaSelectionContext = createContext<MediaSelectionContextType | null>(null);

export function MediaSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<"media" | "template" | "feed" | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const selectMedia = (id: number | null, type?: "media" | "template" | "feed" | null, item?: any) => {
    setSelectedMediaId(id);
    setSelectedMediaType(type ?? null);
    setSelectedItem(item ?? null);
  };

  return (
    <MediaSelectionContext.Provider value={{ selectedMediaId, selectedMediaType, selectedItem, selectMedia }}>
      {children}
    </MediaSelectionContext.Provider>
  );
}

export function useMediaSelection() {
  const context = useContext(MediaSelectionContext);
  if (!context) {
    throw new Error("useMediaSelection must be used within a MediaSelectionProvider");
  }
  return context;
}
