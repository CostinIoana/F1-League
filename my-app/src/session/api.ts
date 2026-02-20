import type { Pilot, PilotGroup, PilotValueGroup, Race, Season, Team } from "../seasons/types";
import type { SessionData } from "./types";

const SEASONS_STORAGE_KEY = "f1league.seasons";
const DEFAULT_VALUE_GROUP_COUNT = 5;
const DEFAULT_DRAFT_PILOT_COUNT = 9;

function createDefaultGroupLimits(draftPilotCount: number): Record<PilotValueGroup, number> {
  return {
    A: draftPilotCount,
    B: draftPilotCount,
    C: draftPilotCount,
    D: draftPilotCount,
    E: draftPilotCount,
  };
}

const defaultSeasons: Season[] = [
  {
    id: "f1-2026",
    name: "F1 League",
    year: 2026,
    entryFee: 50,
    draftConfig: {
      valueGroupCount: DEFAULT_VALUE_GROUP_COUNT,
      draftPilotCount: DEFAULT_DRAFT_PILOT_COUNT,
      groupLimits: createDefaultGroupLimits(DEFAULT_DRAFT_PILOT_COUNT),
    },
    races: [],
    teams: [],
    status: "draft",
  },
  {
    id: "f1-2025",
    name: "F1 League",
    year: 2025,
    entryFee: 45,
    draftConfig: {
      valueGroupCount: DEFAULT_VALUE_GROUP_COUNT,
      draftPilotCount: DEFAULT_DRAFT_PILOT_COUNT,
      groupLimits: createDefaultGroupLimits(DEFAULT_DRAFT_PILOT_COUNT),
    },
    races: [],
    teams: [],
    status: "active",
  },
  {
    id: "f1-2024",
    name: "F1 League",
    year: 2024,
    entryFee: 40,
    draftConfig: {
      valueGroupCount: DEFAULT_VALUE_GROUP_COUNT,
      draftPilotCount: DEFAULT_DRAFT_PILOT_COUNT,
      groupLimits: createDefaultGroupLimits(DEFAULT_DRAFT_PILOT_COUNT),
    },
    races: [],
    teams: [],
    status: "completed",
  },
];

export type CreateDraftSeasonPayload = {
  id: string;
  name: string;
  year: number;
  entryFee: number;
};

function isSeason(value: unknown): value is Season {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<Season>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.year === "number" &&
    typeof candidate.entryFee === "number" &&
    typeof candidate.draftConfig === "object" &&
    candidate.draftConfig !== null &&
    Array.isArray(candidate.races) &&
    Array.isArray(candidate.teams) &&
    (candidate.status === "draft" || candidate.status === "active" || candidate.status === "completed")
  );
}

function normalizePilot(value: unknown): Pilot | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<Pilot>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return null;
  }
  const valueGroup: PilotGroup =
    candidate.valueGroup === "A" ||
    candidate.valueGroup === "B" ||
    candidate.valueGroup === "C" ||
    candidate.valueGroup === "D" ||
    candidate.valueGroup === "E" ||
    candidate.valueGroup === "unassigned"
      ? candidate.valueGroup
      : "unassigned";

  return {
    id: candidate.id,
    name: candidate.name,
    valueGroup,
    selectedForDraft: typeof candidate.selectedForDraft === "boolean" ? candidate.selectedForDraft : false,
  };
}

function normalizeTeam(value: unknown): Team | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<Team> & { pilots?: unknown[] };
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return null;
  }

  const pilots = Array.isArray(candidate.pilots)
    ? candidate.pilots.map(normalizePilot).filter((pilot): pilot is Pilot => pilot !== null)
    : [];

  return {
    id: candidate.id,
    name: candidate.name,
    pilots,
  };
}

