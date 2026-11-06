"use client";
import { ArrowLeft, ArrowRight, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { contentType, type FileSlot } from "@/lib/content-types";
import { normalizeHash } from "@/lib/hash";
import { fileFromUpload, manualFile, type Draft, type Issue } from "@/lib/wizard";
import { cx, FileDrop, Notice, Toggle } from "../ui";
import { FieldInput, FileRow } from "./fields";

type Set = Dispatch<SetStateAction<Draft>>;

function ImagePreview({ file }: { file?: File }) {
  const url = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Preview" className="mx-auto max-h-64 rounded-xl border border-line object-contain" />;
}

function SlotEditor({ slot, draft, setDraft, error }: { slot: FileSlot; draft: Draft; setDraft: Set; error?: string }) {
  const files = draft.files.filter((f) => f.slot === slot.key && f.item === undefined);
  const add = (list: File[]) =>
    setDraft((d) => ({
      ...d,
      files: [
        ...(slot.multiple ? d.files : d.files.filter((f) => !(f.slot === slot.key && f.item === undefined))),
        ...list.map((f) => fileFromUpload(f, slot.key)),
      ],
    }));
  const remove = (id: string) => setDraft((d) => ({ ...d, files: d.files.filter((f) => f.id !== id) }));
  return (
    <div>
      <p className="label">
        {slot.label}
        {slot.required ? <span className="text-danger"> *</span> : <span className="normal-case"> — optional</span>}
      </p>
      {slot.preview && files[0]?.file && <div className="mb-3"><ImagePreview file={files[0].file} /></div>}
      <div className="space-y-2">
        {files.map((f) => (
          <FileRow key={f.id} f={f} onRemove={() => remove(f.id)} />
        ))}
        {(slot.multiple || files.length === 0) && (
          <FileDrop id={`slot-${slot.key}`} label={slot.label} accept={slot.accept} multiple={slot.multiple} hint={slot.hint} onFiles={add} compact={files.length > 0} />
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

function CollectionEditor({ draft, setDraft, issues }: { draft: Draft; setDraft: Set; issues: Issue[] }) {
  const coll = contentType(draft.type!).collection?.(draft.subtype);
  if (!coll) return null;
  const err = (k: string) => issues.find((i) => i.field === k)?.message;

  const addItems = (files: File[]) =>
    setDraft((d) => {
      const start = d.items.length;
      const items = [...d.items, ...files.map((f, i) => ({ title: f.name.replace(/\.[^.]+$/, ""), ...(coll.key === "episodes" ? { episodeNumber: String(start + i + 1) } : {}) }))];
      return { ...d, items, files: [...d.files, ...files.map((f, i) => fileFromUpload(f, coll.file.key, start + i))] };
    });
  const removeItem = (idx: number) =>
    setDraft((d) => ({
      ...d,
      items: d.items.filter((_, i) => i !== idx),
      files: d.files.filter((f) => f.item !== idx).map((f) => (f.item !== undefined && f.item > idx ? { ...f, item: f.item - 1 } : f)),
    }));
  const setItem = (idx: number, key: string, v: string) =>
    setDraft((d) => ({ ...d, items: d.items.map((it, i) => (i === idx ? { ...it, [key]: v } : it)) }));
  const setItemFile = (idx: number, file: File) =>
    setDraft((d) => ({ ...d, files: [...d.files.filter((f) => f.item !== idx), fileFromUpload(file, coll.file.key, idx)] }));

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{coll.itemLabel} list ({draft.items.length})</h3>
        <button type="button" className="btn-ghost min-h-9 px-3 text-xs" onClick={() => setDraft((d) => ({ ...d, items: [...d.items, {}] }))}>
          <Plus className="h-3.5 w-3.5" /> Add {coll.itemLabel.toLowerCase()}
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {draft.items.map((item, i) => {
          const file = draft.files.find((f) => f.item === i);
          return (
            <div key={i} className="rounded-xl border border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {coll.itemLabel} {i + 1}
                </p>
                <button type="button" onClick={() => removeItem(i)} className="rounded-lg p-2 text-muted hover:bg-danger/15 hover:text-danger" aria-label={`Remove ${coll.itemLabel} ${i + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {coll.fields.map((f) => (
                  <FieldInput key={f.key} def={f} idPrefix={`${coll.key}-${i}`} value={item[f.key]} onChange={(v) => setItem(i, f.key, v)} error={err(`${coll.key}.${i}.${f.key}`)} />
                ))}
              </div>
              <div className="mt-3">
                {file ? (
                  <FileRow f={file} onRemove={() => setDraft((d) => ({ ...d, files: d.files.filter((x) => x.id !== file.id) }))} />
                ) : (
                  <FileDrop id={`${coll.key}-${i}-file`} compact label={`${coll.itemLabel} ${i + 1} ${coll.file.label}`} accept={coll.file.accept} onFiles={(fs) => setItemFile(i, fs[0])} hint={`${coll.file.label} file`} />
                )}
                {err(`${coll.key}.${i}.file`) && <p className="mt-1 text-xs text-danger">{err(`${coll.key}.${i}.file`)}</p>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <p className="label">Bulk add — drop all {coll.key} at once</p>
        <FileDrop id={`${coll.key}-bulk`} label={`Add ${coll.key}`} accept={coll.file.accept} multiple onFiles={addItems} hint={`Each file becomes a ${coll.itemLabel.toLowerCase()}, named after the file`} />
      </div>
      {err(coll.key) && <p className="mt-2 text-xs text-danger">{err(coll.key)}</p>}
    </section>
  );
}

function CreditsEditor({ draft, setDraft }: { draft: Draft; setDraft: Set }) {
  const def = contentType(draft.type!);
  const roles = def.creditRoles;
  const multi = draft.advanced.multiCreator;
  const set = (i: number, k: string, v: string) =>
    setDraft((d) => ({ ...d, credits: d.credits.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));
  const title = roles ? "Credits" : multi ? "Co-creators (shared ownership)" : "Collaborators";
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {title} <span className="text-xs font-normal text-muted">— optional</span>
        </h3>
        <button
          type="button"
          className="btn-ghost min-h-9 px-3 text-xs"
          onClick={() => setDraft((d) => ({ ...d, credits: [...d.credits, { role: roles?.[d.credits.length % roles.length] ?? (multi ? "Co-creator" : "Collaborator"), name: "" }] }))}
        >
          <Plus className="h-3.5 w-3.5" /> Add {roles ? "credit" : multi ? "co-creator" : "collaborator"}
        </button>
      </div>
      {draft.credits.length === 0 && <p className="mt-2 text-sm text-muted">No {title.toLowerCase()} added.</p>}
      <div className="mt-3 space-y-3">
        {draft.credits.map((c, i) => (
          <div key={i} className={cx("grid gap-2", multi ? "sm:grid-cols-[1fr_1fr_1.4fr_5rem_auto]" : "sm:grid-cols-[1fr_1fr_1.4fr_auto]")}>
            {roles ? (
              <select className="input" aria-label="Role" value={c.role} onChange={(e) => set(i, "role", e.target.value)}>
                {[...roles, "Other"].map((r) => <option key={r}>{r}</option>)}
              </select>
            ) : (
              <input className="input" aria-label="Role" placeholder="Role (e.g. Producer)" value={c.role} onChange={(e) => set(i, "role", e.target.value)} />
            )}
            <input className="input" aria-label="Name" placeholder="Name" value={c.name} onChange={(e) => set(i, "name", e.target.value)} />
            <input className="input font-mono" aria-label="Wallet address (optional)" placeholder="Wallet 0x… (optional)" value={c.wallet ?? ""} onChange={(e) => set(i, "wallet", e.target.value.trim())} />
            {multi && <input className="input" type="number" min={0} max={100} aria-label="Ownership share %" placeholder="%" value={c.share ?? ""} onChange={(e) => set(i, "share", e.target.value)} />}
            <button type="button" className="btn-ghost w-11 px-0" aria-label={`Remove ${c.name || "credit"}`} onClick={() => setDraft((d) => ({ ...d, credits: d.credits.filter((_, j) => j !== i) }))}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {multi && <p className="mt-3 text-xs text-muted">Shares are recorded in the work&apos;s metadata as a declaration. The ownership token itself is held by the registering wallet.</p>}
    </section>
  );
}

function AdvancedOptions({ draft, setDraft }: { draft: Draft; setDraft: Set }) {
  const [hash, setHash] = useState("");
  const [name, setName] = useState("");
  const parsed = normalizeHash(hash);
  const adv = draft.advanced;
  const toggle = (k: keyof Draft["advanced"]) => (v: boolean) => setDraft((d) => ({ ...d, advanced: { ...d.advanced, [k]: v } }));
  return (
    <section className="card">
      <h3 className="font-semibold">Advanced options</h3>
      <Toggle checked={adv.manualHash} onChange={toggle("manualHash")} label="Manual hash entry" description="Register a SHA-256 you computed yourself (e.g. `sha256sum file`). The file never touches this app." />
      {adv.manualHash && (
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input className="input" placeholder="File name / label" aria-label="Label for manual hash" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={cx("input font-mono", hash && !parsed && "border-danger")} placeholder="SHA-256 (64 hex characters)" aria-label="SHA-256 hash" value={hash} onChange={(e) => setHash(e.target.value)} />
          <button type="button" className="btn-primary" disabled={!parsed} onClick={() => { setDraft((d) => ({ ...d, files: [...d.files, manualFile(parsed!, name)] })); setHash(""); setName(""); }}>
            Add
          </button>
        </div>
      )}
      <Toggle checked={adv.customMeta} onChange={toggle("customMeta")} label="Custom metadata fields" description="Add your own key/value pairs to the record." />
      {adv.customMeta && (
        <div className="mb-3 space-y-2">
          {draft.customFields.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
              <input className="input" placeholder="Key" aria-label="Custom field key" value={c.key} onChange={(e) => setDraft((d) => ({ ...d, customFields: d.customFields.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)) }))} />
              <input className="input" placeholder="Value" aria-label="Custom field value" value={c.value} onChange={(e) => setDraft((d) => ({ ...d, customFields: d.customFields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) }))} />
              <button type="button" className="btn-ghost w-11 px-0" aria-label="Remove field" onClick={() => setDraft((d) => ({ ...d, customFields: d.customFields.filter((_, j) => j !== i) }))}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" className="btn-ghost min-h-9 px-3 text-xs" onClick={() => setDraft((d) => ({ ...d, customFields: [...d.customFields, { key: "", value: "" }] }))}>
            <Plus className="h-3.5 w-3.5" /> Add field
          </button>
        </div>
      )}
      <Toggle checked={adv.multiCreator} onChange={toggle("multiCreator")} label="Multi-creator (shared ownership)" description="List co-creators and their ownership shares." />
    </section>
  );
}

export function DetailsStep({
  draft,
  setDraft,
  issues,
  checking,
  storageAvailable,
  onBack,
  onContinue,
}: {
  draft: Draft;
  setDraft: Set;
  issues: Issue[];
  checking: boolean;
  storageAvailable: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const def = contentType(draft.type!);
  const sub = def.subtypes.find((s) => s.id === draft.subtype);
  const err = (k: string) => issues.find((i) => i.field === k)?.message;
  const hashing = draft.files.some((f) => f.file && !f.hash && !f.error);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">
          {def.emoji} Protect your {sub?.label.toLowerCase() ?? def.label.toLowerCase()}
        </h2>
        <p className="mt-1 text-sm text-muted">Files are fingerprinted on your device as soon as you add them.</p>
      </div>

      {def.subtypes.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Format">
          {def.subtypes.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === draft.subtype} onClick={() => setDraft((d) => ({ ...d, subtype: s.id }))} className={cx("chip min-h-9 px-3", s.id === draft.subtype && "border-primary bg-primary/15")}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      <section className="card">
        <h3 className="mb-4 font-semibold">{def.label} information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {def.fields(draft.subtype).map((f) => (
            <FieldInput key={f.key} def={f} value={draft.fields[f.key]} hours={def.id === "film"} onChange={(v) => setDraft((d) => ({ ...d, fields: { ...d.fields, [f.key]: v } }))} error={err(f.key)} />
          ))}
        </div>
      </section>

      <CollectionEditor draft={draft} setDraft={setDraft} issues={issues} />

      <section className="card space-y-5">
        <h3 className="font-semibold">Upload files</h3>
        {def.files(draft.subtype).map((slot) => (
          <SlotEditor key={slot.key} slot={slot} draft={draft} setDraft={setDraft} error={err(`file:${slot.key}`)} />
        ))}
        {def.id === "custom" &&
          draft.files.filter((f) => f.manual).map((f) => (
            <FileRow key={f.id} f={f} onRemove={() => setDraft((d) => ({ ...d, files: d.files.filter((x) => x.id !== f.id) }))} />
          ))}
      </section>

      <CreditsEditor draft={draft} setDraft={setDraft} />
      {def.advanced && <AdvancedOptions draft={draft} setDraft={setDraft} />}

      <section className="card space-y-4">
        <h3 className="font-semibold">Storage &amp; royalties</h3>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Storage">
          {(
            [
              ["fingerprint", "Fingerprint only", "Files stay on your device. Only their SHA-256 fingerprints go on-chain. Best for unreleased work."],
              ["ipfs", "Fingerprint + IPFS", "Files are also pinned to IPFS: public, permanent and downloadable by anyone with the link."],
            ] as const
          ).map(([id, label, desc]) => {
            const disabled = id === "ipfs" && !storageAvailable;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={draft.storage === id}
                disabled={disabled}
                onClick={() => setDraft((d) => ({ ...d, storage: id }))}
                className={cx("rounded-xl border p-4 text-left transition disabled:opacity-50", draft.storage === id ? "border-primary bg-primary/10" : "border-line hover:border-line-strong")}
              >
                <p className="flex items-center gap-2 font-semibold">{id === "ipfs" && <ImageIcon className="h-4 w-4" />} {label}</p>
                <p className="mt-1 text-xs text-muted">{disabled ? "IPFS storage is not configured on this deployment." : desc}</p>
              </button>
            );
          })}
        </div>
        <label className="block">
          <span className="label">Creator royalty on resale: {draft.royaltyPercent}%</span>
          <input type="range" min={0} max={25} step={0.5} value={draft.royaltyPercent} onChange={(e) => setDraft((d) => ({ ...d, royaltyPercent: Number(e.target.value) }))} className="w-full accent-[var(--primary)]" />
          <span className="text-xs text-muted">Published with the token (ERC-2981). Marketplaces that support the standard pay it to your wallet.</span>
        </label>
      </section>

      {issues.length > 0 && (
        <Notice tone="danger" title="Please fix the following">
          <ul className="list-disc space-y-0.5 pl-5">
            {issues.slice(0, 12).map((i) => <li key={i.field + i.message}>{i.message}</li>)}
          </ul>
        </Notice>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" className="btn-ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button type="button" className="btn-primary" onClick={onContinue} disabled={checking}>
          {checking || hashing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {hashing ? "Fingerprinting…" : checking ? "Checking the registry…" : "Continue"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
