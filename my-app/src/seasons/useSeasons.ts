import { useCallback, useState } from "react";
import {
  createDraftSeason as createDraftSeasonApi,
  getSeasons,
  type CreateDraftSeasonPayload,
  type UpdateSeasonPatch,
  updateSeason as updateSeasonApi,
} from "../session/api";
import type { Season } from "./types";

export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>(() => getSeasons());

  const createDraftSeason = useCallback((payload: CreateDraftSeasonPayload) => {
    const result = createDraftSeasonApi(payload);
    const createdSeason = result.season;
    if (result.success && createdSeason) {
      setSeasons((current) => [createdSeason, ...current]);
    }
    return result;
  }, []);

  const updateSeason = useCallback((seasonId: string, patch: UpdateSeasonPatch) => {
    const result = updateSeasonApi(seasonId, patch);
    const updatedSeason = result.season;
    if (result.success && updatedSeason) {
      setSeasons((current) => current.map((season) => (season.id === seasonId ? updatedSeason : season)));
    }
    return result;
  }, []);

  const getSeasonById = useCallback(
    (seasonId: string) => seasons.find((season) => season.id === seasonId) ?? null,
    [seasons]
  );

  return {
    seasons,
    getSeasonById,
    createDraftSeason,
    updateSeason,
  };
}
