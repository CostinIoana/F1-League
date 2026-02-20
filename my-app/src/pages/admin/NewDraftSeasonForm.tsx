import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Surface } from "../../components/ui/Surface";

export type NewDraftSeasonInput = {
  name: string;
  year: number;
  entryFee: number;
};

type NewDraftSeasonFormProps = {
  onCreateDraft: (payload: NewDraftSeasonInput) => { success: boolean; message?: string };
};

type FormErrors = {
  name?: string;
  year?: string;
  entryFee?: string;
};

const currentYear = new Date().getFullYear();

export function NewDraftSeasonForm({ onCreateDraft }: NewDraftSeasonFormProps) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(String(currentYear + 1));
  const [entryFee, setEntryFee] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedYear = Number(year);
    const parsedEntryFee = Number(entryFee);

    const nextErrors: FormErrors = {};
    if (name.trim().length < 3) {
      nextErrors.name = "Name must have at least 3 characters.";
    }
    if (!Number.isInteger(parsedYear) || parsedYear < 1950 || parsedYear > currentYear + 3) {
      nextErrors.year = `Year must be between 1950 and ${currentYear + 3}.`;
    }
    if (!Number.isFinite(parsedEntryFee) || parsedEntryFee <= 0) {
      nextErrors.entryFee = "Fee must be a number greater than 0.";
    }

    setErrors(nextErrors);
    setFormMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const result = onCreateDraft({
      name: name.trim(),
      year: parsedYear,
      entryFee: parsedEntryFee,
    });

    if (!result.success) {
      setFormMessage(result.message ?? "Could not create draft season.");
      return;
    }

    setName("");
    setYear(String(currentYear + 1));
    setEntryFee("");
    setFormMessage("Draft season created.");
  };

  return (
    <Surface tone="subtle" className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--color-neutral-900)]">New Draft Season</h2>
        <p className="text-xs text-[var(--color-neutral-600)]">
          Create a draft by entering name, year and entry fee.
        </p>
      </div>

      <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit} noValidate>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="F1 League"
            className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
          />
          {errors.name && <span className="text-xs text-[var(--color-primary-500)]">{errors.name}</span>}
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Year</span>
          <input
            type="number"
            inputMode="numeric"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
          />
          {errors.year && <span className="text-xs text-[var(--color-primary-500)]">{errors.year}</span>}
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-[var(--color-neutral-700)]">Entry Fee</span>
          <input
            type="number"
            inputMode="decimal"
            value={entryFee}
            onChange={(event) => setEntryFee(event.target.value)}
            placeholder="50"
            className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-neutral-900)] outline-none focus:border-[var(--color-primary-500)]"
          />
          {errors.entryFee && (
            <span className="text-xs text-[var(--color-primary-500)]">{errors.entryFee}</span>
          )}
        </label>

        <div className="md:col-span-3 flex items-center gap-3">
          <Button type="submit" size="sm">
            Create Draft
          </Button>
          {formMessage && <span className="text-xs text-[var(--color-neutral-600)]">{formMessage}</span>}
        </div>
      </form>
    </Surface>
  );
}
