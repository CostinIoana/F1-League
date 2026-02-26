import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSessionData, getSeasons } from "./api";
import { SessionContext } from "./context";
import type { SessionData } from "./types";

const SEASON_STORAGE_KEY = "f1league.selectedSeasonId";
const SEASONS_UPDATED_EVENT = "f1league:seasons-updated";

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

  useEffect(() => {
    const handleSeasonsUpdated = () => {
      setSession((current) => {
        if (!current) {
          return current;
        }
        const seasons = getSeasons();
        const persistedSeason = localStorage.getItem(SEASON_STORAGE_KEY);
        const fallbackSeasonId = seasons[0]?.id ?? current.selectedSeasonId;
        const selectedSeasonId =
          persistedSeason && seasons.some((season) => season.id === persistedSeason)
            ? persistedSeason
            : seasons.some((season) => season.id === current.selectedSeasonId)
              ? current.selectedSeasonId
              : fallbackSeasonId;
        return { ...current, seasons, selectedSeasonId };
      });
    };

    window.addEventListener(SEASONS_UPDATED_EVENT, handleSeasonsUpdated);
    return () => {
      window.removeEventListener(SEASONS_UPDATED_EVENT, handleSeasonsUpdated);
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
