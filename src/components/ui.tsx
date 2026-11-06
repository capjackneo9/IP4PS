"use client";
import { clsx } from "clsx";
import { Check, Copy, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { shortHex } from "@/lib/format";

export { clsx as cx };

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={clsx("inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:bg-surface-2 hover:text-fg", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Clipboard unavailable");
        }
      }}
      aria-label={`${label}: ${value}`}
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}

/** A hash, address or CID in monospace, shortened, with a copy button. */
export function Mono({ value, head = 8, tail = 6, copy = true, className }: { value: string; head?: number; tail?: number; copy?: boolean; className?: string }) {
  return (
    <span className={clsx("inline-flex max-w-full items-center gap-1", className)}>
      <code className="truncate font-mono text-xs text-fg/90" title={value}>
        {shortHex(value, head, tail)}
      </code>
      {copy && <CopyButton value={value} label="Copy" />}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} aria-hidden="true" />;
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-brand" : "bg-surface-2 ring-1 ring-line")}
      >
        <span className={clsx("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
      </button>
    </label>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface-solid p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FileDrop({
  accept,
  multiple,
  onFiles,
  label,
  hint,
  compact,
  id,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label: string;
  hint?: string;
  compact?: boolean;
  id: string;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={clsx(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition",
        compact ? "gap-1 px-3 py-3" : "gap-2 px-4 py-6",
        over ? "border-primary bg-primary/10" : "border-line-strong hover:border-primary/60",
      )}
    >
      <UploadCloud className={clsx("text-primary", compact ? "h-5 w-5" : "h-7 w-7")} aria-hidden="true" />
      <p className="text-sm">
        Drag &amp; drop or{" "}
        <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => input.current?.click()}>
          browse
        </button>
      </p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <input
        ref={input}
        id={id}
        type="file"
        className="sr-only"
        aria-label={label}
        accept={accept === "*" ? undefined : accept}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function Notice({ tone = "info", children, title }: { tone?: "info" | "warn" | "danger" | "success"; children: ReactNode; title?: string }) {
  const tones = {
    info: "border-primary/30 bg-primary/10",
    warn: "border-accent/40 bg-accent/10",
    danger: "border-danger/40 bg-danger/10",
    success: "border-success/40 bg-success/10",
  };
  return (
    <div className={clsx("rounded-xl border p-4 text-sm", tones[tone])} role={tone === "danger" ? "alert" : undefined}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-fg/85">{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