function normalizeSeason(value: unknown): Season | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<Season> & {
    races?: unknown[];
    teams?: unknown[];
    draftConfig?: {
      valueGroupCount?: number;
      draftPilotCount?: number;
      groupLimits?: Partial<Record<PilotValueGroup, number>>;
    };
  };
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.year !== "number" ||
    typeof candidate.entryFee !== "number" ||
    (candidate.status !== "draft" && candidate.status !== "active" && candidate.status !== "completed")
  ) {
    return null;
  }

  const races = Array.isArray(candidate.races)
    ? candidate.races
        .map((race) => {
          if (typeof race !== "object" || race === null) {
            return null;
          }
          const candidateRace = race as Partial<Race>;
          if (typeof candidateRace.id !== "string" || typeof candidateRace.name !== "string") {
            return null;
          }
          return {
            id: candidateRace.id,
            name: candidateRace.name,
            date: typeof candidateRace.date === "string" ? candidateRace.date : "",
          } satisfies Race;
        })
        .filter((race): race is Race => race !== null)
    : [];

  const teams = Array.isArray(candidate.teams)
    ? candidate.teams.map(normalizeTeam).filter((team): team is Team => team !== null)
    : [];

  const valueGroupCount =
    typeof candidate.draftConfig?.valueGroupCount === "number"
      ? Math.max(1, Math.min(5, Math.floor(candidate.draftConfig.valueGroupCount)))
      : DEFAULT_VALUE_GROUP_COUNT;
  const draftPilotCount =
    typeof candidate.draftConfig?.draftPilotCount === "number"
      ? Math.max(1, Math.min(20, Math.floor(candidate.draftConfig.draftPilotCount)))
      : DEFAULT_DRAFT_PILOT_COUNT;
  const defaultGroupLimits = createDefaultGroupLimits(draftPilotCount);
  const groupLimits: Record<PilotValueGroup, number> = {
    A:
      typeof candidate.draftConfig?.groupLimits?.A === "number"
        ? Math.max(0, Math.min(draftPilotCount, Math.floor(candidate.draftConfig.groupLimits.A)))
        : defaultGroupLimits.A,
    B:
      typeof candidate.draftConfig?.groupLimits?.B === "number"
        ? Math.max(0, Math.min(draftPilotCount, Math.floor(candidate.draftConfig.groupLimits.B)))
        : defaultGroupLimits.B,
    C:
      typeof candidate.draftConfig?.groupLimits?.C === "number"
        ? Math.max(0, Math.min(draftPilotCount, Math.floor(candidate.draftConfig.groupLimits.C)))
        : defaultGroupLimits.C,
    D:
      typeof candidate.draftConfig?.groupLimits?.D === "number"
        ? Math.max(0, Math.min(draftPilotCount, Math.floor(candidate.draftConfig.groupLimits.D)))
        : defaultGroupLimits.D,
    E:
      typeof candidate.draftConfig?.groupLimits?.E === "number"
        ? Math.max(0, Math.min(draftPilotCount, Math.floor(candidate.draftConfig.groupLimits.E)))
        : defaultGroupLimits.E,
  };

  return {
    id: candidate.id,
    name: candidate.name,
    year: candidate.year,
    entryFee: candidate.entryFee,
    draftConfig: {
      valueGroupCount,
      draftPilotCount,
      groupLimits,
    },
    status: candidate.status,
    races,
    teams,
  };
}

function readSeasonsFromStorage() {
  const raw = localStorage.getItem(SEASONS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(SEASONS_STORAGE_KEY, JSON.stringify(defaultSeasons));
    return defaultSeasons;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return defaultSeasons;
    }
    const normalizedSeasons = parsed.map(normalizeSeason).filter((season): season is Season => season !== null);
    const seasons = normalizedSeasons.filter(isSeason);
    if (seasons.length === 0) {
      return defaultSeasons;
    }
    return seasons;
  } catch {
    return defaultSeasons;
  }
}

function writeSeasonsToStorage(seasons: Season[]) {
  localStorage.setItem(SEASONS_STORAGE_KEY, JSON.stringify(seasons));
}

