import { useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Surface } from "../../components/ui/Surface";
import { getRaceShortCode } from "../../seasons/raceCode";
import { useSeasons } from "../../seasons/useSeasons";
import { useSession } from "../../session/useSession";

export function AdminRacesPage() {
  const { session, loading } = useSession();
  const { seasons } = useSeasons();
  const [selectedRaceId, setSelectedRaceId] = useState("");

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
      return { ...race, hasScores };
    });
  }, [selectedSeason]);

  const allPilots = useMemo(() => {
    if (!selectedSeason) {
      return [] as Array<{
        slotId: string;
        pilotId: string;
        pilotName: string;
        teamName: string;
        selectedForDraft: boolean;
      }>;
    }

    return selectedSeason.teams.flatMap((team) =>
      team.pilots.map((pilot) => ({
        slotId: pilot.slotId,
        pilotId: pilot.id,
        pilotName: pilot.name,
        teamName: team.name,
        selectedForDraft: pilot.selectedForDraft,
      }))
    );
  }, [selectedSeason]);

  const pilotPointsMatrix = useMemo(() => {
    if (!selectedSeason) {
      return [] as Array<{
        rank: number;
        pilotName: string;
        teamName: string;
        selectedForDraft: boolean;
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

    const rows = allPilots.map((pilot) => {
      const pointsByRace = selectedSeason.races.map(
        (race) => scoreByRaceAndSlot.get(race.id)?.get(pilot.slotId) ?? 0
      );
      const totalPoints = pointsByRace.reduce((sum, value) => sum + value, 0);
      return {
        pilotName: pilot.pilotName,
        teamName: pilot.teamName,
        selectedForDraft: pilot.selectedForDraft,
        totalPoints,
        pointsByRace,
      };
    });

    rows.sort((a, b) => b.totalPoints - a.totalPoints || a.pilotName.localeCompare(b.pilotName));

    return rows.map((row, index) => ({
      rank: index + 1,
      ...row,
    }));
  }, [allPilots, selectedSeason]);

  const raceDetailRows = useMemo(() => {
    const pointsBySlot: Record<string, number> = {};
    selectedRaceScore?.entries.forEach((entry) => {
      pointsBySlot[entry.slotId] = entry.points;
    });

    return allPilots
      .map((pilot) => ({
        ...pilot,
        points: pointsBySlot[pilot.slotId] ?? 0,
      }))
      .sort((a, b) => b.points - a.points || a.pilotName.localeCompare(b.pilotName));
  }, [allPilots, selectedRaceScore]);

  if (loading || !session) {
    return <div className="p-6 text-sm text-[var(--color-neutral-700)]">Loading races...</div>;
  }

  if (!selectedSeason) {
    return (
      <div className="space-y-3 p-2">
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Admin Races</h1>
        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="text-sm text-[var(--color-neutral-700)]">No season selected.</div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Admin Races</h1>
        <p className="text-sm text-[var(--color-neutral-600)]">
          {selectedSeason.name} {selectedSeason.year} | Matrix and race points for all pilots.
        </p>
      </header>

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">Pilot Points Matrix</div>
          <div className="text-xs text-[var(--color-neutral-600)]">
            Includes drafted and non-drafted pilots.
          </div>
        </div>
        {pilotPointsMatrix.length === 0 ? (
          <div className="mt-2 text-xs text-[var(--color-neutral-500)]">No pilots available.</div>
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
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
            {selectedRace ? `Race Detail: ${selectedRace.name}` : "Race Detail"}
          </div>
          <div className="mt-3 space-y-2">
            {!selectedRace ? (
              <div className="text-xs text-[var(--color-neutral-500)]">Select a race to view details.</div>
            ) : raceDetailRows.length === 0 ? (
              <div className="text-xs text-[var(--color-neutral-500)]">No pilots available.</div>
            ) : (
              raceDetailRows.map((entry, index) => (
                <div
                  key={`${entry.slotId}-${entry.pilotId}`}
                  className="grid items-center gap-2 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 md:grid-cols-[auto_1fr_auto_auto]"
                >
                  <div className="text-xs font-semibold text-[var(--color-neutral-600)]">#{index + 1}</div>
                  <div className="text-sm text-[var(--color-neutral-800)]">
                    {entry.pilotName} <span className="text-xs text-[var(--color-neutral-500)]">({entry.teamName})</span>
                  </div>
                  <div className="flex justify-end">
                    <Badge tone={entry.selectedForDraft ? "primary" : "neutral"}>
                      {entry.selectedForDraft ? "Draft" : "Not Draft"}
                    </Badge>
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
    </div>
  );
}
