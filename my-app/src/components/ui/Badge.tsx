import type { ReactNode } from "react";

type BadgeTone = "primary" | "secondary" | "neutral";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

const toneMap: Record<BadgeTone, string> = {
  primary: "bg-red-50 text-[var(--color-primary-500)]",
  secondary: "bg-amber-50 text-[var(--color-secondary-500)]",
  neutral: "bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)]",
};

export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return <span className={`${base} ${toneMap[tone]} ${className}`.trim()}>{children}</span>;
}
