import { Button } from "../../components/ui/Button";
import { Surface } from "../../components/ui/Surface";
import type { PilotGroup, PilotValueGroup, Season } from "../../seasons/types";

const seasonWizardSteps = [
  "Season Info",
  "Race Calendar",
  "Teams",
  "Pilots",
  "Scoring",
  "Review",
] as const;

export type SeasonInfoDraft = {
  name: string;
  year: string;
  entryFee: string;
};

export type SeasonInfoErrors = {
  name?: string;
  year?: string;
  entryFee?: string;
};

type SeasonWizardProps = {
  season: Season;
  currentStep: number;
  infoDraft: SeasonInfoDraft;
  infoErrors: SeasonInfoErrors;
  isLocked: boolean;
  infoMessage?: string | null;
  raceNameDraft: string;
  raceDateDraft: string;
  raceMessage?: string | null;
  teamNameDraft: string;
  teamMessage?: string | null;
  pilotNameDraft: string;
  pilotTeamIdDraft: string;
  pilotValueGroupDraft: PilotValueGroup;
  pilotMessage?: string | null;
  importMessage?: string | null;
  availableValueGroups: PilotValueGroup[];
  draftPilotCount: number;
  draftPilotCountDraft: string;
  valueGroupCountDraft: string;
  groupLimitDrafts: Record<PilotValueGroup, string>;
  draftConfigMessage?: string | null;
  activationIssues: string[];
  activationMessage?: string | null;
  canActivateSeason: boolean;
  canDeactivateSeason: boolean;
  canRevertSeason: boolean;
  onClose: () => void;
  onStepSelect: (step: number) => void;
  onBack: () => void;
  onNext: () => void;
  onInfoChange: (field: keyof SeasonInfoDraft, value: string) => void;
  onSaveInfo: () => boolean;
  onRaceNameChange: (value: string) => void;
  onRaceDateChange: (value: string) => void;
  onAddRace: () => void;
  onTeamNameChange: (value: string) => void;
  onAddTeam: () => void;
  onPilotNameChange: (value: string) => void;
  onPilotTeamIdChange: (value: string) => void;
  onPilotValueGroupChange: (value: PilotValueGroup) => void;
  onPilotGroupChange: (teamId: string, pilotId: string, valueGroup: PilotGroup) => void;
  onAddPilot: () => void;
  onTogglePilotDraftSelection: (teamId: string, pilotId: string) => void;
  onImportPilotsFile: (file: File) => void;
  onDraftPilotCountChange: (value: string) => void;
  onValueGroupCountChange: (value: string) => void;
  onGroupLimitChange: (group: PilotValueGroup, value: string) => void;
  onSaveDraftConfig: () => void;
  onActivateSeason: () => void;
  onDeactivateSeason: () => void;
  onRevertSeason: () => void;
};

