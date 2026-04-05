import { createContext, useContext, useState, type ReactNode } from "react";

interface PlayerSelectionContextType {
  selectedPlayerId: number | null;
  selectPlayer: (id: number | null) => void;
}

const PlayerSelectionContext = createContext<PlayerSelectionContextType | null>(null);

export function PlayerSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  return (
    <PlayerSelectionContext.Provider value={{ selectedPlayerId, selectPlayer: setSelectedPlayerId }}>
      {children}
    </PlayerSelectionContext.Provider>
  );
}

export function usePlayerSelection() {
  const context = useContext(PlayerSelectionContext);
  if (!context) {
    throw new Error("usePlayerSelection must be used within a PlayerSelectionProvider");
  }
  return context;
}
