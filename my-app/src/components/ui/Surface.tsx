import type { HTMLAttributes, ReactNode } from "react";

type SurfaceTone = "default" | "subtle" | "emphasis";

type SurfaceProps = {
  children: ReactNode;
  tone?: SurfaceTone;
} & HTMLAttributes<HTMLDivElement>;

const base = "rounded-xl border p-4 text-[var(--color-neutral-900)]";

const toneMap: Record<SurfaceTone, string> = {
  default: "border-[var(--color-neutral-200)] bg-[var(--color-surface)]",
  subtle: "border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]",
  emphasis: "border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]",
};

export function Surface({
  children,
  tone = "default",
  className = "",
  ...props
}: SurfaceProps) {
  return (
    <div className={`${base} ${toneMap[tone]} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
