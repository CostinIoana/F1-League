import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Surface } from "../components/ui/Surface";

type TeamItem = {
  id: string;
  name: string;
  nationality: string;
  source: "openf1" | "manual";
};

type RawOpenF1Driver = {
  team_name?: unknown;
};

type ManualTeamsByYear = {
  [year: string]: TeamItem[];
};

const OPENF1_DRIVERS_API = "https://api.openf1.org/v1/drivers";
const CONSTRUCTORS_CACHE_PREFIX = "f1league.openf1.constructors";
const CONSTRUCTORS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const FALLBACK_TEAMS_BY_YEAR: ManualTeamsByYear = {
  default: [
    { id: "red-bull-racing", name: "Red Bull Racing", nationality: "Austrian", source: "manual" },
    { id: "ferrari", name: "Ferrari", nationality: "Italian", source: "manual" },
    { id: "mercedes", name: "Mercedes", nationality: "British", source: "manual" },
    { id: "mclaren", name: "McLaren", nationality: "British", source: "manual" },
    { id: "aston-martin", name: "Aston Martin", nationality: "British", source: "manual" },
    { id: "alpine", name: "Alpine", nationality: "French", source: "manual" },
    { id: "williams", name: "Williams", nationality: "British", source: "manual" },
    { id: "haas", name: "Haas", nationality: "American", source: "manual" },
    { id: "stake-sauber", name: "Stake F1 Team K" , nationality: "Swiss", source: "manual" },
    { id: "rb", name: "RB", nationality: "Italian", source: "manual" },
  ],
};

const FALLBACK_TEAMS_2026: TeamItem[] = [
  { id: "red-bull-racing", name: "Red Bull Racing", nationality: "Austrian", source: "manual" },
  { id: "ferrari", name: "Ferrari", nationality: "Italian", source: "manual" },
  { id: "mercedes", name: "Mercedes", nationality: "British", source: "manual" },
  { id: "mclaren", name: "McLaren", nationality: "British", source: "manual" },
  { id: "aston-martin", name: "Aston Martin", nationality: "British", source: "manual" },
  { id: "alpine", name: "Alpine", nationality: "French", source: "manual" },
  { id: "williams", name: "Williams", nationality: "British", source: "manual" },
  { id: "haas", name: "Haas", nationality: "American", source: "manual" },
  { id: "sauber", name: "Sauber", nationality: "Swiss", source: "manual" },
  { id: "rb", name: "RB", nationality: "Italian", source: "manual" },
];

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTeamId(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function readCache(endpoint: string): TeamItem[] | null {
  const raw = localStorage.getItem(`${CONSTRUCTORS_CACHE_PREFIX}:${endpoint}`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      fetchedAt: number;
      endpoint: string;
      teams: TeamItem[];
    };

    if (parsed.endpoint !== endpoint) {
      return null;
    }

    if (Date.now() - parsed.fetchedAt > CONSTRUCTORS_CACHE_TTL_MS) {
      return null;
    }

    return Array.isArray(parsed.teams) ? parsed.teams : null;
  } catch {
    return null;
  }
}

function writeCache(endpoint: string, teams: TeamItem[]) {
  localStorage.setItem(
    `${CONSTRUCTORS_CACHE_PREFIX}:${endpoint}`,
    JSON.stringify({
      fetchedAt: Date.now(),
      endpoint,
      teams,
    })
  );
}