export function SeasonWizard({
  season,
  currentStep,
  infoDraft,
  infoErrors,
  isLocked,
  infoMessage,
  raceNameDraft,
  raceDateDraft,
  raceMessage,
  teamNameDraft,
  teamMessage,
  pilotNameDraft,
  pilotTeamIdDraft,
  pilotValueGroupDraft,
  pilotMessage,
  importMessage,
  availableValueGroups,
  draftPilotCount,
  draftPilotCountDraft,
  valueGroupCountDraft,
  groupLimitDrafts,
  draftConfigMessage,
  activationIssues,
  activationMessage,
  canActivateSeason,
  canDeactivateSeason,
  canRevertSeason,
  onClose,
  onStepSelect,
  onBack,
  onNext,
  onInfoChange,
  onSaveInfo,
  onRaceNameChange,
  onRaceDateChange,
  onAddRace,
  onTeamNameChange,
  onAddTeam,
  onPilotNameChange,
  onPilotTeamIdChange,
  onPilotValueGroupChange,
  onPilotGroupChange,
  onAddPilot,
  onTogglePilotDraftSelection,
  onImportPilotsFile,
  onDraftPilotCountChange,
  onValueGroupCountChange,
  onGroupLimitChange,
  onSaveDraftConfig,
  onActivateSeason,
  onDeactivateSeason,
  onRevertSeason,
}: SeasonWizardProps) {
  const lastStep = seasonWizardSteps.length;
  const allPilots = season.teams.flatMap((team) =>
    team.pilots.map((pilot) => ({
      ...pilot,
      teamId: team.id,
      teamName: team.name,
    }))
  );
  const selectedPilots = allPilots.filter((pilot) => pilot.selectedForDraft);
  const draftPoolPreview = selectedPilots.slice(0, draftPilotCount);
  const draftPoolByGroup: Record<PilotValueGroup, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  draftPoolPreview.forEach((pilot) => {
    if (pilot.valueGroup !== "unassigned") {
      draftPoolByGroup[pilot.valueGroup] += 1;
    }
  });

  return (
    <Surface tone="subtle" className="space-y-4 border-[var(--color-neutral-300)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-neutral-900)]">
            Season Wizard: {season.name} {season.year}
          </h2>
          <p className="text-xs text-[var(--color-neutral-600)]">
            Configure this draft season step by step.
          </p>
        </div>

        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-6">
        {seasonWizardSteps.map((label, index) => {
          const step = index + 1;
          const isCurrent = step === currentStep;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onStepSelect(step)}
              className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                isCurrent
                  ? "border-[var(--color-primary-500)] bg-red-50 text-[var(--color-primary-500)]"
                  : "border-[var(--color-neutral-200)] bg-[var(--color-surface)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]"
              }`}
            >
              Step {step}
              <div className="mt-0.5 text-[11px] font-medium">{label}</div>
            </button>
          );
        })}
      </div>

      {currentStep === 1 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">Step 1: Season Info</div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Name</span>
              <input
                value={infoDraft.name}
                onChange={(event) => onInfoChange("name", event.target.value)}
                disabled={isLocked}
                className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
              />
              {infoErrors.name && (
                <span className="text-xs text-[var(--color-primary-500)]">{infoErrors.name}</span>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Year</span>
              <input
                type="number"
                inputMode="numeric"
                value={infoDraft.year}
                onChange={(event) => onInfoChange("year", event.target.value)}
                disabled={isLocked}
                className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
              />
              {infoErrors.year && (
                <span className="text-xs text-[var(--color-primary-500)]">{infoErrors.year}</span>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Entry Fee</span>
              <input
                type="number"
                inputMode="decimal"
                value={infoDraft.entryFee}
                onChange={(event) => onInfoChange("entryFee", event.target.value)}
                disabled={isLocked}
                className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
              />
              {infoErrors.entryFee && (
                <span className="text-xs text-[var(--color-primary-500)]">{infoErrors.entryFee}</span>
              )}
            </label>
          </div>

          <div className="flex items-center gap-2">
            {!isLocked && (
              <Button type="button" size="sm" onClick={onSaveInfo}>
                Save Season Info
              </Button>
            )}
            {isLocked && (
              <span className="text-xs font-semibold text-[var(--color-neutral-600)]">
                Locked: only draft seasons can be edited.
              </span>
            )}
            {infoMessage && <span className="text-xs text-[var(--color-neutral-600)]">{infoMessage}</span>}
          </div>
        </div>
      ) : currentStep === 2 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">Step 2: Race Calendar</div>

          <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Race Name</span>
              <input
                value={raceNameDraft}
                onChange={(event) => onRaceNameChange(event.target.value)}
                disabled={isLocked}
                placeholder="Bhrain GP"
                className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Date</span>
              <input
                type="date"
                value={raceDateDraft}
                onChange={(event) => onRaceDateChange(event.target.value)}
                disabled={isLocked}
                className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
              />
            </label>

            {!isLocked && (
              <div className="self-end">
                <Button type="button" size="sm" onClick={onAddRace}>
                  Add Race
                </Button>
              </div>
            )}
          </div>

          {isLocked && (
            <div className="text-xs font-semibold text-[var(--color-neutral-600)]">
              Locked: only draft seasons can be edited.
            </div>
          )}

          {raceMessage && <div className="text-xs text-[var(--color-neutral-600)]">{raceMessage}</div>}

          <div className="space-y-2">
            {season.races.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--color-neutral-300)] p-3 text-xs text-[var(--color-neutral-500)]">
                No races added yet.
              </div>
            ) : (
              season.races.map((race, index) => (
                <div
                  key={race.id}
                  className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-800)]"
                >
                  {index + 1}. {race.name} ({race.date || "TBD"})
                </div>
              ))
            )}
          </div>
        </div>
      ) : currentStep === 3 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
            Step 3: Teams (Pilot Structure Ready)
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[260px] flex-1 space-y-1">
              <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Team Name</span>
              <input
                value={teamNameDraft}
                onChange={(event) => onTeamNameChange(event.target.value)}
                disabled={isLocked}
                placeholder="Ferrari"
                className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
              />
            </label>

            {!isLocked && (
              <Button type="button" size="sm" onClick={onAddTeam}>
                Add Team
              </Button>
            )}
          </div>

          {isLocked && (
            <div className="text-xs font-semibold text-[var(--color-neutral-600)]">
              Locked: only draft seasons can be edited.
            </div>
          )}

          {teamMessage && <div className="text-xs text-[var(--color-neutral-600)]">{teamMessage}</div>}

          <div className="space-y-2">
            {season.teams.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--color-neutral-300)] p-3 text-xs text-[var(--color-neutral-500)]">
                No teams added yet.
              </div>
            ) : (
              season.teams.map((team, index) => (
                <div
                  key={team.id}
                  className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-800)]"
                >
                  {index + 1}. {team.name} | Pilots: {team.pilots.length}
                </div>
              ))
            )}
          </div>
        </div>
      ) : currentStep === 4 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
            Step 4: Pilots (Team Link + Value Groups)
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_220px_140px_auto]">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Pilot Name</span>
              <input
                value={pilotNameDraft}
                onChange={(event) => onPilotNameChange(event.target.value)}
                disabled={isLocked}
                placeholder="Max Verstappen"
                className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Team</span>
              <select
                value={pilotTeamIdDraft}
                onChange={(event) => onPilotTeamIdChange(event.target.value)}
                disabled={isLocked || season.teams.length === 0}
                className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
              >
                {season.teams.length === 0 ? (
                  <option value="">No teams</option>
                ) : (
                  <>
                    <option value="">Select team</option>
                    {season.teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Value Group</span>
              <select
                value={pilotValueGroupDraft}
                onChange={(event) => onPilotValueGroupChange(event.target.value as PilotValueGroup)}
                disabled={isLocked}
                className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
              >
                {availableValueGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>

            {!isLocked && (
              <div className="self-end">
                <Button type="button" size="sm" onClick={onAddPilot}>
                  Add Pilot
                </Button>
              </div>
            )}
          </div>

          {isLocked && (
            <div className="text-xs font-semibold text-[var(--color-neutral-600)]">
              Locked: only draft seasons can be edited.
            </div>
          )}
          {pilotMessage && <div className="text-xs text-[var(--color-neutral-600)]">{pilotMessage}</div>}
          <div className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-600)]">
              Import Teams + Pilots
            </div>
            <div className="mt-2 text-xs text-[var(--color-neutral-600)]">
              File columns required: <code>team_name</code> and <code>pilot_name</code>.
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={isLocked}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onImportPilotsFile(file);
                }
                event.currentTarget.value = "";
              }}
              className="mt-2 block w-full text-sm text-[var(--color-neutral-700)]"
            />
            {importMessage && <div className="mt-2 text-xs text-[var(--color-neutral-600)]">{importMessage}</div>}
          </div>

          <div className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-600)]">
              Draft Rules
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-[180px_180px_auto]">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Draft Pilots</span>
                <input
                  type="number"
                  value={draftPilotCountDraft}
                  onChange={(event) => onDraftPilotCountChange(event.target.value)}
                  disabled={isLocked}
                  className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Value Groups</span>
                <input
                  type="number"
                  value={valueGroupCountDraft}
                  onChange={(event) => onValueGroupCountChange(event.target.value)}
                  disabled={isLocked}
                  className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                />
              </label>
              {!isLocked && (
                <div className="self-end">
                  <Button type="button" size="sm" onClick={onSaveDraftConfig}>
                    Save Rules
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-5">
              {availableValueGroups.map((group) => (
                <label key={group} className="space-y-1">
                  <span className="text-xs font-semibold text-[var(--color-neutral-700)]">
                    Group {group} Limit
                  </span>
                  <input
                    type="number"
                    value={groupLimitDrafts[group]}
                    onChange={(event) => onGroupLimitChange(group, event.target.value)}
                    disabled={isLocked}
                    className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                  />
                </label>
              ))}
            </div>
            {draftConfigMessage && (
              <div className="mt-2 text-xs text-[var(--color-neutral-600)]">{draftConfigMessage}</div>
            )}
          </div>

          <div className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-600)]">
              Draft Pool Preview (Selected up to {draftPilotCount} Pilots)
            </div>
            <div className="mt-2 text-xs text-[var(--color-neutral-600)]">
              Selected: {selectedPilots.length}/{draftPilotCount} | Group counts: A {draftPoolByGroup.A} | B{" "}
              {draftPoolByGroup.B} | C {draftPoolByGroup.C} | D {draftPoolByGroup.D} | E {draftPoolByGroup.E}
            </div>
            <div className="mt-2 space-y-1">
              {draftPoolPreview.length === 0 ? (
                <div className="text-xs text-[var(--color-neutral-500)]">No pilots added yet.</div>
              ) : (
                draftPoolPreview.map((pilot, index) => (
                  <div key={pilot.id} className="text-sm text-[var(--color-neutral-800)]">
                    {index + 1}. {pilot.name} | {pilot.teamName} | Group {pilot.valueGroup}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            {season.teams.map((team) => (
              <div key={team.id} className="rounded-lg border border-[var(--color-neutral-200)] p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-600)]">
                  {team.name}
                </div>
                <div className="mt-2 space-y-1">
                  {team.pilots.length === 0 ? (
                    <div className="text-xs text-[var(--color-neutral-500)]">No pilots yet.</div>
                  ) : (
                    team.pilots.map((pilot) => (
                      <div key={pilot.id} className="flex items-center justify-between gap-2 text-sm">
                        <span>
                          {pilot.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            value={pilot.valueGroup}
                            onChange={(event) =>
                              onPilotGroupChange(team.id, pilot.id, event.target.value as PilotGroup)
                            }
                            disabled={isLocked}
                            className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
                          >
                            <option value="unassigned">Unassigned</option>
                            {availableValueGroups.map((group) => (
                              <option key={group} value={group}>
                                Group {group}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant={pilot.selectedForDraft ? "solid" : "outline"}
                            onClick={() => onTogglePilotDraftSelection(team.id, pilot.id)}
                            disabled={isLocked || pilot.valueGroup === "unassigned"}
                          >
                            {pilot.selectedForDraft ? "Unselect" : "Select"}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : currentStep === 6 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">Step 6: Review & Activate</div>

          <div className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-neutral-800)]">
            <div>Status: {season.status}</div>
            <div>Races: {season.races.length}</div>
            <div>Teams: {season.teams.length}</div>
            <div>Pilots: {allPilots.length}</div>
            <div>
              Selected for draft: {selectedPilots.length}/{draftPilotCount}
            </div>
          </div>

          {activationIssues.length > 0 ? (
            <div className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-neutral-600)]">
                Activation Checklist
              </div>
              <div className="mt-2 space-y-1 text-sm text-[var(--color-neutral-700)]">
                {activationIssues.map((issue) => (
                  <div key={issue}>- {issue}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[var(--color-neutral-700)]">
              Season setup is valid. You can activate this season.
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={onActivateSeason} disabled={!canActivateSeason}>
              Activate Season
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onDeactivateSeason} disabled={!canDeactivateSeason}>
              Deactivate
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onRevertSeason} disabled={!canRevertSeason}>
              Revert To Draft
            </Button>
            {activationMessage && <span className="text-xs text-[var(--color-neutral-600)]">{activationMessage}</span>}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--color-neutral-300)] p-4 text-sm text-[var(--color-neutral-600)]">
          Step {currentStep}: {seasonWizardSteps[currentStep - 1]} is ready for implementation.
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onBack}
          disabled={currentStep === 1}
        >
          Back
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={onNext}
          disabled={currentStep === lastStep}
        >
          Next
        </Button>
      </div>
    </Surface>
  );
}
