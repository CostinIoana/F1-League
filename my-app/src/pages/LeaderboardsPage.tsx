import { Fragment, useEffect, useMemo, useState } from "react";
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

type SharedLeaderboardCell = string | number;

type SharedLeaderboardTable = {
  title: string;
  description: string;
  headers: string[];
  rows: SharedLeaderboardCell[][];
};

type SharedLeaderboardSnapshot = {
  seasonName: string;
  seasonYear: number;
  scopeName: string;
  generatedAt: string;
  stageTable: SharedLeaderboardTable;
  generalTable: SharedLeaderboardTable;
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

function encodeSnapshotPayload(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeSnapshotPayload(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readSharedSnapshotFromHash() {
  if (typeof window === "undefined") {
    return null;
  }

  const prefix = "#shared-report=";
  if (!window.location.hash.startsWith(prefix)) {
    return null;
  }

  try {
    const decoded = decodeSnapshotPayload(window.location.hash.slice(prefix.length));
    const parsed = JSON.parse(decoded) as SharedLeaderboardSnapshot;
    if (
      !parsed ||
      typeof parsed.seasonName !== "string" ||
      typeof parsed.scopeName !== "string" ||
      typeof parsed.generatedAt !== "string" ||
      !Array.isArray(parsed.stageTable?.headers) ||
      !Array.isArray(parsed.generalTable?.headers)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function escapeHtml(value: SharedLeaderboardCell) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPrintableTable(table: SharedLeaderboardTable) {
  return `
    <section class="table-card">
      <h2>${escapeHtml(table.title)}</h2>
      <p>${escapeHtml(table.description)}</p>
      <table>
        <thead>
          <tr>${table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${table.rows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function buildPrintableDocument(snapshot: SharedLeaderboardSnapshot) {
  return `<!DOCTYPE html>
  <html lang="ro">
    <head>
      <meta charset="utf-8" />
      <title>Clasamente ${escapeHtml(snapshot.seasonName)} ${escapeHtml(snapshot.seasonYear)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
        h1 { margin: 0 0 8px; font-size: 24px; }
        h2 { margin: 0 0 6px; font-size: 16px; }
        p { margin: 0 0 12px; color: #475569; font-size: 12px; }
        .meta { margin-bottom: 18px; font-size: 12px; color: #475569; }
        .table-card { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; }
        th:nth-child(3), td:nth-child(3) { text-align: left; }
        thead th { background: #f1f5f9; }
        tbody tr:nth-child(even) { background: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>Clasamente ${escapeHtml(snapshot.seasonName)} ${escapeHtml(snapshot.seasonYear)}</h1>
      <div class="meta">Etapa selectata: ${escapeHtml(snapshot.scopeName)} | Generat la: ${escapeHtml(snapshot.generatedAt)}</div>
      ${renderPrintableTable(snapshot.stageTable)}
      ${renderPrintableTable(snapshot.generalTable)}
    </body>
  </html>`;
}

function SnapshotTable({ table }: { table: SharedLeaderboardTable }) {
  return (
    <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-[var(--color-neutral-900)]">{table.title}</div>
        <div className="text-xs text-[var(--color-neutral-600)]">{table.description}</div>
      </div>
      {table.rows.length === 0 ? (
        <div className="mt-2 text-xs text-[var(--color-neutral-500)]">Nu exista date pentru export.</div>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-[11px] leading-tight">
            <thead>
              <tr className="bg-[var(--color-neutral-100)] text-[var(--color-neutral-900)]">
                {table.headers.map((header, index) => (
                  <th
                    key={`${table.title}-${header}-${index}`}
                    className={`whitespace-nowrap border border-[var(--color-neutral-200)] px-1.5 py-0.5 ${
                      index === 2 ? "text-left" : "text-center"
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr
                  key={`${table.title}-row-${rowIndex}`}
                  className={rowIndex % 2 === 0 ? "bg-[var(--color-surface)]" : "bg-[var(--color-neutral-100)]"}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${table.title}-row-${rowIndex}-cell-${cellIndex}`}
                      className={`whitespace-nowrap border border-[var(--color-neutral-200)] px-1.5 py-0.5 ${
                        cellIndex === 2 ? "text-left" : "text-center"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Surface>
  );
}

export function LeaderboardsPage() {
  const { session, loading } = useSession();
  const { seasons } = useSeasons();
  const initialSearchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const sharedSnapshot = useMemo(readSharedSnapshotFromHash, []);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(() => {
    const tab = initialSearchParams.get("tab");
    return tab === "pilots" || tab === "teams" || tab === "users" ? tab : "users";
  });
  const [scoreScope, setScoreScope] = useState<string>(() => initialSearchParams.get("scope") ?? SEASON_TOTAL_SCOPE);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const selectedSeason = useMemo(() => {
    if (!session) {
      return null;
    }
    return seasons.find((season) => season.id === session.selectedSeasonId) ?? null;
  }, [session, seasons]);

  const raceIdsWithScores = useMemo(() => {
    if (!selectedSeason) {
      return new Set<string>();
    }
    return new Set(
      selectedSeason.raceScores
        .filter((raceScore) => raceScore.entries.length > 0)
        .map((raceScore) => raceScore.raceId)
    );
  }, [selectedSeason]);

  const raceIdsForSelectedScope = useMemo(() => {
    if (!selectedSeason) {
      return new Set<string>();
    }
    if (scoreScope === SEASON_TOTAL_SCOPE) {
      return raceIdsWithScores;
    }

    const hasScoreForSelectedRace = selectedSeason.raceScores.some(
      (raceScore) => raceScore.raceId === scoreScope && raceScore.entries.length > 0
    );
    if (!hasScoreForSelectedRace) {
      return new Set<string>();
    }
    return new Set([scoreScope]);
  }, [raceIdsWithScores, scoreScope, selectedSeason]);

  const pointsBySlot = useMemo(() => {
    const result: Record<string, number> = {};
    if (!selectedSeason) {
      return result;
    }
    selectedSeason.raceScores
      .filter((raceScore) => raceIdsForSelectedScope.has(raceScore.raceId))
      .forEach((raceScore) => {
        raceScore.entries.forEach((entry) => {
          result[entry.slotId] = (result[entry.slotId] ?? 0) + entry.points;
        });
      });
    return result;
  }, [raceIdsForSelectedScope, selectedSeason]);

  const seasonTotalPointsBySlot = useMemo(() => {
    const result: Record<string, number> = {};
    if (!selectedSeason) {
      return result;
    }
    selectedSeason.raceScores
      .filter((raceScore) => raceIdsWithScores.has(raceScore.raceId))
      .forEach((raceScore) => {
        raceScore.entries.forEach((entry) => {
          result[entry.slotId] = (result[entry.slotId] ?? 0) + entry.points;
        });
      });
    return result;
  }, [raceIdsWithScores, selectedSeason]);

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
      ? "General (curse punctate)"
      : selectedSeason?.races.find((race) => race.id === scoreScope)?.name ?? "Race";
  const liveSnapshot = useMemo(() => {
    if (!selectedSeason) {
      return null;
    }

    const stageHeaders = [
      "Clasament",
      "Puncte",
      "Participanti",
      ...Array.from({ length: userPickColumnCount }).flatMap((_, index) => [`Pilot ${index + 1}`, "Pct"]),
    ];
    const stageRows = userStandingsDetailed.map((user, rowIndex) => [
      rowIndex + 1,
      user.points,
      `${user.participant}${user.locked ? " (L)" : ""}`,
      ...Array.from({ length: userPickColumnCount }).flatMap((_, index) => [
        user.picks[index]?.pilotCode ?? "-",
        user.picks[index]?.points ?? 0,
      ]),
    ]);

    const generalHeaders = [
      "Clasament",
      "Puncte",
      "Participanti",
      ...Array.from({ length: userMatrixPilotCount }).flatMap((_, index) => [`Pilot ${index + 1}`, "Pct"]),
    ];
    const generalRows = userPointsMatrix.map((row) => [
      row.rank,
      row.totalPoints,
      row.participant,
      ...Array.from({ length: userMatrixPilotCount }).flatMap((_, index) => [
        row.picks[index]?.pilotCode ?? "-",
        row.picks[index]?.points ?? 0,
      ]),
    ]);

    return {
      seasonName: selectedSeason.name,
      seasonYear: selectedSeason.year,
      scopeName: selectedRaceName,
      generatedAt: new Date().toLocaleString("ro-RO"),
      stageTable: {
        title: `Clasament pe etapa - ${selectedRaceName}`,
        description: "Clasamentul utilizatorilor pentru etapa selectata.",
        headers: stageHeaders,
        rows: stageRows,
      },
      generalTable: {
        title: "Clasament general actualizat",
        description: "Matricea generala cu punctele acumulate dupa toate cursele punctate.",
        headers: generalHeaders,
        rows: generalRows,
      },
    } satisfies SharedLeaderboardSnapshot;
  }, [selectedRaceName, selectedSeason, userPickColumnCount, userPointsMatrix, userMatrixPilotCount, userStandingsDetailed]);

  const exportSnapshot = sharedSnapshot ?? liveSnapshot;

  useEffect(() => {
    if (sharedSnapshot) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set("scope", scoreScope);
    params.set("tab", activeTab);
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [activeTab, scoreScope, sharedSnapshot]);

  const handleCopyShareLink = async () => {
    if (!exportSnapshot) {
      setShareMessage("Nu exista date pentru link.");
      return;
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}#shared-report=${encodeSnapshotPayload(
      JSON.stringify(exportSnapshot)
    )}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Linkul cu rezultatele a fost copiat.");
    } catch {
      setShareMessage("Linkul nu a putut fi copiat.");
    }
  };

  const handleExportPdf = () => {
    if (!exportSnapshot) {
      setShareMessage("Nu exista date pentru export.");
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!printWindow) {
      setShareMessage("Popup blocat. Permite popup pentru export PDF.");
      return;
    }

    printWindow.document.write(buildPrintableDocument(exportSnapshot));
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
    setShareMessage("Raportul este pregatit pentru Save as PDF.");
  };

  if (loading || !session) {
    return <div className="p-6 text-sm text-[var(--color-neutral-700)]">Loading leaderboards...</div>;
  }

  if (sharedSnapshot) {
    return (
      <div className="space-y-3 p-2">
        <Surface>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">Clasamente distribuite</h1>
                <Badge tone="secondary">{sharedSnapshot.scopeName}</Badge>
              </div>
              <div className="text-sm text-[var(--color-neutral-700)]">
                {sharedSnapshot.seasonName} {sharedSnapshot.seasonYear}
              </div>
              <div className="text-xs text-[var(--color-neutral-600)]">
                Generat la {sharedSnapshot.generatedAt}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" tone="neutral" size="sm" onClick={handleCopyShareLink}>
                Copiaza link
              </Button>
              <Button variant="outline" tone="neutral" size="sm" onClick={handleExportPdf}>
                Export PDF
              </Button>
            </div>
          </div>
          {shareMessage && <div className="mt-2 text-xs text-[var(--color-neutral-600)]">{shareMessage}</div>}
        </Surface>

        <SnapshotTable table={sharedSnapshot.stageTable} />
        <SnapshotTable table={sharedSnapshot.generalTable} />
      </div>
    );
  }

  if (!selectedSeason) {
    return (
      <div className="p-6 text-sm text-[var(--color-neutral-700)]">
        No season selected.
      </div>
    );
  }

  return (
    <div className="-mx-2 space-y-3 px-2 xl:-mx-10 xl:px-10 2xl:-mx-12 2xl:px-12">
      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Leaderboards</h1>
            <Badge tone="primary">Live</Badge>
            <Badge tone="secondary">{selectedRaceName}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" tone="neutral" size="sm" onClick={handleCopyShareLink}>
              Copiaza link
            </Button>
            <Button variant="outline" tone="neutral" size="sm" onClick={handleExportPdf}>
              Export PDF
            </Button>
          </div>
        </div>
        {shareMessage && <div className="mt-2 text-xs text-[var(--color-neutral-600)]">{shareMessage}</div>}
      </Surface>

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">
            Matrice puncte utilizatori (General - curse punctate)
          </div>
          <div className="text-xs text-[var(--color-neutral-600)]">
            Clasament utilizatori + componenta echipei + puncte din toate cursele punctate.
          </div>
        </div>
        {userPointsMatrix.length === 0 ? (
          <div className="mt-2 text-xs text-[var(--color-neutral-500)]">No user standings available.</div>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-[11px] leading-tight">
              <thead>
                <tr className="bg-[var(--color-neutral-100)] text-[var(--color-neutral-900)]">
                  <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-1.5 py-0.5 text-center">Clasament</th>
                  <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-1.5 py-0.5 text-center">Puncte</th>
                  <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-1.5 py-0.5 text-left">Participanti</th>
                  {Array.from({ length: userMatrixPilotCount }).map((_, index) => (
                    <Fragment key={`matrix-header-${index + 1}`}>
                      <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-1.5 py-0.5 text-center">
                        Pilot {index + 1}
                      </th>
                      <th className="whitespace-nowrap border border-[var(--color-neutral-200)] px-1.5 py-0.5 text-center">Pct</th>
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
                    <td className="border border-[var(--color-neutral-200)] px-1.5 py-0.5 text-center font-semibold text-[var(--color-neutral-800)]">{row.rank}</td>
                    <td className="border border-[var(--color-neutral-200)] px-1.5 py-0.5 text-center font-semibold text-[var(--color-neutral-900)]">
                      {row.totalPoints}
                    </td>
                    <td className="whitespace-nowrap border border-[var(--color-neutral-200)] px-1.5 py-0.5 text-[var(--color-neutral-900)]">
                      {row.participant}
                    </td>
                    {Array.from({ length: userMatrixPilotCount }).map((_, index) => (
                      <Fragment key={`matrix-row-${row.participant}-${index}`}>
                        <td className="whitespace-nowrap border border-[var(--color-neutral-200)] px-1.5 py-0.5 text-center text-[var(--color-neutral-800)]">
                          {row.picks[index]?.pilotCode ?? "-"}
                        </td>
                        <td className="border border-[var(--color-neutral-200)] px-1.5 py-0.5 text-center text-[var(--color-neutral-800)]">
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

      <div className="grid gap-3 xl:grid-cols-[210px_minmax(0,1fr)]">
        <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
          <div className="text-sm font-semibold text-[var(--color-neutral-900)]">Score Scope</div>
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={() => setScoreScope(SEASON_TOTAL_SCOPE)}
              className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left ${
                scoreScope === SEASON_TOTAL_SCOPE
                  ? "border-[var(--color-primary-500)] bg-[var(--color-neutral-100)]"
                  : "border-[var(--color-neutral-200)] bg-[var(--color-surface)]"
              }`}
            >
              <span className="text-[13px] text-[var(--color-neutral-800)]">General (curse punctate)</span>
              <Badge tone="neutral">ALL</Badge>
            </button>
            {selectedSeason.races.map((race, index) => (
              <button
                key={race.id}
                type="button"
                onClick={() => setScoreScope(race.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left ${
                  scoreScope === race.id
                    ? "border-[var(--color-primary-500)] bg-[var(--color-neutral-100)]"
                    : "border-[var(--color-neutral-200)] bg-[var(--color-surface)]"
                }`}
              >
                <span className="text-[13px] text-[var(--color-neutral-800)]">
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
                  <table className="w-full table-fixed border-collapse text-[10px] leading-tight">
                    <colgroup>
                      <col className="w-11" />
                      <col className="w-12" />
                      <col className="w-24" />
                      {Array.from({ length: userPickColumnCount }).map((_, index) => (
                        <Fragment key={`pair-col-${index + 1}`}>
                          <col className="w-9" />
                          <col className="w-8" />
                        </Fragment>
                      ))}
                    </colgroup>
                    <thead>
                      <tr className="bg-[var(--color-neutral-100)] text-[var(--color-neutral-900)]">
                        <th className="border border-[var(--color-neutral-200)] px-1 py-0.5 text-center">Clas.</th>
                        <th className="border border-[var(--color-neutral-200)] px-1 py-0.5 text-center">Pct</th>
                        <th className="border border-[var(--color-neutral-200)] px-1 py-0.5 text-left">Participanti</th>
                        {Array.from({ length: userPickColumnCount }).map((_, index) => (
                          <Fragment key={`pair-header-${index + 1}`}>
                            <th className="border border-[var(--color-neutral-200)] px-1 py-0.5 text-center">
                              P{index + 1}
                            </th>
                            <th className="border border-[var(--color-neutral-200)] px-1 py-0.5 text-center">
                              Pct
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
                          <td className="border border-[var(--color-neutral-200)] px-1 py-0.5 text-center font-semibold text-[var(--color-neutral-900)]">
                            {rowIndex + 1}
                          </td>
                          <td className="border border-[var(--color-neutral-200)] px-1 py-0.5 text-center font-semibold text-[var(--color-neutral-900)]">
                            {user.points}
                          </td>
                          <td className="break-words border border-[var(--color-neutral-200)] px-1 py-0.5 text-[var(--color-neutral-900)]">
                            {user.participant}
                            {user.locked ? " (L)" : ""}
                          </td>
                          {Array.from({ length: userPickColumnCount }).map((_, index) => (
                            <Fragment key={`pair-row-${user.email}-${index}`}>
                              <td className="border border-[var(--color-neutral-200)] px-1 py-0.5 text-center text-[var(--color-neutral-800)]">
                                {user.picks[index]?.pilotCode ?? "-"}
                              </td>
                              <td className="border border-[var(--color-neutral-200)] px-1 py-0.5 text-center text-[var(--color-neutral-800)]">
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