function dedupeById(items: TeamItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

async function fetchFromOpenF1(year: string, signal: AbortSignal): Promise<TeamItem[]> {
  const endpoint = `${OPENF1_DRIVERS_API}?year=${encodeURIComponent(year)}`;
  const response = await fetch(endpoint, { method: "GET", signal });

  if (!response.ok) {
    throw new Error(`OpenF1 request failed (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected API response shape.");
  }

  const teams = payload
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }
      const candidate = item as RawOpenF1Driver;
      const name = normalizeName(candidate.team_name);
      if (!name) {
        return null;
      }
      return {
        id: normalizeTeamId(name),
        name,
        nationality: "Unknown",
        source: "openf1" as const,
      } satisfies TeamItem;
    })
    .filter((item): item is TeamItem => item !== null);

  return dedupeById(teams).sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function F1ConstructorsPage() {
  const [year, setYear] = useState("");
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceHint, setSourceHint] = useState("OpenF1 / fallback local");
  const [cacheHint, setCacheHint] = useState<string | null>(null);

  const normalizedYear = useMemo(() => year.trim(), [year]);
  const selectedFallback = normalizedYear === "2026" ? FALLBACK_TEAMS_2026 : FALLBACK_TEAMS_BY_YEAR.default;

  useEffect(() => {
    const controller = new AbortController();

    const loadTeams = async () => {
      setLoading(true);
      setError(null);
      setCacheHint(null);

      const cacheEndpoint = normalizedYear
        ? `openf1-drivers-year-${normalizedYear}`
        : `openf1-drivers-default`;

      const cachedTeams = readCache(cacheEndpoint);
      if (cachedTeams && cachedTeams.length > 0) {
        setTeams(cachedTeams);
        setSourceHint("OpenF1 (cache local)");
        setCacheHint("Datele sunt din cache");
      }

      if (normalizedYear) {
        try {
          const openF1Teams = await fetchFromOpenF1(normalizedYear, controller.signal);
          const nextTeams = dedupeById(openF1Teams);

          if (nextTeams.length === 0) {
            throw new Error("Nu exista echipe returnate de OpenF1 pentru anul selectat.");
          }

          setTeams(nextTeams);
          writeCache(cacheEndpoint, nextTeams);
          setSourceHint(`OpenF1 (an ${normalizedYear})`);
          setCacheHint(null);
          setError(null);
          return;
        } catch (openF1Error) {
          if (controller.signal.aborted) {
            return;
          }

          if (cachedTeams && cachedTeams.length > 0) {
            setError("Nu s-au putut actualiza datele din OpenF1. Afi?ez datele din cache.");
            return;
          }

          const fallbackTeams = dedupeById(selectedFallback);
          setTeams(fallbackTeams);
          setSourceHint(`Fallback local (an ${normalizedYear || "implicit"})`);
          setError(
            openF1Error instanceof Error && openF1Error.message.length > 0
              ? openF1Error.message
              : "Nu s-au gasit echipe în OpenF1."
          );
          return;
        }
      }

      const fallback = dedupeById(selectedFallback);
      setTeams(fallback);
      setSourceHint("Fallback local (implicit)");
      setCacheHint(null);
      setError(null);
    };

    loadTeams();

    return () => {
      controller.abort();
    };
  }, [normalizedYear, selectedFallback]);

  return (
    <div className="space-y-3 p-2">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Echipe Formula 1</h1>
        <p className="text-sm text-[var(--color-neutral-600)]">
          Lista afi?eaza echipe din anul selectat sau fallback manual daca API-ul nu returneaza complet.
        </p>
      </header>

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <label className="flex flex-wrap items-end gap-2">
          <span className="text-xs font-semibold text-[var(--color-neutral-700)]">An (ex: 2026)</span>
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="2026"
            className="w-28 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setYear("")}
          >
            Toate
          </Button>
        </label>
        <div className="mt-2 text-xs text-[var(--color-neutral-600)]">Sursa: {sourceHint}</div>
      </Surface>

      {loading && <div className="text-sm text-[var(--color-neutral-700)]">Se încarca echipele...</div>}
      {cacheHint && <div className="text-xs text-[var(--color-neutral-600)]">{cacheHint}</div>}
      {error && <div className="text-sm text-red-600">Eroare: {error}</div>}

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        {teams.length === 0 ? (
          <div className="text-sm text-[var(--color-neutral-500)]">Nu exista echipe disponibile.</div>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2"
              >
                <div className="font-semibold text-[var(--color-neutral-900)]">{team.name}</div>
                <div className="text-xs text-[var(--color-neutral-600)]">Nacionalitate: {team.nationality}</div>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
