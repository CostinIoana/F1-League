import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

type UserRole = "admin" | "player";

type AppShellProps = {
  role: UserRole;
  seasonName: string;
  userName: string;
  seasons?: string[];
};

const linkBase = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition";
const linkInactive =
  "text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-900)]";
const linkActive =
  "bg-[var(--color-neutral-100)] text-[var(--color-neutral-900)] border border-[var(--color-neutral-200)]";

export function AppShell({ role, seasonName, userName, seasons = [] }: AppShellProps) {
  const [selectedSeason, setSelectedSeason] = useState(seasonName);
  const seasonOptions = seasons.length > 0 ? seasons : [seasonName];

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] text-[var(--color-neutral-900)]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="border-b border-[var(--color-neutral-200)] p-4 md:min-h-screen md:border-b-0 md:border-r">
          <div className="flex items-center justify-between md:block">
            <div className="text-lg font-bold">
              <span className="font-['JetBrains_Mono'] text-[var(--color-primary-500)]">F1</span>{" "}
              League
            </div>
          </div>

          <nav className="mt-4 grid gap-1">
            <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-500)]">
              Player
            </div>

            <NavLink
              to="/leaderboards"
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
            >
              Leaderboards
            </NavLink>

            <NavLink
              to="/my-team"
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
            >
              My Team
            </NavLink>

            <NavLink
              to="/races"
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
            >
              Races
            </NavLink>

            {role === "admin" && (
              <div className="mt-3 border-t border-[var(--color-neutral-200)] pt-3">
                <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-500)]">
                  Admin
                </div>

                <NavLink
                  to="/admin/season"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : linkInactive}`
                  }
                >
                  Season Setup
                </NavLink>

                <NavLink
                  to="/admin/users"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : linkInactive}`
                  }
                >
                  Users
                </NavLink>

                <NavLink
                  to="/admin/scoring"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : linkInactive}`
                  }
                >
                  Scoring
                </NavLink>

                <NavLink
                  to="/admin/notifications"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : linkInactive}`
                  }
                >
                  Notifications
                </NavLink>
              </div>
            )}
          </nav>
        </aside>

        <main className="p-4 md:p-6">
          <div className="mb-4 rounded-xl border border-[var(--color-neutral-200)] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="season-select"
                  className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-500)]"
                >
                  Season
                </label>
                <select
                  id="season-select"
                  value={selectedSeason}
                  onChange={(event) => setSelectedSeason(event.target.value)}
                  className="rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                >
                  {seasonOptions.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </div>

              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg border border-[var(--color-neutral-200)] px-2 py-1.5 text-sm font-semibold hover:bg-[var(--color-neutral-100)]">
                  <span>{userName}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-secondary-500)] text-xs font-bold text-white">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </summary>

                <div className="absolute right-0 z-10 mt-2 min-w-44 rounded-lg border border-[var(--color-neutral-200)] bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]"
                  >
                    Account Settings
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-primary-500)] hover:bg-[var(--color-neutral-100)]"
                  >
                    Sign Out
                  </button>
                </div>
              </details>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
