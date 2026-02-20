import { useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Surface } from "../../components/ui/Surface";
import {
  PILOT_VALUE_GROUPS,
  type PilotValueGroup,
  type Season,
  type SeasonStatus,
} from "../../seasons/types";
import { useSeasons } from "../../seasons/useSeasons";
import { NewDraftSeasonForm, type NewDraftSeasonInput } from "./NewDraftSeasonForm";
import { SeasonWizard, type SeasonInfoDraft, type SeasonInfoErrors } from "./SeasonWizard";

const statusLabelMap: Record<SeasonStatus, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
};

const statusToneMap: Record<SeasonStatus, "neutral" | "primary" | "secondary"> = {
  draft: "neutral",
  active: "primary",
  completed: "secondary",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createSeasonId(name: string, year: number, existingIds: Set<string>) {
  const baseId = `${slugify(name)}-${year}`;
  let nextId = baseId;
  let suffix = 2;
  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  return nextId;
}

function createRaceId(name: string, existingIds: Set<string>) {
  const baseId = slugify(name);
  let nextId = baseId || "race";
  let suffix = 2;
  while (existingIds.has(nextId)) {
    nextId = `${baseId || "race"}-${suffix}`;
    suffix += 1;
  }
  return nextId;
}

function createTeamId(name: string, existingIds: Set<string>) {
  const baseId = slugify(name);
  let nextId = baseId || "team";
  let suffix = 2;
  while (existingIds.has(nextId)) {
    nextId = `${baseId || "team"}-${suffix}`;
    suffix += 1;
  }
  return nextId;
}

function createPilotId(name: string, existingIds: Set<string>) {
  const baseId = slugify(name);
  let nextId = baseId || "pilot";
  let suffix = 2;
  while (existingIds.has(nextId)) {
    nextId = `${baseId || "pilot"}-${suffix}`;
    suffix += 1;
  }
  return nextId;
}

export function AdminSeasonPage() {
  const { seasons, getSeasonById, createDraftSeason, updateSeason } = useSeasons();
  const [wizardSeasonId, setWizardSeasonId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [seasonInfoDraft, setSeasonInfoDraft] = useState<SeasonInfoDraft>({
    name: "",
    year: "",
    entryFee: "",
  });
  const [seasonInfoErrors, setSeasonInfoErrors] = useState<SeasonInfoErrors>({});
  const [seasonInfoMessage, setSeasonInfoMessage] = useState<string | null>(null);
  const [raceNameDraft, setRaceNameDraft] = useState("");
  const [raceDateDraft, setRaceDateDraft] = useState("");
  const [raceMessage, setRaceMessage] = useState<string | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [teamMessage, setTeamMessage] = useState<string | null>(null);
  const [pilotNameDraft, setPilotNameDraft] = useState("");
  const [pilotTeamIdDraft, setPilotTeamIdDraft] = useState("");
  const [pilotValueGroupDraft, setPilotValueGroupDraft] = useState<PilotValueGroup>("A");
  const [pilotMessage, setPilotMessage] = useState<string | null>(null);
  const [draftPilotCountDraft, setDraftPilotCountDraft] = useState("");
  const [valueGroupCountDraft, setValueGroupCountDraft] = useState("");
  const [groupLimitDrafts, setGroupLimitDrafts] = useState<Record<PilotValueGroup, string>>({
    A: "",
    B: "",
    C: "",
    D: "",
    E: "",
  });
  const [draftConfigMessage, setDraftConfigMessage] = useState<string | null>(null);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }),
    []
  );

  const handleCreateDraft = (payload: NewDraftSeasonInput) => {
    const hasDuplicate = seasons.some(
      (season) =>
        season.year === payload.year && season.name.toLowerCase() === payload.name.toLowerCase()
    );

    if (hasDuplicate) {
      return { success: false, message: "A season with the same name and year already exists." };
    }

    const nextSeason: Season = {
      id: createSeasonId(payload.name, payload.year, new Set(seasons.map((season) => season.id))),
      name: payload.name,
      year: payload.year,
      entryFee: payload.entryFee,
      draftConfig: {
        valueGroupCount: 5,
        draftPilotCount: 9,
        groupLimits: { A: 9, B: 9, C: 9, D: 9, E: 9 },
      },
      races: [],
      teams: [],
      status: "draft",
    };

    const result = createDraftSeason(nextSeason);
    const createdSeason = result.season;
    if (!result.success || !createdSeason) {
      return { success: false, message: "Could not create draft season." };
    }
    return { success: true };
  };

  const handleOpenWizard = (season: Season) => {
    setWizardSeasonId(season.id);
    setWizardStep(1);
    setSeasonInfoDraft({
      name: season.name,
      year: String(season.year),
      entryFee: String(season.entryFee),
    });
    setSeasonInfoErrors({});
    setSeasonInfoMessage(null);
    setRaceNameDraft("");
    setRaceDateDraft("");
    setRaceMessage(null);
    setTeamNameDraft("");
    setTeamMessage(null);
    setPilotNameDraft("");
    setPilotTeamIdDraft(season.teams[0]?.id ?? "");
    setPilotValueGroupDraft("A");
    setPilotMessage(null);
    setDraftPilotCountDraft(String(season.draftConfig.draftPilotCount));
    setValueGroupCountDraft(String(season.draftConfig.valueGroupCount));
    setGroupLimitDrafts({
      A: String(season.draftConfig.groupLimits.A),
      B: String(season.draftConfig.groupLimits.B),
      C: String(season.draftConfig.groupLimits.C),
      D: String(season.draftConfig.groupLimits.D),
      E: String(season.draftConfig.groupLimits.E),
    });
    setDraftConfigMessage(null);
  };

  const handleCloseWizard = () => {
    setWizardSeasonId(null);
    setWizardStep(1);
    setSeasonInfoErrors({});
    setSeasonInfoMessage(null);
    setRaceNameDraft("");
    setRaceDateDraft("");
    setRaceMessage(null);
    setTeamNameDraft("");
    setTeamMessage(null);
    setPilotNameDraft("");
    setPilotTeamIdDraft("");
    setPilotValueGroupDraft("A");
    setPilotMessage(null);
    setDraftPilotCountDraft("");
    setValueGroupCountDraft("");
    setGroupLimitDrafts({ A: "", B: "", C: "", D: "", E: "" });
    setDraftConfigMessage(null);
  };

  const activeWizardSeason = wizardSeasonId ? getSeasonById(wizardSeasonId) : null;
  const wizardIsLocked = activeWizardSeason ? activeWizardSeason.status !== "draft" : true;
  const availableValueGroups = PILOT_VALUE_GROUPS.slice(
    0,
    activeWizardSeason?.draftConfig.valueGroupCount ?? 1
  );

  const handleSeasonInfoChange = (field: keyof SeasonInfoDraft, value: string) => {
    setSeasonInfoDraft((current) => ({ ...current, [field]: value }));
    setSeasonInfoMessage(null);
    setSeasonInfoErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleRaceNameChange = (value: string) => {
    setRaceNameDraft(value);
    setRaceMessage(null);
  };

  const handleRaceDateChange = (value: string) => {
    setRaceDateDraft(value);
    setRaceMessage(null);
  };

  const handleTeamNameChange = (value: string) => {
    setTeamNameDraft(value);
    setTeamMessage(null);
  };

  const handlePilotNameChange = (value: string) => {
    setPilotNameDraft(value);
    setPilotMessage(null);
  };

  const handlePilotTeamIdChange = (value: string) => {
    setPilotTeamIdDraft(value);
    setPilotMessage(null);
  };

  const handlePilotValueGroupChange = (value: PilotValueGroup) => {
    setPilotValueGroupDraft(value);
    setPilotMessage(null);
  };

  const handleDraftPilotCountChange = (value: string) => {
    setDraftPilotCountDraft(value);
    setDraftConfigMessage(null);
  };

  const handleValueGroupCountChange = (value: string) => {
    setValueGroupCountDraft(value);
    setDraftConfigMessage(null);
  };

  const handleGroupLimitChange = (group: PilotValueGroup, value: string) => {
    setGroupLimitDrafts((current) => ({ ...current, [group]: value }));
    setDraftConfigMessage(null);
  };

  const handleAddRace = () => {
    if (!activeWizardSeason) {
      setRaceMessage("Not found");
      return;
    }

    if (wizardIsLocked) {
      setRaceMessage("Locked: only draft seasons can be edited.");
      return;
    }

    const trimmedName = raceNameDraft.trim();
    if (trimmedName.length < 3) {
      setRaceMessage("Race name must have at least 3 characters.");
      return;
    }

    if (!raceDateDraft) {
      setRaceMessage("Race date is required.");
      return;
    }

    const hasDuplicate = activeWizardSeason.races.some(
      (race) =>
        race.name.toLowerCase() === trimmedName.toLowerCase() &&
        race.date === raceDateDraft
    );
    if (hasDuplicate) {
      setRaceMessage("Race already exists in this season.");
      return;
    }

    const nextRaces = [
      ...activeWizardSeason.races,
      {
        id: createRaceId(trimmedName, new Set(activeWizardSeason.races.map((race) => race.id))),
        name: trimmedName,
        date: raceDateDraft,
      },
    ];

    const result = updateSeason(activeWizardSeason.id, { races: nextRaces });
    if (!result.success) {
      setRaceMessage(result.message ?? "Could not add race.");
      return;
    }

    setRaceNameDraft("");
    setRaceDateDraft("");
    setRaceMessage("Race added.");
  };

  const handleAddTeam = () => {
    if (!activeWizardSeason) {
      setTeamMessage("Not found");
      return;
    }

    if (wizardIsLocked) {
      setTeamMessage("Locked: only draft seasons can be edited.");
      return;
    }

    const trimmedName = teamNameDraft.trim();
    if (trimmedName.length < 2) {
      setTeamMessage("Team name must have at least 2 characters.");
      return;
    }

    const hasDuplicate = activeWizardSeason.teams.some(
      (team) => team.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (hasDuplicate) {
      setTeamMessage("Team already exists in this season.");
      return;
    }

    const nextTeams = [
      ...activeWizardSeason.teams,
      {
        id: createTeamId(trimmedName, new Set(activeWizardSeason.teams.map((team) => team.id))),
        name: trimmedName,
        pilots: [],
      },
    ];

    const result = updateSeason(activeWizardSeason.id, { teams: nextTeams });
    if (!result.success) {
      setTeamMessage(result.message ?? "Could not add team.");
      return;
    }

    setTeamNameDraft("");
    setTeamMessage("Team added.");

    if (!pilotTeamIdDraft) {
      setPilotTeamIdDraft(nextTeams[0]?.id ?? "");
    }
  };

  const handleAddPilot = () => {
    if (!activeWizardSeason) {
      setPilotMessage("Not found");
      return;
    }

    if (wizardIsLocked) {
      setPilotMessage("Locked: only draft seasons can be edited.");
      return;
    }

    if (activeWizardSeason.teams.length === 0) {
      setPilotMessage("Add at least one team first.");
      return;
    }

    const selectedTeamId = pilotTeamIdDraft || activeWizardSeason.teams[0]?.id;
    const selectedTeam = activeWizardSeason.teams.find((team) => team.id === selectedTeamId);
    if (!selectedTeam) {
      setPilotMessage("Please select a valid team.");
      return;
    }

    const trimmedName = pilotNameDraft.trim();
    if (trimmedName.length < 2) {
      setPilotMessage("Pilot name must have at least 2 characters.");
      return;
    }

    const hasDuplicate = selectedTeam.pilots.some(
      (pilot) => pilot.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (hasDuplicate) {
      setPilotMessage("Pilot already exists in selected team.");
      return;
    }

    if (!availableValueGroups.includes(pilotValueGroupDraft)) {
      setPilotMessage("Selected value group is not allowed by season configuration.");
      return;
    }

    const nextPilot = {
      id: createPilotId(trimmedName, new Set(selectedTeam.pilots.map((pilot) => pilot.id))),
      name: trimmedName,
      valueGroup: pilotValueGroupDraft,
      selectedForDraft: false,
    };

    const nextTeams = activeWizardSeason.teams.map((team) =>
      team.id === selectedTeam.id ? { ...team, pilots: [...team.pilots, nextPilot] } : team
    );

    const result = updateSeason(activeWizardSeason.id, { teams: nextTeams });
    if (!result.success) {
      setPilotMessage(result.message ?? "Could not add pilot.");
      return;
    }

    setPilotNameDraft("");
    setPilotMessage("Pilot added.");
  };

  const handleTogglePilotDraftSelection = (teamId: string, pilotId: string) => {
    if (!activeWizardSeason) {
      setPilotMessage("Not found");
      return;
    }

    if (wizardIsLocked) {
      setPilotMessage("Locked: only draft seasons can be edited.");
      return;
    }

    const selectedCount = activeWizardSeason.teams.reduce(
      (count, team) => count + team.pilots.filter((pilot) => pilot.selectedForDraft).length,
      0
    );
    const selectedByGroup = activeWizardSeason.teams.reduce(
      (groupCounts, team) => {
        team.pilots.forEach((pilot) => {
          if (pilot.selectedForDraft) {
            groupCounts[pilot.valueGroup] += 1;
          }
        });
        return groupCounts;
      },
      { A: 0, B: 0, C: 0, D: 0, E: 0 } as Record<PilotValueGroup, number>
    );

    let blockedByLimit = false;
    let blockedByGroupLimit = false;
    const nextTeams = activeWizardSeason.teams.map((team) => {
      if (team.id !== teamId) {
        return team;
      }
      return {
        ...team,
        pilots: team.pilots.map((pilot) => {
          if (pilot.id !== pilotId) {
            return pilot;
          }
          if (
            !pilot.selectedForDraft &&
            selectedCount >= activeWizardSeason.draftConfig.draftPilotCount
          ) {
            blockedByLimit = true;
            return pilot;
          }
          if (
            !pilot.selectedForDraft &&
            selectedByGroup[pilot.valueGroup] >= activeWizardSeason.draftConfig.groupLimits[pilot.valueGroup]
          ) {
            blockedByGroupLimit = true;
            return pilot;
          }
          return { ...pilot, selectedForDraft: !pilot.selectedForDraft };
        }),
      };
    });

    if (blockedByLimit) {
      setPilotMessage(
        `Maximum ${activeWizardSeason.draftConfig.draftPilotCount} selected pilots for draft.`
      );
      return;
    }

    if (blockedByGroupLimit) {
      setPilotMessage("Group limit reached for this value group.");
      return;
    }

    const result = updateSeason(activeWizardSeason.id, { teams: nextTeams });
    if (!result.success) {
      setPilotMessage(result.message ?? "Could not update pilot selection.");
      return;
    }

    setPilotMessage("Draft selection updated.");
  };

  const handleSaveDraftConfig = () => {
    if (!activeWizardSeason) {
      setDraftConfigMessage("Not found");
      return;
    }

    if (wizardIsLocked) {
      setDraftConfigMessage("Locked: only draft seasons can be edited.");
      return;
    }

    const nextDraftPilotCount = Number(draftPilotCountDraft);
    const nextValueGroupCount = Number(valueGroupCountDraft);

    if (!Number.isInteger(nextDraftPilotCount) || nextDraftPilotCount < 1 || nextDraftPilotCount > 20) {
      setDraftConfigMessage("Draft pilots count must be an integer between 1 and 20.");
      return;
    }

    if (!Number.isInteger(nextValueGroupCount) || nextValueGroupCount < 1 || nextValueGroupCount > 5) {
      setDraftConfigMessage("Value groups count must be an integer between 1 and 5.");
      return;
    }

    const selectedCount = activeWizardSeason.teams.reduce(
      (count, team) => count + team.pilots.filter((pilot) => pilot.selectedForDraft).length,
      0
    );
    if (selectedCount > nextDraftPilotCount) {
      setDraftConfigMessage(
        `You already have ${selectedCount} selected pilots. Increase draft limit or unselect pilots first.`
      );
      return;
    }

    const allowedGroups = new Set(PILOT_VALUE_GROUPS.slice(0, nextValueGroupCount));
    const nextGroupLimits: Record<PilotValueGroup, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const group of PILOT_VALUE_GROUPS) {
      if (!allowedGroups.has(group)) {
        nextGroupLimits[group] = 0;
        continue;
      }

      const parsedLimit = Number(groupLimitDrafts[group]);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 0 || parsedLimit > nextDraftPilotCount) {
        setDraftConfigMessage(
          `Group ${group} limit must be an integer between 0 and ${nextDraftPilotCount}.`
        );
        return;
      }
      nextGroupLimits[group] = parsedLimit;
    }

    const hasOutOfRangePilots = activeWizardSeason.teams.some((team) =>
      team.pilots.some((pilot) => !allowedGroups.has(pilot.valueGroup))
    );
    if (hasOutOfRangePilots) {
      setDraftConfigMessage(
        "Some pilots use value groups outside the new limit. Update pilot groups first."
      );
      return;
    }

    const selectedByGroup = activeWizardSeason.teams.reduce(
      (groupCounts, team) => {
        team.pilots.forEach((pilot) => {
          if (pilot.selectedForDraft) {
            groupCounts[pilot.valueGroup] += 1;
          }
        });
        return groupCounts;
      },
      { A: 0, B: 0, C: 0, D: 0, E: 0 } as Record<PilotValueGroup, number>
    );

    const exceedingGroup = PILOT_VALUE_GROUPS.find(
      (group) => selectedByGroup[group] > nextGroupLimits[group]
    );
    if (exceedingGroup) {
      setDraftConfigMessage(
        `Selected pilots in group ${exceedingGroup} exceed new limit (${nextGroupLimits[exceedingGroup]}).`
      );
      return;
    }

    const result = updateSeason(activeWizardSeason.id, {
      draftConfig: {
        valueGroupCount: nextValueGroupCount,
        draftPilotCount: nextDraftPilotCount,
        groupLimits: nextGroupLimits,
      },
    });

    if (!result.success) {
      setDraftConfigMessage(result.message ?? "Could not update draft config.");
      return;
    }

    if (!allowedGroups.has(pilotValueGroupDraft)) {
      setPilotValueGroupDraft("A");
    }

    setDraftConfigMessage("Draft config saved.");
  };

  const handleSaveSeasonInfo = () => {
    if (!activeWizardSeason) {
      setSeasonInfoMessage("Not found");
      return false;
    }

    if (wizardIsLocked) {
      setSeasonInfoMessage("Locked: only draft seasons can be edited.");
      return true;
    }

    const parsedYear = Number(seasonInfoDraft.year);
    const parsedEntryFee = Number(seasonInfoDraft.entryFee);
    const currentYear = new Date().getFullYear();

    const nextErrors: SeasonInfoErrors = {};
    if (seasonInfoDraft.name.trim().length < 3) {
      nextErrors.name = "Name must have at least 3 characters.";
    }
    if (!Number.isInteger(parsedYear) || parsedYear < 1950 || parsedYear > currentYear + 3) {
      nextErrors.year = `Year must be between 1950 and ${currentYear + 3}.`;
    }
    if (!Number.isFinite(parsedEntryFee) || parsedEntryFee <= 0) {
      nextErrors.entryFee = "Fee must be a number greater than 0.";
    }

    setSeasonInfoErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return false;
    }

    const result = updateSeason(activeWizardSeason.id, {
      name: seasonInfoDraft.name.trim(),
      year: parsedYear,
      entryFee: parsedEntryFee,
    });

    if (!result.success || !result.season) {
      setSeasonInfoMessage(result.message ?? "Could not update season info.");
      return false;
    }

    setSeasonInfoMessage("Season info saved.");
    return true;
  };

  const handleWizardStepSelect = (nextStep: number) => {
    if (nextStep === wizardStep) {
      return;
    }

    if (wizardStep === 1 && nextStep > 1) {
      const saved = handleSaveSeasonInfo();
      if (!saved) {
        return;
      }
    }

    setWizardStep(nextStep);
  };

  const handleWizardBack = () => {
    setWizardStep((current) => Math.max(1, current - 1));
  };

  const handleWizardNext = () => {
    if (wizardStep === 1) {
      const saved = handleSaveSeasonInfo();
      if (!saved) {
        return;
      }
    }
    setWizardStep((current) => Math.min(6, current + 1));
  };

  return (
    <div className="space-y-4 p-2">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Season Setup</h1>
        <p className="text-sm text-[var(--color-neutral-600)]">
          Manage seasons by status and configure draft seasons in a 6-step wizard.
        </p>
      </header>

      {wizardSeasonId && !activeWizardSeason && (
        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="text-sm font-semibold text-[var(--color-primary-500)]">Not found</div>
          <div className="mt-1 text-xs text-[var(--color-neutral-600)]">
            Season with ID <code>{wizardSeasonId}</code> was not found.
          </div>
          <div className="mt-3">
            <Button type="button" size="sm" variant="ghost" onClick={handleCloseWizard}>
              Close
            </Button>
          </div>
        </Surface>
      )}

      {activeWizardSeason && (
        <SeasonWizard
          season={activeWizardSeason}
          currentStep={wizardStep}
          infoDraft={seasonInfoDraft}
          infoErrors={seasonInfoErrors}
          isLocked={wizardIsLocked}
          infoMessage={seasonInfoMessage}
          raceNameDraft={raceNameDraft}
          raceDateDraft={raceDateDraft}
          raceMessage={raceMessage}
          teamNameDraft={teamNameDraft}
          teamMessage={teamMessage}
          pilotNameDraft={pilotNameDraft}
          pilotTeamIdDraft={pilotTeamIdDraft}
          pilotValueGroupDraft={pilotValueGroupDraft}
          pilotMessage={pilotMessage}
          availableValueGroups={availableValueGroups}
          draftPilotCount={activeWizardSeason.draftConfig.draftPilotCount}
          draftPilotCountDraft={draftPilotCountDraft}
          valueGroupCountDraft={valueGroupCountDraft}
          groupLimitDrafts={groupLimitDrafts}
          draftConfigMessage={draftConfigMessage}
          onClose={handleCloseWizard}
          onStepSelect={handleWizardStepSelect}
          onBack={handleWizardBack}
          onNext={handleWizardNext}
          onInfoChange={handleSeasonInfoChange}
          onSaveInfo={handleSaveSeasonInfo}
          onRaceNameChange={handleRaceNameChange}
          onRaceDateChange={handleRaceDateChange}
          onAddRace={handleAddRace}
          onTeamNameChange={handleTeamNameChange}
          onAddTeam={handleAddTeam}
          onPilotNameChange={handlePilotNameChange}
          onPilotTeamIdChange={handlePilotTeamIdChange}
          onPilotValueGroupChange={handlePilotValueGroupChange}
          onAddPilot={handleAddPilot}
          onTogglePilotDraftSelection={handleTogglePilotDraftSelection}
          onDraftPilotCountChange={handleDraftPilotCountChange}
          onValueGroupCountChange={handleValueGroupCountChange}
          onGroupLimitChange={handleGroupLimitChange}
          onSaveDraftConfig={handleSaveDraftConfig}
        />
      )}

      <NewDraftSeasonForm onCreateDraft={handleCreateDraft} />

      <div className="space-y-3">
        {seasons.map((season) => (
          <Surface
            key={season.id}
            className="flex items-center justify-between gap-3 border-[var(--color-neutral-200)]"
          >
            <div>
              <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
                {season.name} {season.year}
              </div>
              <div className="text-xs text-[var(--color-neutral-500)]">
                Fee: {currencyFormatter.format(season.entryFee)} | Season ID: {season.id}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {season.status === "draft" && (
                <Button type="button" size="sm" variant="outline" onClick={() => handleOpenWizard(season)}>
                  Edit
                </Button>
              )}
              <Badge tone={statusToneMap[season.status]}>{statusLabelMap[season.status]}</Badge>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
