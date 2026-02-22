import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Surface } from "../../components/ui/Surface";
import { useSeasons } from "../../seasons/useSeasons";

export function AdminScoringPage() {
  const { seasons, updateSeason } = useSeasons();
  const [selectedRaceId, setSelectedRaceId] = useState("");
  const [selectedPilotId, setSelectedPilotId] = useState("");
  const [pointsDraft, setPointsDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const activeSeason = useMemo(
    () => seasons.find((season) => season.status === "active") ?? null,
    [seasons]
  );

  const selectedRace = activeSeason?.races.find((race) => race.id === selectedRaceId) ?? null;
  const selectedRaceScore = activeSeason?.raceScores.find((score) => score.raceId === selectedRaceId) ?? null;
  const draftPilots = activeSeason
    ? activeSeason.teams.flatMap((team) =>
        team.pilots
          .filter((pilot) => pilot.selectedForDraft)
          .map((pilot) => ({
            pilotId: pilot.id,
            slotId: pilot.slotId,
            pilotName: pilot.name,
            teamId: team.id,
            teamName: team.name,
          }))
      )
    : [];

  const handleSaveScore = () => {
    if (!activeSeason) {
      setMessage("No active season found.");
      return;
    }
    if (!selectedRaceId) {
      setMessage("Select a race.");
      return;
    }
    if (!selectedPilotId) {
      setMessage("Select a pilot slot.");
      return;
    }

    const parsedPoints = Number(pointsDraft);
    if (!Number.isFinite(parsedPoints)) {
      setMessage("Points must be a valid number.");
      return;
    }

    const selectedPilot = draftPilots.find((pilot) => pilot.pilotId === selectedPilotId);
    if (!selectedPilot) {
      setMessage("Selected pilot was not found.");
      return;
    }

    const nextRaceScores = activeSeason.raceScores.map((score) => ({
      raceId: score.raceId,
      entries: [...score.entries],
    }));
    const raceScoreIndex = nextRaceScores.findIndex((score) => score.raceId === selectedRaceId);
    if (raceScoreIndex === -1) {
      nextRaceScores.push({
        raceId: selectedRaceId,
        entries: [],
      });
    }
    const effectiveIndex =
      raceScoreIndex === -1 ? nextRaceScores.length - 1 : raceScoreIndex;
    const raceScore = nextRaceScores[effectiveIndex];
    const entryIndex = raceScore.entries.findIndex((entry) => entry.slotId === selectedPilot.slotId);
    if (entryIndex === -1) {
      raceScore.entries.push({
        slotId: selectedPilot.slotId,
        pilotId: selectedPilot.pilotId,
        pilotName: selectedPilot.pilotName,
        teamId: selectedPilot.teamId,
        teamName: selectedPilot.teamName,
        points: parsedPoints,
      });
    } else {
      raceScore.entries[entryIndex] = {
        ...raceScore.entries[entryIndex],
        pilotId: selectedPilot.pilotId,
        pilotName: selectedPilot.pilotName,
        teamId: selectedPilot.teamId,
        teamName: selectedPilot.teamName,
        points: parsedPoints,
      };
    }
    raceScore.entries.sort((a, b) => b.points - a.points);

    const hadNoScoresBefore = (selectedRaceScore?.entries.length ?? 0) === 0;
    const nextRaces = activeSeason.races.map((race) =>
      race.id === selectedRaceId && hadNoScoresBefore ? { ...race, locked: true } : race
    );

    const result = updateSeason(activeSeason.id, {
      raceScores: nextRaceScores,
      races: nextRaces,
    });
    if (!result.success) {
      setMessage(result.message ?? "Could not save race score.");
      return;
    }

    setPointsDraft("");
    setMessage(
      hadNoScoresBefore
        ? "Score saved. Race auto-locked because scoring started."
        : "Score saved."
    );
  };

  if (!activeSeason) {
    return (
      <div className="space-y-3 p-2">
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Scoring</h1>
        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="text-sm text-[var(--color-neutral-700)]">
            No active season available. Activate a season first.
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Scoring</h1>

      <Surface tone="subtle" className="space-y-3 border-[var(--color-neutral-300)]">
        <div className="text-sm text-[var(--color-neutral-700)]">
          Active season: <span className="font-semibold">{activeSeason.name} {activeSeason.year}</span>
        </div>

        <div className="grid gap-2 md:grid-cols-[220px_1fr_140px_auto]">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Race</span>
            <select
              value={selectedRaceId}
              onChange={(event) => {
                setSelectedRaceId(event.target.value);
                setMessage(null);
              }}
              className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
            >
              <option value="">Select race</option>
              {activeSeason.races.map((race, index) => (
                <option key={race.id} value={race.id}>
                  {index + 1}. {race.name} {race.locked ? "(Locked)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Pilot Slot</span>
            <select
              value={selectedPilotId}
              onChange={(event) => {
                setSelectedPilotId(event.target.value);
                setMessage(null);
              }}
              className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
            >
              <option value="">Select pilot</option>
              {draftPilots.map((pilot) => (
                <option key={pilot.pilotId} value={pilot.pilotId}>
                  {pilot.teamName} | {pilot.pilotName} | slot {pilot.slotId}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Points</span>
            <input
              type="number"
              inputMode="decimal"
              value={pointsDraft}
              onChange={(event) => {
                setPointsDraft(event.target.value);
                setMessage(null);
              }}
              className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
            />
          </label>

          <div className="self-end">
            <Button type="button" size="sm" onClick={handleSaveScore}>
              Save Score
            </Button>
          </div>
        </div>

        {message && <div className="text-xs text-[var(--color-neutral-600)]">{message}</div>}
      </Surface>

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
          {selectedRace ? `Scores: ${selectedRace.name}` : "Scores"}
        </div>
        <div className="mt-2 space-y-1">
          {!selectedRace ? (
            <div className="text-xs text-[var(--color-neutral-500)]">Select a race to view scores.</div>
          ) : (selectedRaceScore?.entries.length ?? 0) === 0 ? (
            <div className="text-xs text-[var(--color-neutral-500)]">No scores recorded yet.</div>
          ) : (
            selectedRaceScore!.entries.map((entry, index) => (
              <div key={`${entry.slotId}-${entry.pilotId}`} className="text-sm text-[var(--color-neutral-800)]">
                {index + 1}. {entry.pilotName} ({entry.teamName}) - {entry.points} pts | slot {entry.slotId}
              </div>
            ))
          )}
        </div>
      </Surface>
    </div>
  );
}
