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
    seasons: [
      { id: "f1-2026", name: "F1 2026", status: "draft" },
      { id: "f1-2025", name: "F1 2025", status: "active" },
      { id: "f1-2024", name: "F1 2024", status: "completed" },
    ],
    selectedSeasonId: "f1-2025",
  });
}
