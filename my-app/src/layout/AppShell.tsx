import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import type { SessionUser } from "../session/types";
import { navItems } from "../navigation";
import type { Season } from "../seasons/types";

type AppShellProps = {
  user: SessionUser;
  seasons: Season[];
  selectedSeasonId: string;
  onSeasonChange: (seasonId: string) => void;
  onProfile?: () => void;
  onAccountSettings?: () => void;
  onSignOut?: () => void;
};

const linkBase = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition";
const linkInactive =
  "text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-900)]";
const linkActive =
  "bg-[var(--color-neutral-100)] text-[var(--color-neutral-900)] border border-[var(--color-neutral-200)]";
const themeStorageKey = "f1league.theme";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  const storedTheme = localStorage.getItem(themeStorageKey);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AppShell({
  user,
  seasons,
  selectedSeasonId,
  onSeasonChange,
  onProfile,
  onAccountSettings,
  onSignOut,
}: AppShellProps) {
  const selectedSeason =
    seasons.find((season) => season.id === selectedSeasonId) ?? seasons[0] ?? null;
  const displayName = user.name.trim() || "User";
  const role = user.role;
  const mainNav = navItems.filter((item) => item.section === "main" && item.roles.includes(role));
  const adminNav = navItems.filter((item) => item.section === "admin" && item.roles.includes(role));
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  return (
    <div className="font-sans-app min-h-screen bg-[var(--color-neutral-50)] text-[var(--color-neutral-900)]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="border-b border-[var(--color-neutral-200)] p-4 md:min-h-screen md:border-b-0 md:border-r">
          <div className="flex items-center justify-between md:block">
            <div className="text-lg font-bold">
              <span className="font-mono-app text-[var(--color-primary-500)]">F1</span>{" "}
              League
            </div>
          </div>

          <nav className="mt-4 grid gap-1">
            {mainNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {adminNav.length > 0 && (
            <div className="mt-3 border-t border-[var(--color-neutral-200)] pt-3">
              <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-500)]">
                Admin
              </div>

              {adminNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </aside>

        <main className="p-4 md:p-6">
          <div className="mb-4 rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-4">
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
                  value={selectedSeason?.id ?? ""}
                  onChange={(event) => onSeasonChange(event.target.value)}
                  className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                >
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} {season.year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                  className="h-9 rounded-lg border border-[var(--color-neutral-200)] px-3 text-sm font-semibold text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]"
                >
                  {theme === "dark" ? "Light" : "Dark"}
                </button>

                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  className="flex cursor-pointer list-none items-center gap-3 rounded-lg border border-[var(--color-neutral-200)] px-2 py-1.5 text-sm font-semibold hover:bg-[var(--color-neutral-100)]"
                >
                  <span>{displayName}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-secondary-500)] text-xs font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </button>

                  {isUserMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 z-10 mt-2 min-w-44 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-1 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onProfile?.();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]"
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAccountSettings?.();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]"
                      >
                        Account Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSignOut?.();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-primary-500)] hover:bg-[var(--color-neutral-100)]"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
