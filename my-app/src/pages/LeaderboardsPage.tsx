import { Fragment, useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Surface } from "../components/ui/Surface";
import { getRaceShortCode } from "../seasons/raceCode";
import { useSeasons } from "../seasons/useSeasons";
import { useSession } from "../session/useSession";

type LeaderboardTab = "users" | "pilots" | "teams";
type StoredTeamSelection = {
  selectedSlotIds?: string[];
  locked?: boolean;
};

const TEAM_SELECTION_KEY_PREFIX = "f1league.teamSelection";
const SEASON_TOTAL_SCOPE = "season-total";

function getUserSelectionsFromStorage(seasonId: string) {
  const users: Array<{ email: string; selectedSlotIds: string[]; locked: boolean }> = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(`${TEAM_SELECTION_KEY_PREFIX}.${seasonId}.`)) {
      continue;
    }
    const email = key.slice(`${TEAM_SELECTION_KEY_PREFIX}.${seasonId}.`.length);
    const raw = localStorage.getItem(key);
    if (!raw) {
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as StoredTeamSelection;
      const selectedSlotIds = Array.isArray(parsed.selectedSlotIds)
        ? parsed.selectedSlotIds.filter((slotId): slotId is string => typeof slotId === "string")
        : [];
      users.push({ email, selectedSlotIds, locked: Boolean(parsed.locked) });
    } catch {
      // Ignore malformed entries.
    }
  }
  return users;
}

function getPositionClass(position: number) {
  if (position === 1) {
    return "bg-amber-100 text-amber-700";
  }
  if (position === 2) {
    return "bg-slate-200 text-slate-700";
  }
  if (position === 3) {
    return "bg-orange-100 text-orange-700";
  }
  return "bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)]";
}

function getPilotCode(pilotName: string) {
  const tokens = pilotName.trim().split(/\s+/).filter(Boolean);
  const source = tokens[tokens.length - 1] ?? pilotName;
  return source.slice(0, 3).toUpperCase();
}

function getParticipantLabel(email: string) {
  return email.split("@")[0] || email;
}

type TieBreakPick = {
  points: number;
  pilotPosition: number;
};

type TieBreakUser = {
  participant: string;
  points: number;
  picks: TieBreakPick[];
};

function compareUsersByTieBreak(a: TieBreakUser, b: TieBreakUser) {
  if (b.points !== a.points) {
    return b.points - a.points;
  }

  for (let index = 0; index < 8; index += 1) {
    const aPoints = a.picks[index]?.points ?? -1;
    const bPoints = b.picks[index]?.points ?? -1;
    if (bPoints !== aPoints) {
      return bPoints - aPoints;
    }
  }

  const aFirstZeroPilotPosition =
    a.picks.find((pick) => pick.points === 0)?.pilotPosition ?? Number.MAX_SAFE_INTEGER;
  const bFirstZeroPilotPosition =
    b.picks.find((pick) => pick.points === 0)?.pilotPosition ?? Number.MAX_SAFE_INTEGER;
  if (aFirstZeroPilotPosition !== bFirstZeroPilotPosition) {
    return aFirstZeroPilotPosition - bFirstZeroPilotPosition;
  }

  return a.participant.localeCompare(b.participant);
}

