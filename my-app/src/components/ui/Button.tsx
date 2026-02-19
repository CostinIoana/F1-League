import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonTone = "primary" | "secondary" | "neutral";
type ButtonSize = "sm" | "md";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const base =
  "inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const sizeMap: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

const variantToneMap: Record<ButtonVariant, Record<ButtonTone, string>> = {
  solid: {
    primary:
      "bg-[var(--color-primary-500)] text-white hover:brightness-95 focus:ring-[var(--color-primary-500)]",
    secondary:
      "bg-[var(--color-secondary-500)] text-white hover:brightness-95 focus:ring-[var(--color-secondary-500)]",
    neutral:
      "bg-[var(--color-neutral-900)] text-white hover:brightness-95 focus:ring-[var(--color-neutral-500)]",
  },
  outline: {
    primary:
      "border border-[var(--color-primary-500)] text-[var(--color-primary-500)] hover:bg-[var(--color-neutral-100)] focus:ring-[var(--color-primary-500)]",
    secondary:
      "border border-[var(--color-secondary-500)] text-[var(--color-secondary-500)] hover:bg-[var(--color-neutral-100)] focus:ring-[var(--color-secondary-500)]",
    neutral:
      "border border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)] focus:ring-[var(--color-neutral-500)]",
  },
  ghost: {
    primary:
      "text-[var(--color-primary-500)] hover:bg-[var(--color-neutral-100)] focus:ring-[var(--color-primary-500)]",
    secondary:
      "text-[var(--color-secondary-500)] hover:bg-[var(--color-neutral-100)] focus:ring-[var(--color-secondary-500)]",
    neutral:
      "text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)] focus:ring-[var(--color-neutral-500)]",
  },
};

export function Button({
  children,
  variant = "solid",
  tone = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${sizeMap[size]} ${variantToneMap[variant][tone]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
