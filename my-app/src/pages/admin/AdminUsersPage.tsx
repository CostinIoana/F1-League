import { useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Surface } from "../../components/ui/Surface";
import { PILOT_VALUE_GROUPS, type PilotValueGroup } from "../../seasons/types";
import { useSession } from "../../session/useSession";

type InviteStatus = "pending" | "joined" | "expired";
type PaymentStatus = "paid" | "unpaid";
type TeamProgressStatus = "not_started" | "in_progress" | "complete";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  inviteStatus: InviteStatus;
  paymentStatus: PaymentStatus;
  teamStatus: TeamProgressStatus;
};

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

const mockUsers: AdminUserRow[] = [
  {
    id: "u-01",
    name: "Alex Racing",
    email: "alex@f1league.com",
    inviteStatus: "joined",
    paymentStatus: "paid",
    teamStatus: "complete",
  },
  {
    id: "u-02",
    name: "Mara Petrescu",
    email: "mara@f1league.com",
    inviteStatus: "pending",
    paymentStatus: "unpaid",
    teamStatus: "not_started",
  },
  {
    id: "u-03",
    name: "Radu Ionescu",
    email: "radu@f1league.com",
    inviteStatus: "joined",
    paymentStatus: "unpaid",
    teamStatus: "in_progress",
  },
  {
    id: "u-04",
    name: "Bianca Stoica",
    email: "bianca@f1league.com",
    inviteStatus: "expired",
    paymentStatus: "unpaid",
    teamStatus: "not_started",
  },
  {
    id: "u-05",
    name: "Daniel Marin",
    email: "daniel@f1league.com",
    inviteStatus: "joined",
    paymentStatus: "paid",
    teamStatus: "in_progress",
  },
];

const inviteBadgeMap: Record<InviteStatus, { label: string; tone: "primary" | "secondary" | "neutral" }> = {
  pending: { label: "Pending", tone: "secondary" },
  joined: { label: "Joined", tone: "primary" },
  expired: { label: "Expired", tone: "neutral" },
};

const paymentBadgeMap: Record<PaymentStatus, { label: string; tone: "primary" | "secondary" }> = {
  paid: { label: "Paid", tone: "primary" },
  unpaid: { label: "Unpaid", tone: "secondary" },
};

const teamStatusLabelMap: Record<TeamProgressStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  complete: "Complete",
};

