"use client";
import { ArrowRight } from "lucide-react";
import { CONTENT_TYPES, type ContentTypeId } from "@/lib/content-types";
import { cx } from "../ui";

export function TypeStep({
  type,
  subtype,
  onPick,
  onContinue,
}: {
  type?: ContentTypeId;
  subtype: string;
  onPick: (type: ContentTypeId, subtype: string) => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold">What are you protecting?</h2>
      <p className="mt-1 text-sm text-muted">Pick a content type and format. Each one has its own tailored form.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONTENT_TYPES.map((t) => {
          const selected = t.id === type;
          return (
            <fieldset
              key={t.id}
              className={cx("card flex flex-col transition", selected ? "border-primary ring-2 ring-primary/40" : "hover:border-primary/40")}
            >
              <legend className="sr-only">{t.label}</legend>
              <button type="button" className="text-left" onClick={() => onPick(t.id, selected ? subtype : t.subtypes[0].id)}>
                <span className="text-4xl" aria-hidden="true">{t.emoji}</span>
                <p className="mt-2 text-lg font-bold">{t.label.toUpperCase()}</p>
                <p className="text-sm text-muted">{t.tagline}</p>
              </button>
              <div className="mt-4 space-y-1.5">
                {t.subtypes.map((s) => (
                  <label key={s.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-surface-2">
                    <input
                      type="radio"
                      name="subtype"
                      className="accent-[var(--primary)]"
                      checked={selected && subtype === s.id}
                      onChange={() => onPick(t.id, s.id)}
                    />
                    <span>
                      {s.label}
                      {s.hint && <span className="block text-xs text-muted">{s.hint}</span>}
                    </span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className={cx("mt-4", selected ? "btn-primary" : "btn-ghost")}
                onClick={() => {
                  if (!selected) onPick(t.id, t.subtypes[0].id);
                  onContinue();
                }}
              >
                Select {t.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
