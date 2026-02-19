import type { SessionData } from "./types";

export function fetchSessionData(): Promise<SessionData> {
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
    seasons: ["F1 2026", "F1 2025", "F1 2024"],
    selectedSeason: "F1 2026",
  });
}