export function fetchSessionData(): Promise<SessionData> {
  const seasons = readSeasonsFromStorage();

  return Promise.resolve({
    user: {
      name: "Costin",
      email: "costin@f1league.local",
      role: "admin",
      permissions: [
        "admin:season:read",
        "admin:users:read",
        "admin:scoring:read",
        "admin:notifications:read",
      ],
    },
    seasons,
    selectedSeasonId: "f1-2025",
  });
}

export function createDraftSeason(payload: CreateDraftSeasonPayload): { success: boolean; season?: Season } {
  const seasons = readSeasonsFromStorage();
  const nextSeason: Season = {
    id: payload.id,
    name: payload.name,
    year: payload.year,
    entryFee: payload.entryFee,
    draftConfig: {
      valueGroupCount: DEFAULT_VALUE_GROUP_COUNT,
      draftPilotCount: DEFAULT_DRAFT_PILOT_COUNT,
      groupLimits: createDefaultGroupLimits(DEFAULT_DRAFT_PILOT_COUNT),
    },
    races: [],
    teams: [],
    status: "draft",
  };

  const nextSeasons = [nextSeason, ...seasons];
  writeSeasonsToStorage(nextSeasons);
  return { success: true, season: nextSeason };
}

export function renameDraftSeason(
  seasonId: string,
  nextName: string
): { success: boolean; season?: Season; message?: string } {
  const seasons = readSeasonsFromStorage();
  const season = seasons.find((item) => item.id === seasonId);

  if (!season) {
    return { success: false, message: "Season not found." };
  }

  if (season.status !== "draft") {
    return { success: false, message: "Only draft seasons can be edited." };
  }

  const updatedSeason = { ...season, name: nextName };
  const nextSeasons = seasons.map((item) => (item.id === seasonId ? updatedSeason : item));
  writeSeasonsToStorage(nextSeasons);
  return { success: true, season: updatedSeason };
}

export type UpdateDraftSeasonInfoPayload = {
  seasonId: string;
  name: string;
  year: number;
  entryFee: number;
};

export function updateDraftSeasonInfo(
  payload: UpdateDraftSeasonInfoPayload
): { success: boolean; season?: Season; message?: string } {
  const seasons = readSeasonsFromStorage();
  const season = seasons.find((item) => item.id === payload.seasonId);

  if (!season) {
    return { success: false, message: "Season not found." };
  }

  if (season.status !== "draft") {
    return { success: false, message: "Only draft seasons can be edited." };
  }

  const updatedSeason: Season = {
    ...season,
    name: payload.name,
    year: payload.year,
    entryFee: payload.entryFee,
  };

  const nextSeasons = seasons.map((item) => (item.id === payload.seasonId ? updatedSeason : item));
  writeSeasonsToStorage(nextSeasons);
  return { success: true, season: updatedSeason };
}

export type UpdateSeasonPatch = Partial<
  Pick<Season, "name" | "year" | "entryFee" | "status" | "draftConfig" | "races" | "teams">
>;

export function getSeasons() {
  return readSeasonsFromStorage();
}

export function updateSeason(
  seasonId: string,
  patch: UpdateSeasonPatch
): { success: boolean; season?: Season; message?: string } {
  const seasons = readSeasonsFromStorage();
  const season = seasons.find((item) => item.id === seasonId);

  if (!season) {
    return { success: false, message: "Season not found." };
  }

  const updatedSeason: Season = { ...season, ...patch };
  const nextSeasons = seasons.map((item) => (item.id === seasonId ? updatedSeason : item));
  writeSeasonsToStorage(nextSeasons);

  return { success: true, season: updatedSeason };
}

export function deleteSeason(seasonId: string): { success: boolean; message?: string } {
  const seasons = readSeasonsFromStorage();
  const season = seasons.find((item) => item.id === seasonId);

  if (!season) {
    return { success: false, message: "Season not found." };
  }

  const nextSeasons = seasons.filter((item) => item.id !== seasonId);
  writeSeasonsToStorage(nextSeasons);
  return { success: true };
}
