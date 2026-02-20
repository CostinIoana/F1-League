import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import {
  getDefaultNavigationPath,
  getVisibleNavigationItems,
  type NavigationItemKey,
} from "./navigation";
import { LeaderboardsPage } from "./pages/LeaderboardsPage";
import { MyTeamPage } from "./pages/MyTeamPage";
import { RacesPage } from "./pages/RacesPage";
import { AdminSeasonPage } from "./pages/admin/AdminSeasonPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminScoringPage } from "./pages/admin/AdminScoringPage";
import { AdminNotificationsPage } from "./pages/admin/AdminNotificationsPage";
import { SessionProvider } from "./session/SessionProvider";
import { useSession } from "./session/useSession";

const routeElementByKey: Record<NavigationItemKey, ReactElement> = {
  leaderboards: <LeaderboardsPage />,
  myTeam: <MyTeamPage />,
  races: <RacesPage />,
  adminSeason: <AdminSeasonPage />,
  adminUsers: <AdminUsersPage />,
  adminScoring: <AdminScoringPage />,
  adminNotifications: <AdminNotificationsPage />,
};

function AppRoutes() {
  const { session, loading, setSelectedSeason } = useSession();

  if (loading || !session) {
    return <div className="p-6">Loading session...</div>;
  }

  const role = session.user.role;
  const permissions = session.user.permissions;
  const visibleNavigationItems = getVisibleNavigationItems(role, permissions);
  const defaultPath = getDefaultNavigationPath(role, permissions);

  const handleProfile = () => {
    console.info("Open profile for", session.user.email);
  };

  const handleAccountSettings = () => {
    console.info("Open account settings for", session.user.email);
  };

  const handleSignOut = () => {
    console.info("Sign out requested by", session.user.email);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppShell
            user={session.user}
            seasons={session.seasons}
            selectedSeasonId={session.selectedSeasonId}
            onSeasonChange={setSelectedSeason}
            onProfile={handleProfile}
            onAccountSettings={handleAccountSettings}
            onSignOut={handleSignOut}
          />
        }
      >
        <Route index element={<Navigate to={defaultPath} replace />} />

        {visibleNavigationItems.map((item) => (
          <Route key={item.key} path={item.path.slice(1)} element={routeElementByKey[item.key]} />
        ))}

        <Route path="*" element={<div className="p-6">Not Found</div>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <SessionProvider>
      <AppRoutes />
    </SessionProvider>
  );
}

export default App;
