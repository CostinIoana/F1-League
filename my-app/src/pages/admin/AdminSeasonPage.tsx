import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Surface } from "../../components/ui/Surface";
import {
  PILOT_VALUE_GROUPS,
  type PilotGroup,
  type PilotValueGroup,
  type Season,
  type SeasonStatus,
} from "../../seasons/types";
import { useSeasons } from "../../seasons/useSeasons";
import { NewDraftSeasonForm, type NewDraftSeasonInput } from "./NewDraftSeasonForm";
import { SeasonWizard, type SeasonInfoDraft, type SeasonInfoErrors } from "./SeasonWizard";

type SeasonSetupSubmenu = "newDraft" | "completedSeasons";

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

const MAX_GROUP_LIMIT = 99;

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

function createSlotId(name: string, existingIds: Set<string>) {
  const baseId = slugify(name);
  let nextId = baseId || "slot";
  let suffix = 2;
  while (existingIds.has(nextId)) {
    nextId = `${baseId || "slot"}-${suffix}`;
    suffix += 1;
  }
  return nextId;
}

export function AdminSeasonPage() {
  const { seasons, getSeasonById, createDraftSeason, updateSeason, deleteSeason } = useSeasons();
  const [searchParams] = useSearchParams();
  const seasonSetupSubmenu: SeasonSetupSubmenu =
    searchParams.get("view") === "completedSeasons" ? "completedSeasons" : "newDraft";
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
  const [importMessage, setImportMessage] = useState<string | null>(null);
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
  const [activationMessage, setActivationMessage] = useState<string | null>(null);
  const [exceptionSourceSlotId, setExceptionSourceSlotId] = useState("");
  const [exceptionTargetSlotId, setExceptionTargetSlotId] = useState("");
  const [exceptionReplacementName, setExceptionReplacementName] = useState("");
  const [exceptionMessage, setExceptionMessage] = useState<string | null>(null);
  const [seasonActionMessage, setSeasonActionMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ seasonId: string; step: 1 | 2 } | null>(null);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }),
    []
  );
  const completedSeasons = useMemo(
    () => seasons.filter((season) => season.status === "completed"),
    [seasons]
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
      raceScores: [],
      teams: [],
      status: "draft",
      adminOverrides: { editingEnabled: false },
    };

    const result = createDraftSeason(nextSeason);
    const createdSeason = result.season;
    if (!result.success || !createdSeason) {
      return { success: false, message: "Could not create draft season." };
    }
    return { success: true };
  };

  const handleOpenWizard = (season: Season) => {
    setSeasonActionMessage(null);
    setPendingDelete(null);
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
    setImportMessage(null);
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
    setActivationMessage(null);
    const allPilots = season.teams.flatMap((team) => team.pilots);
    setExceptionSourceSlotId(allPilots[0]?.slotId ?? "");
    setExceptionTargetSlotId(allPilots[1]?.slotId ?? allPilots[0]?.slotId ?? "");
    setExceptionReplacementName("");
    setExceptionMessage(null);
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
    setImportMessage(null);
    setDraftPilotCountDraft("");
    setValueGroupCountDraft("");
    setGroupLimitDrafts({ A: "", B: "", C: "", D: "", E: "" });
    setDraftConfigMessage(null);
    setActivationMessage(null);
    setExceptionSourceSlotId("");
    setExceptionTargetSlotId("");
    setExceptionReplacementName("");
    setExceptionMessage(null);
    setPendingDelete(null);
  };

  const handleDeleteSeason = (seasonId: string) => {
    setPendingDelete({ seasonId, step: 1 });
    setSeasonActionMessage(null);
  };

  const handleCancelDeleteSeason = () => {
    setPendingDelete(null);
  };

  const handleConfirmDeleteSeason = () => {
    if (!pendingDelete) {
      return;
    }
    const season = seasons.find((item) => item.id === pendingDelete.seasonId);
    if (!season) {
      setPendingDelete(null);
      setSeasonActionMessage("Season not found.");
      return;
    }

    if (pendingDelete.step === 1) {
      setPendingDelete({ seasonId: season.id, step: 2 });
      return;
    }

    const result = deleteSeason(season.id);
    if (!result.success) {
      setSeasonActionMessage(result.message ?? "Could not delete season.");
      return;
    }

    if (wizardSeasonId === season.id) {
      handleCloseWizard();
    }

    setPendingDelete(null);
    setSeasonActionMessage("Season deleted.");
  };

  const activeWizardSeason = wizardSeasonId ? getSeasonById(wizardSeasonId) : null;
  const isDraftSeason = activeWizardSeason?.status === "draft";
  const isActiveSeason = activeWizardSeason?.status === "active";
  const isActiveOverrideEnabled = Boolean(activeWizardSeason?.adminOverrides.editingEnabled);
  const canEditSeasonInfo = Boolean(isDraftSeason);
  const canEditCalendar = Boolean(isDraftSeason || (isActiveSeason && isActiveOverrideEnabled));
  const canEditTeams = Boolean(isDraftSeason);
  const canEditPilots = Boolean(isDraftSeason || (isActiveSeason && isActiveOverrideEnabled));
  const canEditDraftRules = Boolean(isDraftSeason);
  const availableValueGroups = PILOT_VALUE_GROUPS.slice(
    0,
    activeWizardSeason?.draftConfig.valueGroupCount ?? 1
  );
  const effectiveDraftPilotLimit = activeWizardSeason
    ? availableValueGroups.reduce(
        (total, group) => total + activeWizardSeason.draftConfig.groupLimits[group],
        0
      )
    : 0;
  const activationIssues = (() => {
    if (!activeWizardSeason) {
      return ["Season not found."];
    }
    const issues: string[] = [];
    const allPilots = activeWizardSeason.teams.flatMap((team) => team.pilots);
    const selectedPilots = allPilots.filter((pilot) => pilot.selectedForDraft);

    if (activeWizardSeason.status !== "draft") {
      issues.push("Season must be in draft status.");
    }
    if (activeWizardSeason.races.length === 0) {
      issues.push("Add at least one race.");
    }
    if (activeWizardSeason.teams.length === 0) {
      issues.push("Add at least one team.");
    }
    if (allPilots.length === 0) {
      issues.push("Add at least one pilot.");
    }
    if (allPilots.some((pilot) => pilot.valueGroup === "unassigned")) {
      issues.push("Assign value groups for all pilots.");
    }
    if (selectedPilots.length !== effectiveDraftPilotLimit) {
      issues.push(
        `Select exactly ${effectiveDraftPilotLimit} pilots for draft.`
      );
    }
    if (activeWizardSeason.draftConfig.draftPilotCount !== effectiveDraftPilotLimit) {
      issues.push(
        `Draft pilot count (${activeWizardSeason.draftConfig.draftPilotCount}) must equal active group limits total (${effectiveDraftPilotLimit}).`
      );
    }

    const selectedByGroup = selectedPilots.reduce(
      (counts, pilot) => {
        if (pilot.valueGroup !== "unassigned") {
          counts[pilot.valueGroup] += 1;
        }
        return counts;
      },
      { A: 0, B: 0, C: 0, D: 0, E: 0 } as Record<PilotValueGroup, number>
    );

    for (const group of availableValueGroups) {
      if (selectedByGroup[group] > activeWizardSeason.draftConfig.groupLimits[group]) {
        issues.push(
          `Selected pilots in group ${group} exceed limit ${activeWizardSeason.draftConfig.groupLimits[group]}.`
        );
      }
    }

    return issues;
  })();
  const canActivateSeason = activationIssues.length === 0;
  const canDeactivateSeason = activeWizardSeason?.status === "active";
  const canRevertSeason = activeWizardSeason ? activeWizardSeason.status !== "draft" : false;
  const activeSeasonPilots = activeWizardSeason
    ? activeWizardSeason.teams.flatMap((team) =>
        team.pilots.map((pilot) => ({
          teamId: team.id,
          teamName: team.name,
          pilotName: pilot.name,
          slotId: pilot.slotId,
        }))
      )
    : [];

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

  const handleExceptionSourcePilotChange = (slotId: string) => {
    setExceptionSourceSlotId(slotId);
    if (slotId === exceptionTargetSlotId) {
      const fallback = activeSeasonPilots.find((pilot) => pilot.slotId !== slotId);
      setExceptionTargetSlotId(fallback?.slotId ?? slotId);
    }
    setExceptionMessage(null);
  };

  const handleExceptionTargetPilotChange = (slotId: string) => {
    setExceptionTargetSlotId(slotId);
    setExceptionMessage(null);
  };

  const handleExceptionReplacementNameChange = (value: string) => {
    setExceptionReplacementName(value);
    setExceptionMessage(null);
  };

  const handleToggleActiveEditingOverride = () => {
    if (!activeWizardSeason || activeWizardSeason.status !== "active") {
      setActivationMessage("Override is available only for active seasons.");
      return;
    }

    const nextEnabled = !activeWizardSeason.adminOverrides.editingEnabled;
    const result = updateSeason(activeWizardSeason.id, {
      adminOverrides: { editingEnabled: nextEnabled },
    });
    if (!result.success) {
      setActivationMessage(result.message ?? "Could not update editing override.");
      return;
    }

    setActivationMessage(
      nextEnabled
        ? "Admin override enabled: calendar and pilots can be edited."
        : "Admin override disabled: active season editing locked."
    );
  };

  const handlePilotGroupChange = (teamId: string, pilotId: string, valueGroup: PilotGroup) => {
    if (!activeWizardSeason) {
      setPilotMessage("Not found");
      return;
    }

    if (!isDraftSeason) {
      setPilotMessage("Value group can be edited only in draft.");
      return;
    }

    const targetTeam = activeWizardSeason.teams.find((team) => team.id === teamId);
    const targetPilot = targetTeam?.pilots.find((pilot) => pilot.id === pilotId);
    if (!targetTeam || !targetPilot) {
      setPilotMessage("Pilot not found.");
      return;
    }

    if (valueGroup !== "unassigned" && !availableValueGroups.includes(valueGroup)) {
      setPilotMessage("Selected value group is not allowed by season configuration.");
      return;
    }

    if (targetPilot.selectedForDraft && valueGroup === "unassigned") {
      setPilotMessage("Unselect pilot from draft before setting group to unassigned.");
      return;
    }

    const nextTeams = activeWizardSeason.teams.map((team) => {
      if (team.id !== teamId) {
        return team;
      }
      return {
        ...team,
        pilots: team.pilots.map((pilot) => (pilot.id === pilotId ? { ...pilot, valueGroup } : pilot)),
      };
    });

    const result = updateSeason(activeWizardSeason.id, { teams: nextTeams });
    if (!result.success) {
      setPilotMessage(result.message ?? "Could not update pilot group.");
      return;
    }

    setPilotMessage("Pilot group updated.");
  };

  const handleImportPilotsFile = async (file: File) => {
    if (!activeWizardSeason) {
      setImportMessage("Not found");
      return;
    }

    if (!canEditPilots) {
      setImportMessage("Locked: pilots can be edited only in draft or active override.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["xlsx", "xls", "csv"].includes(extension)) {
      setImportMessage("Unsupported file type. Use .xlsx, .xls or .csv.");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setImportMessage("File has no sheets.");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, blankrows: false });
      if (rows.length < 2) {
        setImportMessage("File must contain a header row and at least one data row.");
        return;
      }

      const headers = rows[0].map((header) => header.toString().trim().toLowerCase());
      const teamIndex = headers.findIndex((header) => ["team_name", "team", "echipa"].includes(header));
      const pilotIndex = headers.findIndex((header) => ["pilot_name", "pilot", "driver", "pilot_nume"].includes(header));

      if (teamIndex === -1 || pilotIndex === -1) {
        setImportMessage("Missing columns. Required: team_name/team and pilot_name/pilot.");
        return;
      }

      const parsed = rows.slice(1).map((row) => ({
        teamName: (row[teamIndex] ?? "").toString().trim(),
        pilotName: (row[pilotIndex] ?? "").toString().trim(),
      }));

      const validRows = parsed.filter((row) => row.teamName && row.pilotName);
      if (validRows.length === 0) {
        setImportMessage("No valid rows found.");
        return;
      }

      const nextTeams = activeWizardSeason.teams.map((team) => ({ ...team, pilots: [...team.pilots] }));
      let createdTeams = 0;
      let createdPilots = 0;
      let skippedDuplicates = 0;

      for (const row of validRows) {
        let team = nextTeams.find((item) => item.name.toLowerCase() === row.teamName.toLowerCase());
        if (!team) {
          team = {
            id: createTeamId(row.teamName, new Set(nextTeams.map((item) => item.id))),
            name: row.teamName,
            pilots: [],
          };
          nextTeams.push(team);
          createdTeams += 1;
        }

        const hasPilot = team.pilots.some(
          (pilot) => pilot.name.toLowerCase() === row.pilotName.toLowerCase()
        );
        if (hasPilot) {
          skippedDuplicates += 1;
          continue;
        }

        const pilotId = createPilotId(row.pilotName, new Set(team.pilots.map((pilot) => pilot.id)));
        const slotId = createSlotId(
          row.pilotName,
          new Set(nextTeams.flatMap((item) => item.pilots.map((pilot) => pilot.slotId)))
        );
        team.pilots.push({
          id: pilotId,
          slotId,
          name: row.pilotName,
          valueGroup: "unassigned",
          selectedForDraft: false,
        });
        createdPilots += 1;
      }

      const result = updateSeason(activeWizardSeason.id, { teams: nextTeams });
      if (!result.success) {
        setImportMessage(result.message ?? "Could not import data.");
        return;
      }

      if (!pilotTeamIdDraft && nextTeams.length > 0) {
        setPilotTeamIdDraft(nextTeams[0].id);
      }

      setImportMessage(
        `Import completed: ${createdPilots} pilots, ${createdTeams} teams, ${skippedDuplicates} duplicates skipped.`
      );
    } catch {
      setImportMessage("Could not read file. Please check format and try again.");
    }
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

    if (!canEditCalendar) {
      setRaceMessage("Locked: calendar can be edited only in draft or active override.");
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
        locked: false,
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

  const handleUpdateRaceDate = (raceId: string, date: string) => {
    if (!activeWizardSeason) {
      setRaceMessage("Not found");
      return;
    }

    if (!canEditCalendar) {
      setRaceMessage("Locked: calendar can be edited only in draft or active override.");
      return;
    }

    if (!date) {
      setRaceMessage("Race date is required.");
      return;
    }

    const targetRace = activeWizardSeason.races.find((race) => race.id === raceId);
    if (!targetRace) {
      setRaceMessage("Race not found.");
      return;
    }
    if (activeWizardSeason.status === "active" && targetRace.locked) {
      setRaceMessage("Race is locked and cannot be edited in active season.");
      return;
    }

    const hasDuplicate = activeWizardSeason.races.some(
      (race) =>
        race.id !== raceId &&
        race.name.toLowerCase() === targetRace.name.toLowerCase() &&
        race.date === date
    );
    if (hasDuplicate) {
      setRaceMessage("Race already exists in this season.");
      return;
    }

    const nextRaces = activeWizardSeason.races.map((race) =>
      race.id === raceId ? { ...race, date } : race
    );

    const result = updateSeason(activeWizardSeason.id, { races: nextRaces });
    if (!result.success) {
      setRaceMessage(result.message ?? "Could not update race date.");
      return;
    }

    setRaceMessage("Race date updated.");
  };

  const handleMoveRace = (raceId: string, direction: "up" | "down") => {
    if (!activeWizardSeason) {
      setRaceMessage("Not found");
      return;
    }

    if (!canEditCalendar) {
      setRaceMessage("Locked: calendar can be edited only in draft or active override.");
      return;
    }

    const currentIndex = activeWizardSeason.races.findIndex((race) => race.id === raceId);
    if (currentIndex === -1) {
      setRaceMessage("Race not found.");
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeWizardSeason.races.length) {
      return;
    }
    if (
      activeWizardSeason.status === "active" &&
      (activeWizardSeason.races[currentIndex].locked || activeWizardSeason.races[targetIndex].locked)
    ) {
      setRaceMessage("Cannot move locked races in active season.");
      return;
    }

    const nextRaces = [...activeWizardSeason.races];
    const [movedRace] = nextRaces.splice(currentIndex, 1);
    nextRaces.splice(targetIndex, 0, movedRace);

    const result = updateSeason(activeWizardSeason.id, { races: nextRaces });
    if (!result.success) {
      setRaceMessage(result.message ?? "Could not update race order.");
      return;
    }

    setRaceMessage("Race order updated.");
  };

  const handleToggleRaceLock = (raceId: string) => {
    if (!activeWizardSeason) {
      setRaceMessage("Not found");
      return;
    }
    if (activeWizardSeason.status !== "active") {
      setRaceMessage("Race lock can be changed only in active season.");
      return;
    }
    if (!activeWizardSeason.adminOverrides.editingEnabled) {
      setRaceMessage("Enable admin override to change race lock.");
      return;
    }

    const targetRace = activeWizardSeason.races.find((race) => race.id === raceId);
    if (!targetRace) {
      setRaceMessage("Race not found.");
      return;
    }

    const nextRaces = activeWizardSeason.races.map((race) =>
      race.id === raceId ? { ...race, locked: !race.locked } : race
    );
    const result = updateSeason(activeWizardSeason.id, { races: nextRaces });
    if (!result.success) {
      setRaceMessage(result.message ?? "Could not update race lock.");
      return;
    }

    setRaceMessage(targetRace.locked ? "Race unlocked." : "Race locked.");
  };

  const handleAddTeam = () => {
    if (!activeWizardSeason) {
      setTeamMessage("Not found");
      return;
    }

    if (!canEditTeams) {
      setTeamMessage("Locked: teams can be edited only in draft.");
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

    if (!canEditPilots) {
      setPilotMessage("Locked: pilots can be edited only in draft or active override.");
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

    const nextPilotId = createPilotId(trimmedName, new Set(selectedTeam.pilots.map((pilot) => pilot.id)));
    const nextSlotId = createSlotId(
      trimmedName,
      new Set(activeWizardSeason.teams.flatMap((team) => team.pilots.map((pilot) => pilot.slotId)))
    );
    const nextPilot = {
      id: nextPilotId,
      slotId: nextSlotId,
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

    if (!isDraftSeason) {
      setPilotMessage("Draft selection can be edited only in draft.");
      return;
    }

    const selectedCount = activeWizardSeason.teams.reduce(
      (count, team) => count + team.pilots.filter((pilot) => pilot.selectedForDraft).length,
      0
    );
    const selectedByGroup = activeWizardSeason.teams.reduce(
      (groupCounts, team) => {
        team.pilots.forEach((pilot) => {
          if (pilot.selectedForDraft && pilot.valueGroup !== "unassigned") {
            groupCounts[pilot.valueGroup] += 1;
          }
        });
        return groupCounts;
      },
      { A: 0, B: 0, C: 0, D: 0, E: 0 } as Record<PilotValueGroup, number>
    );

    let blockedByLimit = false;
    let blockedByUnassignedGroup = false;
    let blockedByGroupLimit: PilotValueGroup | null = null;
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
            selectedCount >= effectiveDraftPilotLimit
          ) {
            blockedByLimit = true;
            return pilot;
          }
          if (!pilot.selectedForDraft && pilot.valueGroup === "unassigned") {
            blockedByUnassignedGroup = true;
            return pilot;
          }
          if (
            !pilot.selectedForDraft &&
            pilot.valueGroup !== "unassigned" &&
            selectedByGroup[pilot.valueGroup] >= activeWizardSeason.draftConfig.groupLimits[pilot.valueGroup]
          ) {
            blockedByGroupLimit = pilot.valueGroup;
            return pilot;
          }
          return { ...pilot, selectedForDraft: !pilot.selectedForDraft };
        }),
      };
    });

    if (blockedByLimit) {
      setPilotMessage(
        `Maximum ${effectiveDraftPilotLimit} selected pilots for draft.`
      );
      return;
    }

    if (blockedByUnassignedGroup) {
      setPilotMessage("Assign a valid group before selecting pilot for draft.");
      return;
    }

    if (blockedByGroupLimit) {
      setPilotMessage(
        `Group ${blockedByGroupLimit} reached its limit (${activeWizardSeason.draftConfig.groupLimits[blockedByGroupLimit]}).`
      );
      return;
    }

    const result = updateSeason(activeWizardSeason.id, { teams: nextTeams });
    if (!result.success) {
      setPilotMessage(result.message ?? "Could not update pilot selection.");
      return;
    }

    setPilotMessage("Draft selection updated.");
  };

  const handleExceptionalReplacePilot = () => {
    if (!activeWizardSeason) {
      setExceptionMessage("Season not found.");
      return;
    }
    if (!(activeWizardSeason.status === "active" && activeWizardSeason.adminOverrides.editingEnabled)) {
      setExceptionMessage("Exceptional changes are allowed only in active season with admin override.");
      return;
    }

    const trimmedName = exceptionReplacementName.trim();
    if (trimmedName.length < 2) {
      setExceptionMessage("Replacement pilot name must have at least 2 characters.");
      return;
    }

    let sourceTeamIndex = -1;
    let sourcePilotIndex = -1;
    activeWizardSeason.teams.forEach((team, teamIndex) => {
      team.pilots.forEach((pilot, pilotIndex) => {
        if (pilot.slotId === exceptionSourceSlotId) {
          sourceTeamIndex = teamIndex;
          sourcePilotIndex = pilotIndex;
        }
      });
    });

    if (sourceTeamIndex === -1 || sourcePilotIndex === -1) {
      setExceptionMessage("Source pilot not found.");
      return;
    }

    const sourceTeam = activeWizardSeason.teams[sourceTeamIndex];
    const sourcePilot = sourceTeam.pilots[sourcePilotIndex];
    const nextPilotId = createPilotId(trimmedName, new Set(sourceTeam.pilots.map((pilot) => pilot.id)));

    const replacementPilot = {
      id: nextPilotId,
      slotId: sourcePilot.slotId,
      name: trimmedName,
      valueGroup: sourcePilot.valueGroup,
      selectedForDraft: sourcePilot.selectedForDraft,
    };

    const nextTeams = activeWizardSeason.teams.map((team, teamIndex) => {
      if (teamIndex !== sourceTeamIndex) {
        return team;
      }
      return {
        ...team,
        pilots: team.pilots.map((pilot, pilotIndex) =>
          pilotIndex === sourcePilotIndex ? replacementPilot : pilot
        ),
      };
    });

    const result = updateSeason(activeWizardSeason.id, { teams: nextTeams });
    if (!result.success) {
      setExceptionMessage(result.message ?? "Could not replace pilot.");
      return;
    }

    setExceptionSourceSlotId(replacementPilot.slotId);
    setExceptionReplacementName("");
    setExceptionMessage("Exceptional replacement saved. Slot points remain on the same draft slot.");
  };

  const handleExceptionalTransferSwap = () => {
    if (!activeWizardSeason) {
      setExceptionMessage("Season not found.");
      return;
    }
    if (!(activeWizardSeason.status === "active" && activeWizardSeason.adminOverrides.editingEnabled)) {
      setExceptionMessage("Exceptional changes are allowed only in active season with admin override.");
      return;
    }
    if (!exceptionSourceSlotId || !exceptionTargetSlotId) {
      setExceptionMessage("Select both source and target pilots.");
      return;
    }
    if (exceptionSourceSlotId === exceptionTargetSlotId) {
      setExceptionMessage("Source and target must be different pilots.");
      return;
    }

    let sourceTeamIndex = -1;
    let sourcePilotIndex = -1;
    let targetTeamIndex = -1;
    let targetPilotIndex = -1;

    activeWizardSeason.teams.forEach((team, teamIndex) => {
      team.pilots.forEach((pilot, pilotIndex) => {
        if (pilot.slotId === exceptionSourceSlotId) {
          sourceTeamIndex = teamIndex;
          sourcePilotIndex = pilotIndex;
        }
        if (pilot.slotId === exceptionTargetSlotId) {
          targetTeamIndex = teamIndex;
          targetPilotIndex = pilotIndex;
        }
      });
    });

    if (sourceTeamIndex === -1 || sourcePilotIndex === -1 || targetTeamIndex === -1 || targetPilotIndex === -1) {
      setExceptionMessage("Could not resolve selected pilots.");
      return;
    }

    const sourcePilot = activeWizardSeason.teams[sourceTeamIndex].pilots[sourcePilotIndex];
    const targetPilot = activeWizardSeason.teams[targetTeamIndex].pilots[targetPilotIndex];

    const nextSourcePilot = { ...targetPilot, slotId: sourcePilot.slotId };
    const nextTargetPilot = { ...sourcePilot, slotId: targetPilot.slotId };

    const nextTeams = activeWizardSeason.teams.map((team, teamIndex) => {
      if (teamIndex !== sourceTeamIndex && teamIndex !== targetTeamIndex) {
        return team;
      }
      return {
        ...team,
        pilots: team.pilots.map((pilot, pilotIndex) => {
          if (teamIndex === sourceTeamIndex && pilotIndex === sourcePilotIndex) {
            return nextSourcePilot;
          }
          if (teamIndex === targetTeamIndex && pilotIndex === targetPilotIndex) {
            return nextTargetPilot;
          }
          return pilot;
        }),
      };
    });

    const result = updateSeason(activeWizardSeason.id, { teams: nextTeams });
    if (!result.success) {
      setExceptionMessage(result.message ?? "Could not process transfer.");
      return;
    }

    setExceptionSourceSlotId(nextTargetPilot.slotId);
    setExceptionTargetSlotId(nextSourcePilot.slotId);
    setExceptionMessage("Exceptional transfer saved. Draft slot points stay attached to their slots.");
  };

  const handleSaveDraftConfig = () => {
    if (!activeWizardSeason) {
      setDraftConfigMessage("Not found");
      return;
    }

    if (!canEditDraftRules) {
      setDraftConfigMessage("Locked: draft rules can be edited only in draft.");
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

    const allowedGroups = new Set(PILOT_VALUE_GROUPS.slice(0, nextValueGroupCount));
    const nextGroupLimits: Record<PilotValueGroup, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const group of PILOT_VALUE_GROUPS) {
      if (!allowedGroups.has(group)) {
        nextGroupLimits[group] = 0;
        continue;
      }

      const parsedLimit = Number(groupLimitDrafts[group]);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 0 || parsedLimit > MAX_GROUP_LIMIT) {
        setDraftConfigMessage(
          `Group ${group} limit must be an integer between 0 and ${MAX_GROUP_LIMIT}.`
        );
        return;
      }
      nextGroupLimits[group] = parsedLimit;
    }
    const nextEffectiveDraftPilotLimit = PILOT_VALUE_GROUPS.slice(0, nextValueGroupCount).reduce(
      (total, group) => total + nextGroupLimits[group],
      0
    );
    if (nextDraftPilotCount !== nextEffectiveDraftPilotLimit) {
      setDraftConfigMessage(
        `Draft pilots count must equal total active group limits (${nextEffectiveDraftPilotLimit}).`
      );
      return;
    }

    let movedToUnassignedCount = 0;
    let unselectedByGroupRulesCount = 0;
    let unselectedByDraftLimitCount = 0;

    let nextTeams = activeWizardSeason.teams.map((team) => ({
      ...team,
      pilots: team.pilots.map((pilot) => {
        if (pilot.valueGroup !== "unassigned" && !allowedGroups.has(pilot.valueGroup)) {
          movedToUnassignedCount += 1;
          return {
            ...pilot,
            valueGroup: "unassigned" as const,
            selectedForDraft: false,
          };
        }
        return { ...pilot };
      }),
    }));

    const keptSelectedByGroup: Record<PilotValueGroup, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    nextTeams = nextTeams.map((team) => ({
      ...team,
      pilots: team.pilots.map((pilot) => {
        if (!pilot.selectedForDraft) {
          return pilot;
        }
        if (pilot.valueGroup === "unassigned") {
          unselectedByGroupRulesCount += 1;
          return { ...pilot, selectedForDraft: false };
        }
        if (keptSelectedByGroup[pilot.valueGroup] >= nextGroupLimits[pilot.valueGroup]) {
          unselectedByGroupRulesCount += 1;
          return { ...pilot, selectedForDraft: false };
        }
        keptSelectedByGroup[pilot.valueGroup] += 1;
        return pilot;
      }),
    }));

    let keptSelectedTotal = 0;
    nextTeams = nextTeams.map((team) => ({
      ...team,
      pilots: team.pilots.map((pilot) => {
        if (!pilot.selectedForDraft) {
          return pilot;
        }
        if (keptSelectedTotal >= nextEffectiveDraftPilotLimit) {
          unselectedByDraftLimitCount += 1;
          return { ...pilot, selectedForDraft: false };
        }
        keptSelectedTotal += 1;
        return pilot;
      }),
    }));

    const pilotsByGroupAfterSave = nextTeams.reduce(
      (counts, team) => {
        team.pilots.forEach((pilot) => {
          if (pilot.valueGroup !== "unassigned") {
            counts[pilot.valueGroup] += 1;
          }
        });
        return counts;
      },
      { A: 0, B: 0, C: 0, D: 0, E: 0 } as Record<PilotValueGroup, number>
    );

    const result = updateSeason(activeWizardSeason.id, {
      draftConfig: {
        valueGroupCount: nextValueGroupCount,
        draftPilotCount: nextDraftPilotCount,
        groupLimits: nextGroupLimits,
      },
      teams: nextTeams,
    });

    if (!result.success) {
      setDraftConfigMessage(result.message ?? "Could not update draft config.");
      return;
    }

    const firstUsableGroup = PILOT_VALUE_GROUPS.slice(0, nextValueGroupCount).find(
      (group) => pilotsByGroupAfterSave[group] < nextGroupLimits[group]
    );
    if (!allowedGroups.has(pilotValueGroupDraft) || pilotsByGroupAfterSave[pilotValueGroupDraft] >= nextGroupLimits[pilotValueGroupDraft]) {
      setPilotValueGroupDraft(firstUsableGroup ?? "A");
    }

    const adjustments: string[] = [];
    if (movedToUnassignedCount > 0) {
      adjustments.push(`${movedToUnassignedCount} pilots moved to unassigned`);
    }
    if (unselectedByGroupRulesCount > 0) {
      adjustments.push(`${unselectedByGroupRulesCount} pilots unselected by group limits`);
    }
    if (unselectedByDraftLimitCount > 0) {
      adjustments.push(`${unselectedByDraftLimitCount} pilots unselected by draft limit`);
    }

    setDraftConfigMessage(
      adjustments.length > 0
        ? `Draft config saved. Adjustments: ${adjustments.join(", ")}.`
        : "Draft config saved."
    );
  };

  const handleActivateSeason = () => {
    if (!activeWizardSeason) {
      setActivationMessage("Not found");
      return;
    }
    if (!canActivateSeason) {
      setActivationMessage("Cannot activate until all checklist items are resolved.");
      return;
    }

    const currentActiveSeason = seasons.find(
      (season) => season.status === "active" && season.id !== activeWizardSeason.id
    );
    if (currentActiveSeason) {
      const demoteResult = updateSeason(currentActiveSeason.id, { status: "completed" });
      if (!demoteResult.success) {
        setActivationMessage(demoteResult.message ?? "Could not update existing active season.");
        return;
      }
    }

    const activateResult = updateSeason(activeWizardSeason.id, {
      status: "active",
      adminOverrides: { editingEnabled: false },
    });
    if (!activateResult.success) {
      setActivationMessage(activateResult.message ?? "Could not activate season.");
      return;
    }

    setActivationMessage("Season activated.");
  };

  const handleDeactivateSeason = () => {
    if (!activeWizardSeason) {
      setActivationMessage("Not found");
      return;
    }
    if (activeWizardSeason.status !== "active") {
      setActivationMessage("Only active seasons can be deactivated.");
      return;
    }

    const confirmed = window.confirm(
      `Deactivate season "${activeWizardSeason.name} ${activeWizardSeason.year}"? It will move to completed.`
    );
    if (!confirmed) {
      return;
    }

    const result = updateSeason(activeWizardSeason.id, { status: "completed" });
    if (!result.success) {
      setActivationMessage(result.message ?? "Could not deactivate season.");
      return;
    }

    setActivationMessage("Season deactivated (completed).");
  };

  const handleRevertSeason = () => {
    if (!activeWizardSeason) {
      setActivationMessage("Not found");
      return;
    }
    if (activeWizardSeason.status === "draft") {
      setActivationMessage("Season is already draft.");
      return;
    }

    const confirmed = window.confirm(
      `Revert season "${activeWizardSeason.name} ${activeWizardSeason.year}" to draft?`
    );
    if (!confirmed) {
      return;
    }

    const result = updateSeason(activeWizardSeason.id, {
      status: "draft",
      adminOverrides: { editingEnabled: false },
    });
    if (!result.success) {
      setActivationMessage(result.message ?? "Could not revert season.");
      return;
    }

    setActivationMessage("Season reverted to draft.");
  };

  const handleSaveSeasonInfo = () => {
    if (!activeWizardSeason) {
      setSeasonInfoMessage("Not found");
      return false;
    }

    if (!canEditSeasonInfo) {
      setSeasonInfoMessage("Locked: season info can be edited only in draft.");
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
        {seasonActionMessage && (
          <div className="text-xs text-[var(--color-neutral-600)]">{seasonActionMessage}</div>
        )}
      </header>

      {pendingDelete && (
        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
            Delete Confirmation {pendingDelete.step}/2
          </div>
          <div className="mt-1 text-xs text-[var(--color-neutral-600)]">
            {pendingDelete.step === 1
              ? "Confirm that you want to delete this season."
              : "Final confirmation: this action is permanent."}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" size="sm" tone="primary" onClick={handleConfirmDeleteSeason}>
              {pendingDelete.step === 1 ? "Continue" : "Delete Season"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleCancelDeleteSeason}>
              Cancel
            </Button>
          </div>
        </Surface>
      )}

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

      {activeWizardSeason?.status === "active" && (
        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Admin Override
              </div>
              <div className="text-xs text-[var(--color-neutral-600)]">
                Active season remains active. Override unlocks only calendar and pilot edits.
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={isActiveOverrideEnabled ? "solid" : "outline"}
              onClick={handleToggleActiveEditingOverride}
            >
              {isActiveOverrideEnabled ? "Editing Enabled" : "Editing Disabled"}
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
          canEditSeasonInfo={canEditSeasonInfo}
          canEditCalendar={canEditCalendar}
          canEditTeams={canEditTeams}
          canEditPilots={canEditPilots}
          canEditDraftRules={canEditDraftRules}
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
          importMessage={importMessage}
          availableValueGroups={availableValueGroups}
          draftPilotCount={effectiveDraftPilotLimit}
          draftPilotCountDraft={draftPilotCountDraft}
          valueGroupCountDraft={valueGroupCountDraft}
          groupLimitDrafts={groupLimitDrafts}
          draftConfigMessage={draftConfigMessage}
          activationIssues={activationIssues}
          activationMessage={activationMessage}
          canActivateSeason={canActivateSeason}
          canDeactivateSeason={canDeactivateSeason}
          canRevertSeason={canRevertSeason}
          onClose={handleCloseWizard}
          onStepSelect={handleWizardStepSelect}
          onBack={handleWizardBack}
          onNext={handleWizardNext}
          onInfoChange={handleSeasonInfoChange}
          onSaveInfo={handleSaveSeasonInfo}
          onRaceNameChange={handleRaceNameChange}
          onRaceDateChange={handleRaceDateChange}
          onAddRace={handleAddRace}
          onUpdateRaceDate={handleUpdateRaceDate}
          onMoveRace={handleMoveRace}
          onToggleRaceLock={handleToggleRaceLock}
          onTeamNameChange={handleTeamNameChange}
          onAddTeam={handleAddTeam}
          onPilotNameChange={handlePilotNameChange}
          onPilotTeamIdChange={handlePilotTeamIdChange}
          onPilotValueGroupChange={handlePilotValueGroupChange}
          onPilotGroupChange={handlePilotGroupChange}
          onAddPilot={handleAddPilot}
          onTogglePilotDraftSelection={handleTogglePilotDraftSelection}
          onImportPilotsFile={handleImportPilotsFile}
          onDraftPilotCountChange={handleDraftPilotCountChange}
          onValueGroupCountChange={handleValueGroupCountChange}
          onGroupLimitChange={handleGroupLimitChange}
          onSaveDraftConfig={handleSaveDraftConfig}
          onActivateSeason={handleActivateSeason}
          onDeactivateSeason={handleDeactivateSeason}
          onRevertSeason={handleRevertSeason}
        />
      )}

      {activeWizardSeason?.status === "active" && (
        <Surface tone="subtle" className="space-y-3 border-[var(--color-neutral-300)]">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Exceptional Pilot Changes (Active Season)
            </h3>
            <p className="text-xs text-[var(--color-neutral-600)]">
              Slot points remain attached to draft slots, not to pilot identities.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-600)]">
              Replacement (Pilot leaves team)
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Slot Pilot</span>
                <select
                  value={exceptionSourceSlotId}
                  onChange={(event) => handleExceptionSourcePilotChange(event.target.value)}
                  className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                >
                  {activeSeasonPilots.map((pilot) => (
                    <option key={pilot.slotId} value={pilot.slotId}>
                      {pilot.teamName} | {pilot.pilotName} | slot {pilot.slotId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Replacement Name</span>
                <input
                  value={exceptionReplacementName}
                  onChange={(event) => handleExceptionReplacementNameChange(event.target.value)}
                  placeholder="New pilot"
                  className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                />
              </label>
              <div className="self-end">
                <Button type="button" size="sm" onClick={handleExceptionalReplacePilot}>
                  Replace In Slot
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-600)]">
              Transfer (Pilot moves to another slot)
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Source Pilot</span>
                <select
                  value={exceptionSourceSlotId}
                  onChange={(event) => handleExceptionSourcePilotChange(event.target.value)}
                  className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                >
                  {activeSeasonPilots.map((pilot) => (
                    <option key={`source-${pilot.slotId}`} value={pilot.slotId}>
                      {pilot.teamName} | {pilot.pilotName} | slot {pilot.slotId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Target Slot Pilot</span>
                <select
                  value={exceptionTargetSlotId}
                  onChange={(event) => handleExceptionTargetPilotChange(event.target.value)}
                  className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                >
                  {activeSeasonPilots
                    .filter((pilot) => pilot.slotId !== exceptionSourceSlotId)
                    .map((pilot) => (
                      <option key={`target-${pilot.slotId}`} value={pilot.slotId}>
                        {pilot.teamName} | {pilot.pilotName} | slot {pilot.slotId}
                      </option>
                    ))}
                </select>
              </label>
              <div className="self-end">
                <Button type="button" size="sm" variant="outline" onClick={handleExceptionalTransferSwap}>
                  Transfer By Slot Swap
                </Button>
              </div>
            </div>
          </div>

          {exceptionMessage && <div className="text-xs text-[var(--color-neutral-600)]">{exceptionMessage}</div>}
        </Surface>
      )}

      {seasonSetupSubmenu === "newDraft" ? (
        <NewDraftSeasonForm onCreateDraft={handleCreateDraft} />
      ) : (
        <div className="space-y-3">
          {completedSeasons.length === 0 ? (
            <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
              <div className="text-sm text-[var(--color-neutral-700)]">
                No completed seasons yet.
              </div>
            </Surface>
          ) : (
            completedSeasons.map((season) => (
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
                  <Button type="button" size="sm" variant="outline" onClick={() => handleOpenWizard(season)}>
                    View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSeason(season.id)}
                  >
                    Delete
                  </Button>
                  <Badge tone={statusToneMap[season.status]}>{statusLabelMap[season.status]}</Badge>
                </div>
              </Surface>
            ))
          )}
        </div>
      )}
    </div>
  );
}
