import { createContext } from "react";
import type { SessionData } from "./types";

export type SessionContextValue = {
  session: SessionData | null;
  loading: boolean;
  setSelectedSeason: (season: string) => void;
};

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);
