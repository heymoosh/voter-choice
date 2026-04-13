"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ResearchModeState {
  isResearch: boolean;
  setResearch: (v: boolean) => void;
}

const ResearchModeContext = createContext<ResearchModeState>({
  isResearch: false,
  setResearch: () => {},
});

export function ResearchModeProvider({ children }: { children: ReactNode }) {
  const [isResearch, setResearch] = useState(false);
  return (
    <ResearchModeContext.Provider value={{ isResearch, setResearch }}>
      {children}
    </ResearchModeContext.Provider>
  );
}

export function useResearchMode() {
  return useContext(ResearchModeContext);
}
