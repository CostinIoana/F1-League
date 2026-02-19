import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSessionData } from "./api";
import { SessionContext } from "./context";
import type { SessionData } from "./types";

const SEASON_STORAGE_KEY = "f1league.selectedSeason";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSessionData().then((data) => {
      if (!active) {
        return;
      }

      const persistedSeason = localStorage.getItem(SEASON_STORAGE_KEY);
      const selectedSeason =
        persistedSeason && data.seasons.includes(persistedSeason)
          ? persistedSeason
          : data.selectedSeason;

      setSession({ ...data, selectedSeason });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const setSelectedSeason = (season: string) => {
    setSession((current) => {
      if (!current || !current.seasons.includes(season)) {
        return current;
      }
      localStorage.setItem(SEASON_STORAGE_KEY, season);
      return { ...current, selectedSeason: season };
    });
  };

  const value = useMemo(
    () => ({
      session,
      loading,
      setSelectedSeason,
    }),
    [session, loading]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
