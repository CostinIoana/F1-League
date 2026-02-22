export type SeasonStatus = "draft" | "active" | "completed";

export type Race = {
  id: string;
  name: string;
  date: string;
  locked: boolean;
};

export type RaceScoreEntry = {
  slotId: string;
  pilotId: string;
  pilotName: string;
  teamId: string;
  teamName: string;
  points: number;
};

export type RaceScore = {
  raceId: string;
  entries: RaceScoreEntry[];
};

export type PilotValueGroup = "A" | "B" | "C" | "D" | "E";
export type PilotGroup = PilotValueGroup | "unassigned";

export const PILOT_VALUE_GROUPS: PilotValueGroup[] = ["A", "B", "C", "D", "E"];

export type Pilot = {
  id: string;
  slotId: string;
  name: string;
  valueGroup: PilotGroup;
  selectedForDraft: boolean;
};

export type Team = {
  id: string;
  name: string;
  pilots: Pilot[];
};

export type DraftConfig = {
  valueGroupCount: number;
  draftPilotCount: number;
  groupLimits: Record<PilotValueGroup, number>;
};

export type Season = {
  id: string;
  name: string;
  year: number;
  entryFee: number;
  draftConfig: DraftConfig;
  races: Race[];
  raceScores: RaceScore[];
  teams: Team[];
  status: SeasonStatus;
  adminOverrides: {
    editingEnabled: boolean;
  };
};
