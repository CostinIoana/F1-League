import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Surface } from "../components/ui/Surface";
import { PILOT_VALUE_GROUPS, type PilotValueGroup } from "../seasons/types";
import { useSession } from "../session/useSession";

type TeamSelectionState = {
  selectedSlotIds: string[];
  locked: boolean;
  updatedAt: string;
};

const TEAM_SELECTION_KEY_PREFIX = "f1league.teamSelection";

function getTeamSelectionStorageKey(seasonId: string, userEmail: string) {
  return `${TEAM_SELECTION_KEY_PREFIX}.${seasonId}.${userEmail.toLowerCase()}`;
}

function isPilotValueGroup(value: string): value is PilotValueGroup {
  return value === "A" || value === "B" || value === "C" || value === "D" || value === "E";
}

export function MyTeamPage() {
  const { session, loading } = useSession();
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(Boolean(false));
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isSelectionHydrated, setIsSelectionHydrated] = useState(false);

  const selectedSeason = useMemo(() => {
    if (!session) {
      return null;
    }
    return session.seasons.find((season) => season.id === session.selectedSeasonId) ?? null;
  }, [session]);

  const activeGroups = useMemo(() => {
    if (!selectedSeason) {
      return [] as PilotValueGroup[];
    }
    return PILOT_VALUE_GROUPS.slice(0, selectedSeason.draftConfig.valueGroupCount);
  }, [selectedSeason]);

  const draftPool = useMemo(() => {
    if (!selectedSeason) {
      return [] as Array<{
        slotId: string;
        pilotName: string;
        teamName: string;
        valueGroup: PilotValueGroup;
      }>;
    }
    return selectedSeason.teams.flatMap((team) =>
      team.pilots
        .filter(
          (pilot) =>
            pilot.selectedForDraft &&
            isPilotValueGroup(pilot.valueGroup) &&
            activeGroups.includes(pilot.valueGroup)
        )
        .map((pilot) => ({
          slotId: pilot.slotId,
          pilotName: pilot.name,
          teamName: team.name,
          valueGroup: pilot.valueGroup as PilotValueGroup,
        }))
    );
  }, [selectedSeason, activeGroups]);

  const validSlotIdSet = useMemo(() => new Set(draftPool.map((pilot) => pilot.slotId)), [draftPool]);
  const normalizedSelectedSlotIds = useMemo(
    () => selectedSlotIds.filter((slotId) => validSlotIdSet.has(slotId)),
    [selectedSlotIds, validSlotIdSet]
  );

  const draftPoolByGroup = useMemo(() => {
    const base: Record<PilotValueGroup, typeof draftPool> = { A: [], B: [], C: [], D: [], E: [] };
    draftPool.forEach((pilot) => {
      base[pilot.valueGroup].push(pilot);
    });
    return base;
  }, [draftPool]);

  const groupRequirements = useMemo(() => {
    const requirements: Record<PilotValueGroup, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    if (!selectedSeason) {
      return requirements;
    }
    activeGroups.forEach((group) => {
      requirements[group] = Math.max(0, selectedSeason.draftConfig.groupLimits[group] ?? 0);
    });
    return requirements;
  }, [activeGroups, selectedSeason]);

  const effectiveRequiredTotal = useMemo(
    () => activeGroups.reduce((total, group) => total + groupRequirements[group], 0),
    [activeGroups, groupRequirements]
  );

  const selectedByGroup = useMemo(() => {
    const counts: Record<PilotValueGroup, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    normalizedSelectedSlotIds.forEach((slotId) => {
      const pilot = draftPool.find((item) => item.slotId === slotId);
      if (pilot) {
        counts[pilot.valueGroup] += 1;
      }
    });
    return counts;
  }, [normalizedSelectedSlotIds, draftPool]);

  const selectedPilots = useMemo(
    () =>
      normalizedSelectedSlotIds
        .map((slotId) => draftPool.find((pilot) => pilot.slotId === slotId))
        .filter((pilot): pilot is NonNullable<typeof pilot> => Boolean(pilot)),
    [normalizedSelectedSlotIds, draftPool]
  );

  const currentGroup = activeGroups[currentGroupIndex] ?? activeGroups[0];
  const currentGroupPilots = currentGroup ? draftPoolByGroup[currentGroup] : [];

  const canConfirmSelection =
    !isLocked &&
    normalizedSelectedSlotIds.length === effectiveRequiredTotal &&
    activeGroups.every((group) => selectedByGroup[group] === groupRequirements[group]);

  useEffect(() => {
    if (!session || !selectedSeason) {
      setSelectedSlotIds([]);
      setIsLocked(false);
      setIsSelectionHydrated(false);
      return;
    }

    const storageKey = getTeamSelectionStorageKey(selectedSeason.id, session.user.email);
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setSelectedSlotIds([]);
      setIsLocked(false);
      setIsSelectionHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<TeamSelectionState>;
      const storedSlotIds = Array.isArray(parsed.selectedSlotIds)
        ? parsed.selectedSlotIds.filter((slotId): slotId is string => typeof slotId === "string")
        : [];
      setSelectedSlotIds(storedSlotIds);
      setIsLocked(Boolean(parsed.locked));
    } catch {
      setSelectedSlotIds([]);
      setIsLocked(false);
    }
    setIsSelectionHydrated(true);
  }, [session, selectedSeason]);

  useEffect(() => {
    if (!session || !selectedSeason || !isSelectionHydrated) {
      return;
    }
    const storageKey = getTeamSelectionStorageKey(selectedSeason.id, session.user.email);
    const payload: TeamSelectionState = {
      selectedSlotIds: normalizedSelectedSlotIds,
      locked: isLocked,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [normalizedSelectedSlotIds, isLocked, isSelectionHydrated, session, selectedSeason]);

  const togglePilotSelection = (slotId: string) => {
    if (isLocked) {
      return;
    }
    const pilot = draftPool.find((item) => item.slotId === slotId);
    if (!pilot) {
      return;
    }
    setMessage(null);
    setSelectedSlotIds((current) => {
      const isSelected = current.includes(slotId);
      if (isSelected) {
        return current.filter((selectedSlotId) => selectedSlotId !== slotId);
      }
      if (selectedByGroup[pilot.valueGroup] >= groupRequirements[pilot.valueGroup]) {
        setMessage(
          `Group ${pilot.valueGroup} already has ${groupRequirements[pilot.valueGroup]} selected pilots.`
        );
        return current;
      }
      if (normalizedSelectedSlotIds.length >= effectiveRequiredTotal) {
        setMessage(`You can select maximum ${effectiveRequiredTotal} pilots.`);
        return current;
      }
      return [...current, slotId];
    });
  };

  const handleConfirmTeam = () => {
    if (!canConfirmSelection) {
      setMessage("Complete all group requirements before confirming.");
      return;
    }
    const confirmed = window.confirm("Lock your team selection? You won't be able to edit after confirmation.");
    if (!confirmed) {
      return;
    }
    setIsLocked(true);
    setMessage("Team locked successfully.");
  };

  if (loading || !session) {
    return <div className="p-6 text-sm text-[var(--color-neutral-700)]">Loading team setup...</div>;
  }

  if (!selectedSeason) {
    return (
      <div className="space-y-3 p-2">
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">My Team</h1>
        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="text-sm text-[var(--color-neutral-700)]">No season selected.</div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">My Team Selection</h1>
        <div className="text-sm text-[var(--color-neutral-700)]">
          {selectedSeason.name} {selectedSeason.year} | Player:{" "}
          <span className="font-semibold">{session.user.name}</span>
        </div>
        <div className="text-xs text-[var(--color-neutral-600)]">
          Pick exactly {effectiveRequiredTotal} pilots by group and then lock your team.
        </div>
      </header>

      {isLocked && (
        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">Team Locked</div>
          <div className="text-xs text-[var(--color-neutral-600)]">
            Your team is confirmed. Changes are disabled for this season.
          </div>
        </Surface>
      )}

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <div className="mb-2 flex flex-wrap gap-2">
          {activeGroups.map((group, index) => {
            const isCurrent = group === currentGroup;
            const selected = selectedByGroup[group];
            const required = groupRequirements[group];
            return (
              <button
                key={group}
                type="button"
                onClick={() => setCurrentGroupIndex(index)}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                  isCurrent
                    ? "border-[var(--color-primary-500)] bg-red-50 text-[var(--color-primary-500)]"
                    : "border-[var(--color-neutral-200)] bg-[var(--color-surface)] text-[var(--color-neutral-700)]"
                }`}
              >
                Group {group} ({selected}/{required})
              </button>
            );
          })}
        </div>

        {currentGroup ? (
          <>
            <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Group {currentGroup} | Pick {groupRequirements[currentGroup]} of {currentGroupPilots.length}
            </div>
            <div className="mt-2 space-y-2">
              {currentGroupPilots.length === 0 ? (
                <div className="text-xs text-[var(--color-neutral-500)]">No available pilots in this group.</div>
              ) : (
                currentGroupPilots.map((pilot) => {
                  const isSelected = normalizedSelectedSlotIds.includes(pilot.slotId);
                  return (
                    <div
                      key={pilot.slotId}
                      className="flex items-center justify-between rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2"
                    >
                      <div className="text-sm text-[var(--color-neutral-800)]">
                        {pilot.pilotName} <span className="text-xs text-[var(--color-neutral-500)]">({pilot.teamName})</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "solid" : "outline"}
                        onClick={() => togglePilotSelection(pilot.slotId)}
                        disabled={
                          isLocked ||
                          (!isSelected &&
                            (selectedByGroup[pilot.valueGroup] >= groupRequirements[pilot.valueGroup] ||
                              normalizedSelectedSlotIds.length >= effectiveRequiredTotal))
                        }
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="text-xs text-[var(--color-neutral-500)]">No active value groups configured.</div>
        )}
      </Surface>

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
          Selected Pilots ({normalizedSelectedSlotIds.length}/{effectiveRequiredTotal})
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedPilots.length === 0 ? (
            <div className="text-xs text-[var(--color-neutral-500)]">No pilots selected yet.</div>
          ) : (
            selectedPilots.map((pilot) => (
              <Badge key={pilot.slotId} tone="neutral">
                {pilot.pilotName} | {pilot.valueGroup}
              </Badge>
            ))
          )}
        </div>
      </Surface>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setCurrentGroupIndex((current) => Math.max(0, current - 1))}
          disabled={currentGroupIndex === 0}
        >
          Previous Group
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            setCurrentGroupIndex((current) => Math.min(activeGroups.length - 1, current + 1))
          }
          disabled={currentGroupIndex >= activeGroups.length - 1}
        >
          Next Group
        </Button>
        <Button type="button" size="sm" onClick={handleConfirmTeam} disabled={!canConfirmSelection}>
          Confirm & Lock Team
        </Button>
      </div>

      {message && <div className="text-xs text-[var(--color-neutral-600)]">{message}</div>}
    </div>
  );
}