export function LeaderboardsPage() {
  const { session, loading } = useSession();
  const { seasons } = useSeasons();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("users");
  const [scoreScope, setScoreScope] = useState<string>(SEASON_TOTAL_SCOPE);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const selectedSeason = useMemo(() => {
    if (!session) {
      return null;
    }
    return seasons.find((season) => season.id === session.selectedSeasonId) ?? null;
  }, [session, seasons]);

  const pointsBySlot = useMemo(() => {
    const result: Record<string, number> = {};
    if (!selectedSeason) {
      return result;
    }
    if (scoreScope === SEASON_TOTAL_SCOPE) {
      selectedSeason.raceScores.forEach((raceScore) => {
        raceScore.entries.forEach((entry) => {
          result[entry.slotId] = (result[entry.slotId] ?? 0) + entry.points;
        });
      });
      return result;
    }

    const raceScore = selectedSeason.raceScores.find((item) => item.raceId === scoreScope);
    raceScore?.entries.forEach((entry) => {
      result[entry.slotId] = entry.points;
    });
    return result;
  }, [selectedSeason, scoreScope]);

  const seasonTotalPointsBySlot = useMemo(() => {
    const result: Record<string, number> = {};
    if (!selectedSeason) {
      return result;
    }
    selectedSeason.raceScores.forEach((raceScore) => {
      raceScore.entries.forEach((entry) => {
        result[entry.slotId] = (result[entry.slotId] ?? 0) + entry.points;
      });
    });
    return result;
  }, [selectedSeason]);

  const pilotStandings = useMemo(() => {
    if (!selectedSeason) {
      return [] as Array<{ slotId: string; pilotName: string; teamName: string; points: number }>;
    }
    return selectedSeason.teams
      .flatMap((team) =>
        team.pilots
          .filter((pilot) => pilot.selectedForDraft)
          .map((pilot) => ({
            slotId: pilot.slotId,
            pilotName: pilot.name,
            teamName: team.name,
            points: pointsBySlot[pilot.slotId] ?? 0,
          }))
      )
      .sort((a, b) => b.points - a.points);
  }, [selectedSeason, pointsBySlot]);

  const teamStandings = useMemo(() => {
    const pointsByTeam: Record<string, { teamName: string; points: number }> = {};
    pilotStandings.forEach((pilot) => {
      pointsByTeam[pilot.teamName] = {
        teamName: pilot.teamName,
        points: (pointsByTeam[pilot.teamName]?.points ?? 0) + pilot.points,
      };
    });
    return Object.values(pointsByTeam).sort((a, b) => b.points - a.points);
  }, [pilotStandings]);

  const pilotBySlotId = useMemo(() => {
    const bySlot: Record<string, string> = {};
    if (!selectedSeason) {
      return bySlot;
    }
    selectedSeason.teams.forEach((team) => {
      team.pilots.forEach((pilot) => {
        bySlot[pilot.slotId] = pilot.name;
      });
    });
    return bySlot;
  }, [selectedSeason]);

  const pilotPositionBySlotForScope = useMemo(() => {
    const entries = Object.entries(pilotBySlotId)
      .map(([slotId, pilotName]) => ({
        slotId,
        pilotName,
        points: pointsBySlot[slotId] ?? 0,
      }))
      .sort((a, b) => b.points - a.points || a.pilotName.localeCompare(b.pilotName));

    const positionBySlot: Record<string, number> = {};
    entries.forEach((entry, index) => {
      positionBySlot[entry.slotId] = index + 1;
    });
    return positionBySlot;
  }, [pilotBySlotId, pointsBySlot]);

  const userStandingsDetailed = useMemo(() => {
    if (!selectedSeason) {
      return [] as Array<{
        email: string;
        participant: string;
        points: number;
        locked: boolean;
        picks: Array<{
          slotId: string;
          pilotName: string;
          pilotCode: string;
          points: number;
          pilotPosition: number;
        }>;
      }>;
    }

    return getUserSelectionsFromStorage(selectedSeason.id)
      .map((userSelection) => {
        const picks = userSelection.selectedSlotIds.map((slotId) => {
          const pilotName = pilotBySlotId[slotId] ?? slotId;
          return {
            slotId,
            pilotName,
            pilotCode: getPilotCode(pilotName),
            points: pointsBySlot[slotId] ?? 0,
            pilotPosition: pilotPositionBySlotForScope[slotId] ?? Number.MAX_SAFE_INTEGER,
          };
        });
        picks.sort(
          (a, b) =>
            b.points - a.points ||
            a.pilotPosition - b.pilotPosition ||
            a.pilotCode.localeCompare(b.pilotCode)
        );
        const points = picks.reduce((sum, pick) => sum + pick.points, 0);
        return {
          email: userSelection.email,
          participant: getParticipantLabel(userSelection.email),
          points,
          locked: userSelection.locked,
          picks,
        };
      })
      .sort((a, b) =>
        compareUsersByTieBreak(
          { participant: a.participant, points: a.points, picks: a.picks },
          { participant: b.participant, points: b.points, picks: b.picks }
        )
      );
  }, [pilotBySlotId, pilotPositionBySlotForScope, pointsBySlot, selectedSeason]);

  const userStandings = useMemo(
    () =>
      userStandingsDetailed.map((user) => ({
        email: user.email,
        points: user.points,
        locked: user.locked,
      })),
    [userStandingsDetailed]
  );

  const userPickColumnCount = useMemo(() => {
    if (!selectedSeason) {
      return 0;
    }
    return Math.max(
      selectedSeason.draftConfig.draftPilotCount,
      userStandingsDetailed.reduce((maxCount, user) => Math.max(maxCount, user.picks.length), 0)
    );
  }, [selectedSeason, userStandingsDetailed]);

  const userPointsMatrix = useMemo(() => {
    if (!selectedSeason) {
      return [] as Array<{
        rank: number;
        participant: string;
        totalPoints: number;
        picks: Array<{ pilotCode: string; points: number; pilotPosition: number }>;
      }>;
    }

    const seasonPilotEntries = Object.entries(pilotBySlotId)
      .map(([slotId, pilotName]) => ({
        slotId,
        pilotName,
        points: seasonTotalPointsBySlot[slotId] ?? 0,
      }))
      .sort((a, b) => b.points - a.points || a.pilotName.localeCompare(b.pilotName));
    const seasonPilotPositionBySlot: Record<string, number> = {};
    seasonPilotEntries.forEach((entry, index) => {
      seasonPilotPositionBySlot[entry.slotId] = index + 1;
    });

    const rows = getUserSelectionsFromStorage(selectedSeason.id).map((userSelection) => {
      const picks = userSelection.selectedSlotIds.map((slotId) => {
        const pilotName = pilotBySlotId[slotId] ?? slotId;
        return {
          pilotCode: getPilotCode(pilotName),
          points: seasonTotalPointsBySlot[slotId] ?? 0,
          pilotPosition: seasonPilotPositionBySlot[slotId] ?? Number.MAX_SAFE_INTEGER,
        };
      });
      picks.sort(
        (a, b) =>
          b.points - a.points ||
          a.pilotPosition - b.pilotPosition ||
          a.pilotCode.localeCompare(b.pilotCode)
      );
      const totalPoints = picks.reduce((sum, pick) => sum + pick.points, 0);
      return {
        participant: getParticipantLabel(userSelection.email),
        totalPoints,
        picks,
      };
    });

    rows.sort((a, b) =>
      compareUsersByTieBreak(
        { participant: a.participant, points: a.totalPoints, picks: a.picks },
        { participant: b.participant, points: b.totalPoints, picks: b.picks }
      )
    );
    return rows.map((row, index) => ({ rank: index + 1, ...row }));
  }, [pilotBySlotId, seasonTotalPointsBySlot, selectedSeason]);

  const userMatrixPilotCount = useMemo(
    () => userPointsMatrix.reduce((maxCount, user) => Math.max(maxCount, user.picks.length), 0),
    [userPointsMatrix]
  );

  const topTeam = teamStandings[0]?.teamName ?? "N/A";
  const selectedRaceName =
    scoreScope === SEASON_TOTAL_SCOPE
      ? "Season Total"
      : selectedSeason?.races.find((race) => race.id === scoreScope)?.name ?? "Race";

  const shareText = useMemo(() => {
    const headline = `F1 League Leaderboard - ${selectedSeason?.name ?? ""} ${selectedSeason?.year ?? ""} (${selectedRaceName})`;
    const lines =
      activeTab === "users"
        ? userStandings.slice(0, 5).map((user, index) => `${index + 1}. ${user.email} - ${user.points} pts`)
        : activeTab === "pilots"
          ? pilotStandings.slice(0, 5).map((pilot, index) => `${index + 1}. ${pilot.pilotName} - ${pilot.points} pts`)
          : teamStandings.slice(0, 5).map((team, index) => `${index + 1}. ${team.teamName} - ${team.points} pts`);
    return [headline, ...lines].join("\n");
  }, [selectedSeason, selectedRaceName, activeTab, userStandings, pilotStandings, teamStandings]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setShareMessage("Leaderboard copied to clipboard.");
    } catch {
      setShareMessage("Could not copy leaderboard.");
    }
  };

  if (loading || !session) {
    return <div className="p-6 text-sm text-[var(--color-neutral-700)]">Loading leaderboards...</div>;
  }

  if (!selectedSeason) {
    return (
      <div className="p-6 text-sm text-[var(--color-neutral-700)]">
        No season selected.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Leaderboards</h1>
            <Badge tone="primary">Live</Badge>
            <Badge tone="secondary">{selectedRaceName}</Badge>
          </div>
          <Button variant="outline" tone="neutral" size="sm" onClick={handleShare}>
            Share
          </Button>
        </div>
        {shareMessage && <div className="mt-2 text-xs text-[var(--color-neutral-600)]">{shareMessage}</div>}
      </Surface>

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">Users Points Matrix</div>
          <div className="text-xs text-[var(--color-neutral-600)]">Model clasament: participant + piloți + puncte.</div>
        </div>
        {userPointsMatrix.length === 0 ? (
          <div className="mt-2 text-xs text-[var(--color-neutral-500)]">No user standings available.</div>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--color-neutral-100)] text-[var(--color-neutral-900)]">
                  <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-left">CLASAMENT</th>
                  <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-right">Punct</th>
                  <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-left">Participant</th>
                  {Array.from({ length: userMatrixPilotCount }).map((_, index) => (
                    <Fragment key={`matrix-header-${index + 1}`}>
                      <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-left">Pilot</th>
                      <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-right">P</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userPointsMatrix.map((row, rowIndex) => (
                  <tr
                    key={row.participant}
                    className={rowIndex % 2 === 0 ? "bg-[var(--color-surface)]" : "bg-[var(--color-neutral-100)]"}
                  >
                    <td className="border border-[var(--color-neutral-200)] px-2 py-1 font-semibold text-[var(--color-neutral-800)]">{row.rank}</td>
                    <td className="border border-[var(--color-neutral-200)] px-2 py-1 text-right font-semibold text-[var(--color-neutral-900)]">
                      {row.totalPoints}
                    </td>
                    <td className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-[var(--color-neutral-900)]">
                      {row.participant}
                    </td>
                    {Array.from({ length: userMatrixPilotCount }).map((_, index) => (
                      <Fragment key={`matrix-row-${row.participant}-${index}`}>
                        <td className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-[var(--color-neutral-800)]">
                          {row.picks[index]?.pilotCode ?? "-"}
                        </td>
                        <td className="border border-[var(--color-neutral-200)] px-2 py-1 text-right text-[var(--color-neutral-800)]">
                          {row.picks[index]?.points ?? 0}
                        </td>
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <div className="grid gap-3 xl:grid-cols-[320px_1fr]">
        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">Score Scope</div>
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={() => setScoreScope(SEASON_TOTAL_SCOPE)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${
                scoreScope === SEASON_TOTAL_SCOPE
                  ? "border-[var(--color-primary-500)] bg-[var(--color-neutral-100)]"
                  : "border-[var(--color-neutral-200)] bg-[var(--color-surface)]"
              }`}
            >
              <span className="text-sm text-[var(--color-neutral-800)]">Season Total</span>
              <Badge tone="neutral">ALL</Badge>
            </button>
            {selectedSeason.races.map((race, index) => (
              <button
                key={race.id}
                type="button"
                onClick={() => setScoreScope(race.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${
                  scoreScope === race.id
                    ? "border-[var(--color-primary-500)] bg-[var(--color-neutral-100)]"
                    : "border-[var(--color-neutral-200)] bg-[var(--color-surface)]"
                }`}
              >
                <span className="text-sm text-[var(--color-neutral-800)]">
                  {index + 1}. {race.name}
                </span>
                <Badge tone="secondary">{getRaceShortCode(race.name)}</Badge>
              </button>
            ))}
          </div>
        </Surface>

        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-[var(--color-neutral-700)]">
              Top Team: <span className="font-semibold text-[var(--color-neutral-900)]">{topTeam}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={activeTab === "users" ? "solid" : "outline"}
                onClick={() => setActiveTab("users")}
              >
                User
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === "pilots" ? "solid" : "outline"}
                onClick={() => setActiveTab("pilots")}
              >
                Pilot
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === "teams" ? "solid" : "outline"}
                onClick={() => setActiveTab("teams")}
              >
                Team
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {activeTab === "users" &&
              (userStandingsDetailed.length === 0 ? (
                <div className="text-xs text-[var(--color-neutral-600)]">No user selections available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--color-neutral-100)] text-[var(--color-neutral-900)]">
                        <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-left">Clasament</th>
                        <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-right">Puncte</th>
                        <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-left">Participant</th>
                        {Array.from({ length: userPickColumnCount }).map((_, index) => (
                          <Fragment key={`pair-header-${index + 1}`}>
                            <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-left">
                              Pilot {index + 1}
                            </th>
                            <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-right">
                              P
                            </th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {userStandingsDetailed.map((user, rowIndex) => (
                        <tr
                          key={user.email}
                          className={rowIndex % 2 === 0 ? "bg-[var(--color-surface)]" : "bg-[var(--color-neutral-100)]"}
                        >
                          <td className="border border-[var(--color-neutral-200)] px-2 py-1 font-semibold text-[var(--color-neutral-900)]">
                            {rowIndex + 1}
                          </td>
                          <td className="border border-[var(--color-neutral-200)] px-2 py-1 text-right font-semibold text-[var(--color-neutral-900)]">
                            {user.points}
                          </td>
                          <td className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-[var(--color-neutral-900)]">
                            {user.participant}
                            {user.locked ? " (L)" : ""}
                          </td>
                          {Array.from({ length: userPickColumnCount }).map((_, index) => (
                            <Fragment key={`pair-row-${user.email}-${index}`}>
                              <td className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-[var(--color-neutral-800)]">
                                {user.picks[index]?.pilotCode ?? "-"}
                              </td>
                              <td className="border border-[var(--color-neutral-200)] px-2 py-1 text-right text-[var(--color-neutral-800)]">
                                {user.picks[index]?.points ?? 0}
                              </td>
                            </Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            {activeTab === "pilots" &&
              (pilotStandings.length === 0 ? (
                <div className="text-xs text-[var(--color-neutral-600)]">No pilot standings available.</div>
              ) : (
                pilotStandings.map((pilot, index) => (
                  <div
                    key={pilot.slotId}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm text-[var(--color-neutral-800)]">
                      <Badge className={getPositionClass(index + 1)}>{index + 1}</Badge>
                      <span className="font-medium">{pilot.pilotName}</span>
                      <span className="text-xs text-[var(--color-neutral-500)]">({pilot.teamName})</span>
                    </div>
                    <div className="text-sm font-semibold">{pilot.points} pts</div>
                  </div>
                ))
              ))}

            {activeTab === "teams" &&
              (teamStandings.length === 0 ? (
                <div className="text-xs text-[var(--color-neutral-600)]">No team standings available.</div>
              ) : (
                teamStandings.map((team, index) => (
                  <div
                    key={team.teamName}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm text-[var(--color-neutral-800)]">
                      <Badge className={getPositionClass(index + 1)}>{index + 1}</Badge>
                      <span className="font-medium">{team.teamName}</span>
                    </div>
                    <div className="text-sm font-semibold">{team.points} pts</div>
                  </div>
                ))
              ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}
