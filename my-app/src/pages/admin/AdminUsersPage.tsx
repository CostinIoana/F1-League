import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Surface } from "../../components/ui/Surface";

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
  const [users, setUsers] = useState<AdminUserRow[]>(mockUsers);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteFeedbackTone, setInviteFeedbackTone] = useState<"error" | "success">("success");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

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
    setInviteFeedback("Invite sent successfully.");
    window.setTimeout(() => {
      handleCloseInviteModal();
    }, 700);
  };

  return (
    <div className="space-y-3 p-2">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">User Management</h1>
          <p className="text-sm text-[var(--color-neutral-600)]">
            Track invite, payment, and team selection status.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleOpenInviteModal}
        >
          Invite User
        </Button>
      </header>

      <Modal
        isOpen={isInviteModalOpen}
        title="Invite User"
        onClose={handleCloseInviteModal}
        footer={
          <>
            <Button type="button" size="sm" variant="ghost" onClick={handleCloseInviteModal}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSendInvite} disabled={isSubmittingInvite}>
              Send Invite
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

      <Surface tone="subtle" className="border-[var(--color-neutral-300)]">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-neutral-600)]">
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Name</th>
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Email</th>
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Invite Status</th>
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Payment</th>
                <th className="border-b border-[var(--color-neutral-200)] px-2 py-2">Team Status</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}
