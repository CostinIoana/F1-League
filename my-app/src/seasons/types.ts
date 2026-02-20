export type SeasonStatus = "draft" | "active" | "completed";

export type Race = {
  id: string;
  name: string;
  date: string;
};

export type PilotValueGroup = "A" | "B" | "C" | "D" | "E";
export type PilotGroup = PilotValueGroup | "unassigned";

export const PILOT_VALUE_GROUPS: PilotValueGroup[] = ["A", "B", "C", "D", "E"];

export type Pilot = {
  id: string;
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
  teams: Team[];
  status: SeasonStatus;
};
