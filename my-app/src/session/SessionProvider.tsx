import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSessionData } from "./api";
import { SessionContext } from "./context";
import type { SessionData } from "./types";

const SEASON_STORAGE_KEY = "f1league.selectedSeasonId";

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
      const selectedSeasonId =
        persistedSeason && data.seasons.some((season) => season.id === persistedSeason)
          ? persistedSeason
          : data.selectedSeasonId;

      setSession({ ...data, selectedSeasonId });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const setSelectedSeason = (seasonId: string) => {
    setSession((current) => {
      if (!current || !current.seasons.some((season) => season.id === seasonId)) {
        return current;
      }
      localStorage.setItem(SEASON_STORAGE_KEY, seasonId);
      return { ...current, selectedSeasonId: seasonId };
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
