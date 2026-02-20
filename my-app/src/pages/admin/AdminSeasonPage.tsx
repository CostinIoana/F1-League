import { Badge } from "../../components/ui/Badge";
import { Surface } from "../../components/ui/Surface";
import type { SeasonStatus } from "../../seasons/types";
import { useSession } from "../../session/useSession";

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

export function AdminSeasonPage() {
  const { session } = useSession();

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-4 p-2">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Season Setup</h1>
        <p className="text-sm text-[var(--color-neutral-600)]">
          Manage seasons by status. Step-by-step setup wizard will be added in the next milestone
          steps.
        </p>
      </header>

      <div className="space-y-3">
        {session.seasons.map((season) => (
          <Surface
            key={season.id}
            className="flex items-center justify-between gap-3 border-[var(--color-neutral-200)]"
          >
            <div>
              <div className="text-sm font-semibold text-[var(--color-neutral-900)]">{season.name}</div>
              <div className="text-xs text-[var(--color-neutral-500)]">Season ID: {season.id}</div>
            </div>

            <Badge tone={statusToneMap[season.status]}>{statusLabelMap[season.status]}</Badge>
          </Surface>
        ))}
      </div>
    </div>
  );
}
