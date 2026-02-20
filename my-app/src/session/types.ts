import type { Season } from "../seasons/types";

export type UserRole = "admin" | "player";
export type Permission =
  | "admin:season:read"
  | "admin:users:read"
  | "admin:scoring:read"
  | "admin:notifications:read";

export type SessionUser = {
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
};

export type SessionData = {
  user: SessionUser;
  seasons: Season[];
  selectedSeasonId: string;
};
