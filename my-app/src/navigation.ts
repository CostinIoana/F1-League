import type { Permission, UserRole } from "./session/types";

export type NavItem = {
  label: string;
  path: string;
  roles: UserRole[];
  section: "main" | "admin";
};

export const navItems: NavItem[] = [
  { label: "Leaderboards", path: "/leaderboards", roles: ["admin"], section: "admin" },
  { label: "My Team", path: "/my-team", roles: ["admin", "player"], section: "main" },
  { label: "Races", path: "/races", roles: ["admin", "player"], section: "main" },
  { label: "Season Setup", path: "/admin/season", roles: ["admin"], section: "admin" },
  { label: "Races", path: "/admin/races", roles: ["admin"], section: "admin" },
  { label: "Users", path: "/admin/users", roles: ["admin"], section: "admin" },
  { label: "Scoring", path: "/admin/scoring", roles: ["admin"], section: "admin" },
  { label: "Notifications", path: "/admin/notifications", roles: ["admin"], section: "admin" },
];

export type NavigationSectionId = "player" | "admin";

export type NavigationItemKey =
  | "leaderboards"
  | "myTeam"
  | "races"
  | "adminSeason"
  | "adminRaces"
  | "adminUsers"
  | "adminScoring"
  | "adminNotifications";

export type NavigationItem = {
  key: NavigationItemKey;
  label: string;
  path: string;
  section: NavigationSectionId;
  requiredRoles?: UserRole[];
  requiredPermissions?: Permission[];
};

export type NavigationSection = {
  id: NavigationSectionId;
  label: string;
  items: NavigationItem[];
};

const NAV_ITEMS: NavigationItem[] = [
  {
    key: "leaderboards",
    label: "Leaderboards",
    path: "/leaderboards",
    section: "admin",
    requiredRoles: ["admin"],
    requiredPermissions: ["admin:scoring:read"],
  },
  { key: "myTeam", label: "My Team", path: "/my-team", section: "player" },
  { key: "races", label: "Races", path: "/races", section: "player" },
  {
    key: "adminSeason",
    label: "Season Setup",
    path: "/admin/season",
    section: "admin",
    requiredRoles: ["admin"],
    requiredPermissions: ["admin:season:read"],
  },
  {
    key: "adminRaces",
    label: "Races",
    path: "/admin/races",
    section: "admin",
    requiredRoles: ["admin"],
    requiredPermissions: ["admin:scoring:read"],
  },
  {
    key: "adminUsers",
    label: "Users",
    path: "/admin/users",
    section: "admin",
    requiredRoles: ["admin"],
    requiredPermissions: ["admin:users:read"],
  },
  {
    key: "adminScoring",
    label: "Scoring",
    path: "/admin/scoring",
    section: "admin",
    requiredRoles: ["admin"],
    requiredPermissions: ["admin:scoring:read"],
  },
  {
    key: "adminNotifications",
    label: "Notifications",
    path: "/admin/notifications",
    section: "admin",
    requiredRoles: ["admin"],
    requiredPermissions: ["admin:notifications:read"],
  },
];

const SECTION_LABELS: Record<NavigationSectionId, string> = {
  player: "Player",
  admin: "Admin",
};

function hasRoleAccess(item: NavigationItem, role: UserRole) {
  return !item.requiredRoles || item.requiredRoles.includes(role);
}

function hasPermissionAccess(item: NavigationItem, permissions: Permission[]) {
  return !item.requiredPermissions || item.requiredPermissions.every((p) => permissions.includes(p));
}

export function getVisibleNavigationItems(role: UserRole, permissions: Permission[]) {
  return NAV_ITEMS.filter((item) => hasRoleAccess(item, role) && hasPermissionAccess(item, permissions));
}

export function getNavigationSections(role: UserRole, permissions: Permission[]): NavigationSection[] {
  const visibleItems = getVisibleNavigationItems(role, permissions);
  return (Object.keys(SECTION_LABELS) as NavigationSectionId[])
    .map((sectionId) => ({
      id: sectionId,
      label: SECTION_LABELS[sectionId],
      items: visibleItems.filter((item) => item.section === sectionId),
    }))
    .filter((section) => section.items.length > 0);
}

export function getDefaultNavigationPath(role: UserRole, permissions: Permission[]) {
  const firstVisibleItem = getVisibleNavigationItems(role, permissions)[0];
  return firstVisibleItem?.path ?? "/leaderboards";
}
