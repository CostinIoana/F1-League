import { useEffect, type ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ isOpen, title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-surface)] p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold text-[var(--color-neutral-900)]">{title}</h2>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div>{children}</div>

        {footer && <div className="mt-4 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
