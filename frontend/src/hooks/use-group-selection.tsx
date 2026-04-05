import { createContext, useContext, useState, type ReactNode } from "react";

interface GroupSelectionContextType {
  selectedGroupId: number | null;
  selectedGroupName: string | null;
  selectGroup: (id: number | null, name?: string | null) => void;
}

const GroupSelectionContext = createContext<GroupSelectionContextType | null>(null);

export function GroupSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);

  const selectGroup = (id: number | null, name?: string | null) => {
    setSelectedGroupId(id);
    setSelectedGroupName(name ?? null);
  };

  return (
    <GroupSelectionContext.Provider value={{ selectedGroupId, selectedGroupName, selectGroup }}>
      {children}
    </GroupSelectionContext.Provider>
  );
}

export function useGroupSelection() {
  const context = useContext(GroupSelectionContext);
  if (!context) {
    throw new Error("useGroupSelection must be used within a GroupSelectionProvider");
  }
  return context;
}
