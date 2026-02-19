import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Surface } from "../components/ui/Surface";

export function LeaderboardsPage() {
  return (
    <div className="grid gap-4">
      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Leaderboards</h1>
            <Badge tone="primary">Live</Badge>
            <Badge tone="secondary">Round 4</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" tone="neutral">
              Export
            </Button>
            <Button tone="primary">Refresh Standings</Button>
          </div>
        </div>
      </Surface>

      <Surface tone="subtle">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-neutral-700)]">Top Team</p>
            <p className="text-xl font-bold">Scuderia Phoenix</p>
          </div>
          <Badge tone="neutral">+18 pts this race</Badge>
        </div>
      </Surface>

      <Surface tone="emphasis">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-neutral-700)]">
            Actions using shared design tokens:
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" tone="neutral">
              View History
            </Button>
            <Button variant="outline" tone="secondary">
              Compare Teams
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}
