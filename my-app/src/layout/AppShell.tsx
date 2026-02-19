import { NavLink, Outlet } from "react-router-dom";

const linkBase =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition";
const linkInactive =
  "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900/60 dark:hover:text-white";
const linkActive =
  "bg-slate-100 text-slate-900 dark:bg-slate-900/60 dark:text-white";
type UserRole = "admin" | "player";

type AppShellProps = {
  role: "admin" | "player";
  seasonName: string;
  userName: string;
};
export function AppShell({ role, seasonName, userName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="border-b border-slate-200 p-4 md:min-h-screen md:border-b-0 md:border-r dark:border-slate-800">
          <div className="flex items-center justify-between md:block">
            <div className="text-lg font-semibold">
              <span className="text-red-600">F1</span> League
            </div>
          </div>

          <nav className="mt-4 grid gap-1">
            <NavLink
              to="/leaderboards"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              Leaderboards
            </NavLink>

            <NavLink
              to="/my-team"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              My Team
            </NavLink>

            <NavLink
              to="/races"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              Races
              {role === "admin" && (
  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
    <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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

            </NavLink>
          </nav>
        </aside>

        {/* Main */}
        <main className="p-4 md:p-6">
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
  {/* Season */}
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-500 dark:text-slate-400">
      Season
    </span>
    <div className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium dark:border-slate-700">
      {seasonName}
    </div>
  </div>

  {/* User */}
  <div className="flex items-center gap-3">
    <div className="text-sm font-medium">{userName}</div>
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
      {userName.charAt(0).toUpperCase()}
    </div>
  </div>
</div>

          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/30">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
