import { useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Surface } from "../components/ui/Surface";
import { getRaceShortCode } from "../seasons/raceCode";
import { useSeasons } from "../seasons/useSeasons";
import { useSession } from "../session/useSession";

type StoredTeamSelection = {
  selectedSlotIds?: string[];
  locked?: boolean;
};

const TEAM_SELECTION_KEY_PREFIX = "f1league.teamSelection";

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
      users.push({
        email,
        selectedSlotIds,
        locked: Boolean(parsed.locked),
      });
    } catch {
      // Ignore malformed entries and continue with valid ones.
    }
  }

  return users;
}

function getPositionLabel(position: number) {
  if (position === 1) {
    return "1st";
  }
  if (position === 2) {
    return "2nd";
  }
  if (position === 3) {
    return "3rd";
  }
  return `${position}th`;
}

export function RacesPage() {
  const { session, loading } = useSession();
  const { seasons, updateSeason } = useSeasons();
  const [selectedRaceId, setSelectedRaceId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pointsDraftBySlot, setPointsDraftBySlot] = useState<Record<string, string>>({});

  const selectedSeason = useMemo(() => {
    if (!session) {
      return null;
    }
    return seasons.find((season) => season.id === session.selectedSeasonId) ?? null;
  }, [session, seasons]);

  const effectiveSelectedRaceId = selectedRaceId || selectedSeason?.races[0]?.id || "";
  const selectedRace = selectedSeason?.races.find((race) => race.id === effectiveSelectedRaceId) ?? null;
  const selectedRaceScore =
    selectedSeason?.raceScores.find((raceScore) => raceScore.raceId === effectiveSelectedRaceId) ?? null;

  const raceStatusList = useMemo(() => {
    if (!selectedSeason) {
      return [];
    }
    return selectedSeason.races.map((race) => {
      const hasScores = (selectedSeason.raceScores.find((score) => score.raceId === race.id)?.entries.length ?? 0) > 0;
      return {
        ...race,
        hasScores,
      };
    });
  }, [selectedSeason]);

  const draftPool = useMemo(() => {
    if (!selectedSeason) {
      return [] as Array<{
        slotId: string;
        pilotId: string;
        pilotName: string;
        teamId: string;
        teamName: string;
      }>;
    }
    return selectedSeason.teams.flatMap((team) =>
      team.pilots
        .filter((pilot) => pilot.selectedForDraft)
        .map((pilot) => ({
          slotId: pilot.slotId,
          pilotId: pilot.id,
          pilotName: pilot.name,
          teamId: team.id,
          teamName: team.name,
        }))
    );
  }, [selectedSeason]);

  const pointsBySlotForRace = useMemo(() => {
    const result: Record<string, number> = {};
    selectedRaceScore?.entries.forEach((entry) => {
      result[entry.slotId] = entry.points;
    });
    return result;
  }, [selectedRaceScore]);

  const seasonTotalsBySlot = useMemo(() => {
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

  const pilotPointsMatrix = useMemo(() => {
    if (!selectedSeason) {
      return [] as Array<{
        rank: number;
        pilotName: string;
        teamName: string;
        totalPoints: number;
        pointsByRace: number[];
      }>;
    }

    const scoreByRaceAndSlot = new Map<string, Map<string, number>>();
    selectedSeason.raceScores.forEach((raceScore) => {
      const slotPoints = new Map<string, number>();
      raceScore.entries.forEach((entry) => {
        slotPoints.set(entry.slotId, entry.points);
      });
      scoreByRaceAndSlot.set(raceScore.raceId, slotPoints);
    });

    const rows = selectedSeason.teams.flatMap((team) =>
      team.pilots
        .filter((pilot) => pilot.selectedForDraft)
        .map((pilot) => {
          const pointsByRace = selectedSeason.races.map(
            (race) => scoreByRaceAndSlot.get(race.id)?.get(pilot.slotId) ?? 0
          );
          const totalPoints = pointsByRace.reduce((sum, value) => sum + value, 0);
          return {
            pilotName: pilot.name,
            teamName: team.name,
            totalPoints,
            pointsByRace,
          };
        })
    );

    rows.sort((a, b) => b.totalPoints - a.totalPoints || a.pilotName.localeCompare(b.pilotName));

    return rows.map((row, index) => ({
      rank: index + 1,
      ...row,
    }));
  }, [selectedSeason]);

  const userRankings = useMemo(() => {
    if (!selectedSeason || !selectedRace) {
      return [] as Array<{
        email: string;
        racePoints: number;
        seasonPoints: number;
        locked: boolean;
      }>;
    }

    const storedSelections = getUserSelectionsFromStorage(selectedSeason.id);
    return storedSelections
      .map((selection) => {
        const racePoints = selection.selectedSlotIds.reduce(
          (sum, slotId) => sum + (pointsBySlotForRace[slotId] ?? 0),
          0
        );
        const seasonPoints = selection.selectedSlotIds.reduce(
          (sum, slotId) => sum + (seasonTotalsBySlot[slotId] ?? 0),
          0
        );
        return {
          email: selection.email,
          racePoints,
          seasonPoints,
          locked: selection.locked,
        };
      })
      .sort((a, b) => b.seasonPoints - a.seasonPoints || b.racePoints - a.racePoints);
  }, [selectedSeason, selectedRace, pointsBySlotForRace, seasonTotalsBySlot]);

  const raceEntries = useMemo(() => {
    return draftPool
      .map((pilot) => {
        const persistedPoints = pointsBySlotForRace[pilot.slotId];
        const draftValue = pointsDraftBySlot[pilot.slotId];
        const parsedDraft = draftValue !== undefined && draftValue !== "" ? Number(draftValue) : persistedPoints;
        const effectivePoints = Number.isFinite(parsedDraft) ? parsedDraft : 0;
        return {
          ...pilot,
          points: effectivePoints,
          hasPersistedScore: persistedPoints !== undefined,
        };
      })
      .sort((a, b) => b.points - a.points);
  }, [draftPool, pointsBySlotForRace, pointsDraftBySlot]);

  const canEditScores = Boolean(session?.user.role === "admin" && selectedSeason?.status === "active" && selectedRace);

  const handleSaveRaceScores = () => {
    if (!selectedSeason || !selectedRace) {
      setMessage("Select a race first.");
      return;
    }
    if (!canEditScores) {
      setMessage("Only admin can edit race scores in active season.");
      return;
    }

    const nextEntries = raceEntries.map((entry) => ({
      slotId: entry.slotId,
      pilotId: entry.pilotId,
      pilotName: entry.pilotName,
      teamId: entry.teamId,
      teamName: entry.teamName,
      points: entry.points,
    }));

    const nextRaceScores = selectedSeason.raceScores.map((raceScore) => ({
      raceId: raceScore.raceId,
      entries: [...raceScore.entries],
    }));
    const raceScoreIndex = nextRaceScores.findIndex((raceScore) => raceScore.raceId === selectedRace.id);
    if (raceScoreIndex === -1) {
      nextRaceScores.push({ raceId: selectedRace.id, entries: nextEntries });
    } else {
      nextRaceScores[raceScoreIndex] = {
        raceId: selectedRace.id,
        entries: nextEntries,
      };
    }

    const nextRaces = selectedSeason.races.map((race) =>
      race.id === selectedRace.id && nextEntries.length > 0 ? { ...race, locked: true } : race
    );

    const result = updateSeason(selectedSeason.id, {
      raceScores: nextRaceScores,
      races: nextRaces,
    });

    if (!result.success) {
      setMessage(result.message ?? "Could not save race scores.");
      return;
    }

    setPointsDraftBySlot({});
    setMessage("Race scores saved.");
  };

  if (loading || !session) {
    return <div className="p-6 text-sm text-[var(--color-neutral-700)]">Loading races...</div>;
  }

  if (!selectedSeason) {
    return (
      <div className="space-y-3 p-2">
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Races</h1>
        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="text-sm text-[var(--color-neutral-700)]">No season selected.</div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Races</h1>
        <p className="text-sm text-[var(--color-neutral-600)]">
          {selectedSeason.name} {selectedSeason.year} | Track race status, scoring, and standings.
        </p>
      </header>

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">Pilot Points Matrix</div>
          <div className="text-xs text-[var(--color-neutral-600)]">
            Total + points pe fiecare etapa (derulare pe orizontala).
          </div>
        </div>
        {pilotPointsMatrix.length === 0 ? (
          <div className="mt-2 text-xs text-[var(--color-neutral-500)]">No drafted pilots available.</div>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--color-neutral-100)] text-[var(--color-neutral-900)]">
                  <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-left">
                    Rank
                  </th>
                  <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-left">
                    Pilot
                  </th>
                  <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-right">
                    Total
                  </th>
                  {selectedSeason.races.map((race) => (
                    <th
                      key={race.id}
                      className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-right"
                    >
                      {getRaceShortCode(race.name)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pilotPointsMatrix.map((row, rowIndex) => (
                  <tr
                    key={`${row.teamName}-${row.pilotName}`}
                    className={rowIndex % 2 === 0 ? "bg-[var(--color-surface)]" : "bg-[var(--color-neutral-100)]"}
                  >
                    <td className="border border-[var(--color-neutral-200)] px-2 py-1 font-semibold text-[var(--color-neutral-800)]">
                      {row.rank}
                    </td>
                    <td className="whitespace-nowrap border border-[var(--color-neutral-200)] px-2 py-1 text-[var(--color-neutral-900)]">
                      {row.pilotName}
                    </td>
                    <td className="border border-[var(--color-neutral-200)] px-2 py-1 text-right font-semibold text-[var(--color-neutral-900)]">
                      {row.totalPoints}
                    </td>
                    {row.pointsByRace.map((points, raceIndex) => (
                      <td
                        key={`${row.pilotName}-${selectedSeason.races[raceIndex]?.id ?? raceIndex}`}
                        className="border border-[var(--color-neutral-200)] px-2 py-1 text-right text-[var(--color-neutral-800)]"
                      >
                        {points}
                      </td>
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
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">Race List</div>
          <div className="mt-2 space-y-2">
            {raceStatusList.length === 0 ? (
              <div className="text-xs text-[var(--color-neutral-500)]">No races configured for this season.</div>
            ) : (
              raceStatusList.map((race, index) => (
                <button
                  key={race.id}
                  type="button"
                  onClick={() => setSelectedRaceId(race.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${
                    race.id === effectiveSelectedRaceId
                      ? "border-[var(--color-primary-500)] bg-[var(--color-neutral-100)]"
                      : "border-[var(--color-neutral-200)] bg-[var(--color-surface)]"
                  }`}
                >
                  <div className="text-sm text-[var(--color-neutral-800)]">
                    {index + 1}. {race.name} {race.date ? `(${race.date})` : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={race.hasScores ? "primary" : "neutral"}>
                      {race.hasScores ? "Complete" : "Pending"}
                    </Badge>
                    {race.locked && <Badge tone="secondary">Locked</Badge>}
                  </div>
                </button>
              ))
            )}
          </div>
        </Surface>

        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
              {selectedRace ? `Race Detail: ${selectedRace.name}` : "Race Detail"}
            </div>
            <Button type="button" size="sm" onClick={handleSaveRaceScores} disabled={!canEditScores}>
              Save Scores
            </Button>
          </div>
          {!canEditScores && (
            <div className="mt-1 text-xs text-[var(--color-neutral-600)]">
              Scoring is editable only by admin in active season.
            </div>
          )}
          <div className="mt-3 space-y-2">
            {!selectedRace ? (
              <div className="text-xs text-[var(--color-neutral-500)]">Select a race to view details.</div>
            ) : raceEntries.length === 0 ? (
              <div className="text-xs text-[var(--color-neutral-500)]">
                No drafted pilots available for scoring.
              </div>
            ) : (
              raceEntries.map((entry, index) => (
                <div
                  key={entry.slotId}
                  className="grid items-center gap-2 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 md:grid-cols-[auto_1fr_auto_auto]"
                >
                  <div className="text-xs font-semibold text-[var(--color-neutral-600)]">#{index + 1}</div>
                  <div className="text-sm text-[var(--color-neutral-800)]">
                    {entry.pilotName} <span className="text-xs text-[var(--color-neutral-500)]">({entry.teamName})</span>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={pointsDraftBySlot[entry.slotId] ?? String(entry.points)}
                      onChange={(event) => {
                        setPointsDraftBySlot((current) => ({
                          ...current,
                          [entry.slotId]: event.target.value,
                        }));
                        setMessage(null);
                      }}
                      disabled={!canEditScores}
                      className="w-20 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-2 py-1 text-right text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                    />
                  </div>
                  <div className="text-right text-sm font-semibold text-[var(--color-neutral-800)]">
                    {entry.points} pts
                  </div>
                </div>
              ))
            )}
          </div>
        </Surface>
      </div>

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <div className="text-sm font-semibold text-[var(--color-neutral-900)]">User Rankings</div>
        <div className="mt-2 space-y-1">
          {userRankings.length === 0 ? (
            <div className="text-xs text-[var(--color-neutral-500)]">
              No user team selections found for this season yet.
            </div>
          ) : (
            userRankings.map((user, index) => (
              <div
                key={user.email}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2"
              >
                <div className="flex items-center gap-2 text-sm text-[var(--color-neutral-800)]">
                  <Badge tone={index === 0 ? "primary" : index === 1 ? "secondary" : "neutral"}>
                    {getPositionLabel(index + 1)}
                  </Badge>
                  <span className="font-medium">{user.email}</span>
                  {user.locked && <Badge tone="neutral">Locked Team</Badge>}
                </div>
                <div className="text-xs text-[var(--color-neutral-700)]">
                  Race: <span className="font-semibold">{user.racePoints}</span> pts | Season:{" "}
                  <span className="font-semibold">{user.seasonPoints}</span> pts
                </div>
              </div>
            ))
          )}
        </div>
      </Surface>

      {message && <div className="text-xs text-[var(--color-neutral-600)]">{message}</div>}
    </div>
  );
}
