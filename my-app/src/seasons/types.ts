export type SeasonStatus = "draft" | "active" | "completed";

export type Season = {
  id: string;
  name: string;
  status: SeasonStatus;
};
