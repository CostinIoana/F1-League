import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { LeaderboardsPage } from "./pages/LeaderboardsPage";
import { MyTeamPage } from "./pages/MyTeamPage";
import { RacesPage } from "./pages/RacesPage";
import { AdminSeasonPage } from "./pages/admin/AdminSeasonPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminScoringPage } from "./pages/admin/AdminScoringPage";
import { AdminNotificationsPage } from "./pages/admin/AdminNotificationsPage";

function App() {
  const role: "admin" | "player" = "admin";

  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppShell role={role} seasonName="F1 2025" userName="Costin" />
        }
      >
        <Route index element={<Navigate to="leaderboards" replace />} />

        <Route path="leaderboards" element={<LeaderboardsPage />} />
        <Route path="my-team" element={<MyTeamPage />} />
        <Route path="races" element={<RacesPage />} />

        <Route path="admin/season" element={<AdminSeasonPage />} />
        <Route path="admin/users" element={<AdminUsersPage />} />
        <Route path="admin/scoring" element={<AdminScoringPage />} />
        <Route path="admin/notifications" element={<AdminNotificationsPage />} />

        <Route path="*" element={<div className="p-6">Not Found</div>} />
      </Route>
    </Routes>
  );
}

export default App;