export function AdminUsersPage() {
  const { session, loading } = useSession();
  const [users, setUsers] = useState<AdminUserRow[]>(mockUsers);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteFeedbackTone, setInviteFeedbackTone] = useState<"error" | "success">("success");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamModalUser, setTeamModalUser] = useState<AdminUserRow | null>(null);
  const [teamSelectedSlotIds, setTeamSelectedSlotIds] = useState<string[]>([]);
  const [teamFeedback, setTeamFeedback] = useState<string | null>(null);

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
      return [] as Array<{ slotId: string; pilotName: string; teamName: string; valueGroup: PilotValueGroup }>;
    }
    return selectedSeason.teams.flatMap((team) =>
      team.pilots
        .filter(
          (pilot) =>
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
  }, [activeGroups, selectedSeason]);

  const draftPilotBySlotId = useMemo(() => {
    const bySlot: Record<string, (typeof draftPool)[number]> = {};
    draftPool.forEach((pilot) => {
      bySlot[pilot.slotId] = pilot;
    });
    return bySlot;
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

  const teamSelectedByGroup = useMemo(() => {
    const counts: Record<PilotValueGroup, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    teamSelectedSlotIds.forEach((slotId) => {
      const pilot = draftPilotBySlotId[slotId];
      if (pilot) {
        counts[pilot.valueGroup] += 1;
      }
    });
    return counts;
  }, [draftPilotBySlotId, teamSelectedSlotIds]);

  const resetInviteModal = () => {
    setInviteEmail("");
    setInviteFeedback(null);
    setInviteFeedbackTone("success");
    setIsSubmittingInvite(false);
  };

  const handleOpenInviteModal = () => {
    resetInviteModal();
    setIsInviteModalOpen(true);
  };

  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    resetInviteModal();
  };

  const handleSendInvite = () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail) {
      setInviteFeedbackTone("error");
      setInviteFeedback("Email is required.");
      return;
    }
    if (!emailRegex.test(normalizedEmail)) {
      setInviteFeedbackTone("error");
      setInviteFeedback("Please enter a valid email address.");
      return;
    }
    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      setInviteFeedbackTone("error");
      setInviteFeedback("A user with this email already exists.");
      return;
    }

    setIsSubmittingInvite(true);
    const nameFromEmail = normalizedEmail.split("@")[0];
    const normalizedName = nameFromEmail
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    setUsers((current) => [
      {
        id: `u-${Date.now()}`,
        name: normalizedName || "Invited User",
        email: normalizedEmail,
        inviteStatus: "pending",
        paymentStatus: "unpaid",
        teamStatus: "not_started",
      },
      ...current,
    ]);

    setInviteFeedbackTone("success");
    setInviteFeedback("User added successfully.");
    window.setTimeout(() => {
      handleCloseInviteModal();
    }, 700);
  };

  const handleOpenTeamModal = (user: AdminUserRow) => {
    if (!selectedSeason) {
      setTeamFeedback("No season selected.");
      return;
    }

    const storageKey = getTeamSelectionStorageKey(selectedSeason.id, user.email);
    const raw = localStorage.getItem(storageKey);
    let selectedSlotIds: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<TeamSelectionState>;
        selectedSlotIds = Array.isArray(parsed.selectedSlotIds)
          ? parsed.selectedSlotIds.filter(
              (slotId): slotId is string => typeof slotId === "string" && Boolean(draftPilotBySlotId[slotId])
            )
          : [];
      } catch {
        selectedSlotIds = [];
      }
    }

    setTeamModalUser(user);
    setTeamSelectedSlotIds(selectedSlotIds);
    setTeamFeedback(null);
    setIsTeamModalOpen(true);
  };

  const handleCloseTeamModal = () => {
    setIsTeamModalOpen(false);
    setTeamModalUser(null);
    setTeamSelectedSlotIds([]);
    setTeamFeedback(null);
  };

  const handleTogglePilotForTeam = (slotId: string) => {
    const pilot = draftPilotBySlotId[slotId];
    if (!pilot) {
      return;
    }

    setTeamFeedback(null);
    setTeamSelectedSlotIds((current) => {
      const isSelected = current.includes(slotId);
      if (isSelected) {
        return current.filter((currentSlotId) => currentSlotId !== slotId);
      }
      if (teamSelectedByGroup[pilot.valueGroup] >= groupRequirements[pilot.valueGroup]) {
        setTeamFeedback(
          `Group ${pilot.valueGroup} already has ${groupRequirements[pilot.valueGroup]} selected pilots.`
        );
        return current;
      }
      if (current.length >= effectiveRequiredTotal) {
        setTeamFeedback(`You can select maximum ${effectiveRequiredTotal} pilots.`);
        return current;
      }
      return [...current, slotId];
    });
  };

  const handleSaveTeamForUser = () => {
    if (!teamModalUser || !selectedSeason) {
      setTeamFeedback("Missing user or season.");
      return;
    }

    const storageKey = getTeamSelectionStorageKey(selectedSeason.id, teamModalUser.email);
    const normalizedSelection = teamSelectedSlotIds.filter((slotId) => Boolean(draftPilotBySlotId[slotId]));
    const isComplete = normalizedSelection.length === effectiveRequiredTotal;
    const payload: TeamSelectionState = {
      selectedSlotIds: normalizedSelection,
      locked: isComplete,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));

    setUsers((current) =>
      current.map((user) =>
        user.email.toLowerCase() !== teamModalUser.email.toLowerCase()
          ? user
          : {
              ...user,
              teamStatus:
                normalizedSelection.length === 0
                  ? "not_started"
                  : isComplete
                    ? "complete"
                    : "in_progress",
            }
      )
    );

    setTeamFeedback("Team saved.");
    window.setTimeout(() => {
      handleCloseTeamModal();
    }, 400);
  };

  if (loading || !session) {
    return <div className="p-6 text-sm text-[var(--color-neutral-700)]">Loading users...</div>;
  }

  return (
    <div className="space-y-3 p-2">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">User Management</h1>
          <p className="text-sm text-[var(--color-neutral-600)]">
            Add participants, track status, and assign pilot teams.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleOpenInviteModal}
        >
          Add User
        </Button>
      </header>

      <Modal
        isOpen={isInviteModalOpen}
        title="Add User"
        onClose={handleCloseInviteModal}
        footer={
          <>
            <Button type="button" size="sm" variant="ghost" onClick={handleCloseInviteModal}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSendInvite} disabled={isSubmittingInvite}>
              Add User
            </Button>
          </>
        }
      >
        <label className="space-y-1">
          <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Email</span>
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => {
              setInviteEmail(event.target.value);
              if (inviteFeedback) {
                setInviteFeedback(null);
              }
            }}
            placeholder="pilot@f1league.com"
            className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
          />
        </label>
        {inviteFeedback && (
          <div
            className={`mt-2 text-xs ${
              inviteFeedbackTone === "error"
                ? "text-[var(--color-primary-500)]"
                : "text-[var(--color-neutral-700)]"
            }`}
          >
            {inviteFeedback}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isTeamModalOpen}
        title={`Edit Team${teamModalUser ? `: ${teamModalUser.name}` : ""}`}
        onClose={handleCloseTeamModal}
        footer={
          <>
            <Button type="button" size="sm" variant="ghost" onClick={handleCloseTeamModal}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSaveTeamForUser}>
              Save Team
            </Button>
          </>
        }
      >
        {!selectedSeason ? (
          <div className="text-xs text-[var(--color-neutral-600)]">No season selected.</div>
        ) : draftPool.length === 0 ? (
          <div className="text-xs text-[var(--color-neutral-600)]">
            No draft pilots available in selected season.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-[var(--color-neutral-600)]">
              Selected: {teamSelectedSlotIds.length}/{effectiveRequiredTotal}
            </div>
            <div className="text-xs text-[var(--color-neutral-600)]">
              Groups active this season: {activeGroups.join(", ")}
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {draftPool.map((pilot) => {
                const isSelected = teamSelectedSlotIds.includes(pilot.slotId);
                return (
                  <label
                    key={pilot.slotId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-neutral-200)] px-2 py-1.5 text-sm"
                  >
                    <span>
                      {pilot.pilotName} ({pilot.teamName}) | Group {pilot.valueGroup}
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTogglePilotForTeam(pilot.slotId)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}
        {teamFeedback && <div className="mt-2 text-xs text-[var(--color-neutral-700)]">{teamFeedback}</div>}
      </Modal>

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-neutral-600)]">
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Name</th>
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Email</th>
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Invite Status</th>
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Payment</th>
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Team Status</th>
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="text-sm text-[var(--color-neutral-800)]">
                  <td className="border-b border-[var(--color-neutral-200)] px-2 py-2 font-medium">{user.name}</td>
                  <td className="border-b border-[var(--color-neutral-200)] px-2 py-2">{user.email}</td>
                  <td className="border-b border-[var(--color-neutral-200)] px-2 py-2">
                    <Badge tone={inviteBadgeMap[user.inviteStatus].tone}>
                      {inviteBadgeMap[user.inviteStatus].label}
                    </Badge>
                  </td>
                  <td className="border-b border-[var(--color-neutral-200)] px-2 py-2">
                    <Badge tone={paymentBadgeMap[user.paymentStatus].tone}>
                      {paymentBadgeMap[user.paymentStatus].label}
                    </Badge>
                  </td>
                  <td className="border-b border-[var(--color-neutral-200)] px-2 py-2">
                    {teamStatusLabelMap[user.teamStatus]}
                  </td>
                  <td className="border-b border-[var(--color-neutral-200)] px-2 py-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => handleOpenTeamModal(user)}>
                      Edit Team
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}
