"use client";
import { CheckCircle2, FileIcon, Loader2, Trash2, TriangleAlert } from "lucide-react";
import type { FieldDef } from "@/lib/content-types";
import { formatBytes, shortHex } from "@/lib/format";
import type { DraftFile } from "@/lib/wizard";
import { Progress } from "../ui";

export function DurationInput({ value, onChange, hours, id }: { value?: string; onChange: (v: string) => void; hours?: boolean; id: string }) {
  const total = Number(value || 0);
  const h = Math.floor(total / 3600);
  const m = hours ? Math.floor((total % 3600) / 60) : Math.floor(total / 60);
  const s = total % 60;
  const set = (nh: number, nm: number, ns: number) => {
    const t = Math.max(0, (hours ? nh * 3600 : 0) + nm * 60 + ns);
    onChange(t ? String(t) : "");
  };
  const box = (label: string, v: number, fn: (n: number) => void, max?: number) => (
    <label className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={max}
        inputMode="numeric"
        className="input w-20"
        value={total ? v : ""}
        id={label === (hours ? "hours" : "min") ? id : undefined}
        aria-label={label}
        onChange={(e) => fn(Math.max(0, Number(e.target.value) || 0))}
      />
      <span className="text-xs text-muted">{label}</span>
    </label>
  );
  return (
    <div className="flex flex-wrap gap-3">
      {hours && box("hours", h, (n) => set(n, m, s))}
      {box("min", m, (n) => set(h, n, s), hours ? 59 : undefined)}
      {box("sec", s, (n) => set(h, m, Math.min(59, n)), 59)}
    </div>
  );
}

export function FieldInput({
  def,
  value,
  onChange,
  error,
  idPrefix = "f",
  hours,
}: {
  def: FieldDef;
  value?: string;
  onChange: (v: string) => void;
  error?: string;
  idPrefix?: string;
  hours?: boolean;
}) {
  const id = `${idPrefix}-${def.key}`;
  const common = { id, "aria-invalid": !!error || undefined, "aria-describedby": error ? `${id}-err` : undefined };
  let control;
  switch (def.type) {
    case "textarea":
      control = <textarea {...common} rows={4} className="input py-2" value={value ?? ""} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "duration":
      control = <DurationInput id={id} value={value} onChange={onChange} hours={hours} />;
      break;
    case "dimensions": {
      const [w = "", h = ""] = (value ?? "").split("x");
      control = (
        <div className="flex items-center gap-2">
          <input {...common} type="number" min={1} className="input w-28" placeholder="width" aria-label="Width in pixels" value={w} onChange={(e) => onChange(`${e.target.value}x${h}`.replace(/^x$/, ""))} />
          <span className="text-muted">×</span>
          <input type="number" min={1} className="input w-28" placeholder="height" aria-label="Height in pixels" value={h} onChange={(e) => onChange(`${w}x${e.target.value}`.replace(/^x$/, ""))} />
          <span className="text-xs text-muted">px</span>
        </div>
      );
      break;
    }
    case "select":
      control = (
        <select {...common} className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {def.options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
      break;
    default:
      control = (
        <input
          {...common}
          type={def.type === "number" ? "number" : def.type === "date" ? "date" : def.type === "url" ? "url" : "text"}
          min={def.type === "number" ? 0 : undefined}
          className="input"
          value={value ?? ""}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
  return (
    <div className={def.type === "textarea" ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="label">
        {def.label}
        {def.required && <span className="text-danger"> *</span>}
      </label>
      {control}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function FileRow({ f, onRemove }: { f: DraftFile; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2">
      {f.error ? (
        <TriangleAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
      ) : f.hash ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
      ) : f.file ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
      ) : (
        <FileIcon className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {f.name} {!f.manual && <span className="text-xs font-normal text-muted">({formatBytes(f.size)})</span>}
        </p>
        {f.error ? (
          <p className="text-xs text-danger">{f.error}</p>
        ) : f.hash ? (
          <p className="truncate font-mono text-xs text-muted" title={f.hash}>
            SHA-256 {shortHex(f.hash, 10, 8)}
          </p>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <Progress value={f.hashProgress} className="h-1.5" />
            <span className="text-xs text-muted">{Math.round(f.hashProgress * 100)}%</span>
          </div>
        )}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="rounded-lg p-2 text-muted hover:bg-danger/15 hover:text-danger" aria-label={`Remove ${f.name}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
