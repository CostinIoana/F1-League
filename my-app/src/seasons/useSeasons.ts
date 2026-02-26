import { useCallback, useEffect, useState } from "react";
import {
  createDraftSeason as createDraftSeasonApi,
  deleteSeason as deleteSeasonApi,
  getSeasons,
  type CreateDraftSeasonPayload,
  type UpdateSeasonPatch,
  updateSeason as updateSeasonApi,
} from "../session/api";
import type { Season } from "./types";

const SEASONS_UPDATED_EVENT = "f1league:seasons-updated";

export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>(() => getSeasons());

  useEffect(() => {
    const syncSeasons = () => {
      setSeasons(getSeasons());
    };

    window.addEventListener(SEASONS_UPDATED_EVENT, syncSeasons);
    window.addEventListener("storage", syncSeasons);
    return () => {
      window.removeEventListener(SEASONS_UPDATED_EVENT, syncSeasons);
      window.removeEventListener("storage", syncSeasons);
    };
  }, []);

  const createDraftSeason = useCallback((payload: CreateDraftSeasonPayload) => {
    const result = createDraftSeasonApi(payload);
    const createdSeason = result.season;
    if (result.success && createdSeason) {
      setSeasons((current) => [createdSeason, ...current]);
      window.dispatchEvent(new Event(SEASONS_UPDATED_EVENT));
    }
    return result;
  }, []);

  const updateSeason = useCallback((seasonId: string, patch: UpdateSeasonPatch) => {
    const result = updateSeasonApi(seasonId, patch);
    const updatedSeason = result.season;
    if (result.success && updatedSeason) {
      setSeasons((current) => current.map((season) => (season.id === seasonId ? updatedSeason : season)));
      window.dispatchEvent(new Event(SEASONS_UPDATED_EVENT));
    }
    return result;
  }, []);

  const getSeasonById = useCallback(
    (seasonId: string) => seasons.find((season) => season.id === seasonId) ?? null,
    [seasons]
  );

  const deleteSeason = useCallback((seasonId: string) => {
    const result = deleteSeasonApi(seasonId);
    if (result.success) {
      setSeasons((current) => current.filter((season) => season.id !== seasonId));
      window.dispatchEvent(new Event(SEASONS_UPDATED_EVENT));
    }
    return result;
  }, []);

  return {
    seasons,
    getSeasonById,
    createDraftSeason,
    updateSeason,
    deleteSeason,
  };
}
