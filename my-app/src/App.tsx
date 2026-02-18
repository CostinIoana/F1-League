import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { LeaderboardsPage } from "./pages/LeaderboardsPage";
import { MyTeamPage } from "./pages/MyTeamPage";
import { RacesPage } from "./pages/RacesPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="leaderboards" replace />} />
        <Route path="leaderboards" element={<LeaderboardsPage />} />
        <Route path="my-team" element={<MyTeamPage />} />
        <Route path="races" element={<RacesPage />} />
        <Route path="*" element={<div className="p-6">Not Found</div>} />
      </Route>
    </Routes>
  );
}

export default App;
