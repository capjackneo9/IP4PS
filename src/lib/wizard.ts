import type { Address, Hex } from "viem";
import {
  contentType,
  MAX_FILE_BYTES,
  MAX_FILES_PER_RECORD,
  type ContentTypeId,
  type FieldDef,
} from "./content-types";
import type { IP4PSMetadata, MetadataFile, StorageMode } from "./metadata";

export interface DraftFile {
  id: string;
  slot: string;
  /** Index into draft.items for album tracks / series episodes. */
  item?: number;
  file?: File;
  name: string;
  size: number;
  mime: string;
  hash?: Hex;
  hashProgress: number;
  error?: string;
  cid?: string;
  uploadProgress?: number;
  /** Entered by hand in advanced mode; there is no local file to upload. */
  manual?: boolean;
}

export interface Credit {
  role: string;
  name: string;
  wallet?: string;
  share?: string;
}

export interface Draft {
  type?: ContentTypeId;
  subtype: string;
  fields: Record<string, string>;
  items: Record<string, string>[];
  credits: Credit[];
  customFields: { key: string; value: string }[];
  files: DraftFile[];
  storage: StorageMode;
  royaltyPercent: number;
  advanced: { manualHash: boolean; customMeta: boolean; multiCreator: boolean };
}

export const emptyDraft = (storage: StorageMode, royaltyPercent: number): Draft => ({
  subtype: "",
  fields: {},
  items: [],
  credits: [],
  customFields: [],
  files: [],
  storage,
  royaltyPercent,
  advanced: { manualHash: false, customMeta: false, multiCreator: false },
});

export const newId = () => Math.random().toString(36).slice(2, 10);

export function fileFromUpload(file: File, slot: string, item?: number): DraftFile {
  return {
    id: newId(),
    slot,
    item,
    file,
    name: file.name,
    size: file.size,
    mime: file.type || "application/octet-stream",
    hashProgress: 0,
    error: file.size > MAX_FILE_BYTES ? "Larger than 500 MB" : undefined,
  };
}

export function manualFile(hash: Hex, name: string): DraftFile {
  return { id: newId(), slot: "files", name: name || "Manual fingerprint", size: 0, mime: "application/octet-stream", hash, hashProgress: 1, manual: true };
}

/** Files in the order they are registered: the primary work first, then supporting files, then collection items. */
export function orderedFiles(d: Draft): DraftFile[] {
  if (!d.type) return [];
  const def = contentType(d.type);
  const slots = def.files(d.subtype).map((s) => s.key);
  // Required files (the work itself) first, then album tracks / episodes, then optional extras like cover art.
  const rank = (f: DraftFile) => {
    if (f.item !== undefined) return 1_000 + f.item;
    const i = slots.indexOf(f.slot);
    const required = def.files(d.subtype)[i]?.required;
    return (required ? 0 : 100_000) + (i < 0 ? 999 : i);
  };
  return d.files
    .map((f, n) => ({ f, n }))
    .sort((a, b) => rank(a.f) - rank(b.f) || a.n - b.n)
    .map((x) => x.f);
}

export function creatorName(d: Draft): string {
  if (!d.type) return "";
  const field = contentType(d.type).fields(d.subtype).find((f) => f.creator);
  return (field && d.fields[field.key]) || "";
}

export interface Issue {
  field: string;
  message: string;
}

const missing = (f: FieldDef, v?: string) => f.required && !(v ?? "").trim();

export function validateDraft(d: Draft): Issue[] {
  const issues: Issue[] = [];
  if (!d.type) return [{ field: "type", message: "Choose a content type." }];
  const def = contentType(d.type);
  if (!d.subtype) issues.push({ field: "subtype", message: "Choose a format." });

  for (const f of def.fields(d.subtype)) if (missing(f, d.fields[f.key])) issues.push({ field: f.key, message: `${f.label} is required.` });
  const url = d.fields.url?.trim();
  if (url && !/^https?:\/\/\S+$/i.test(url)) issues.push({ field: "url", message: "URL must start with http:// or https://" });

  for (const slot of def.files(d.subtype))
    if (slot.required && !d.files.some((f) => f.slot === slot.key && f.item === undefined))
      issues.push({ field: `file:${slot.key}`, message: `${slot.label} is required.` });

  const coll = def.collection?.(d.subtype);
  if (coll) {
    if (d.items.length === 0) issues.push({ field: coll.key, message: `Add at least one ${coll.itemLabel.toLowerCase()}.` });
    d.items.forEach((item, i) => {
      for (const f of coll.fields)
        if (missing(f, item[f.key])) issues.push({ field: `${coll.key}.${i}.${f.key}`, message: `${coll.itemLabel} ${i + 1}: ${f.label} is required.` });
      if (!d.files.some((f) => f.item === i)) issues.push({ field: `${coll.key}.${i}.file`, message: `${coll.itemLabel} ${i + 1}: add the ${coll.file.label.toLowerCase()} file.` });
    });
  }

  if (def.id === "custom" && d.files.length === 0) issues.push({ field: "file:files", message: "Add at least one file or fingerprint." });
  if (d.files.length > MAX_FILES_PER_RECORD) issues.push({ field: "files", message: `A record can hold at most ${MAX_FILES_PER_RECORD} files.` });

  const seen = new Map<string, string>();
  for (const f of d.files) {
    if (f.error) issues.push({ field: `file:${f.id}`, message: `${f.name}: ${f.error}` });
    else if (!f.hash) issues.push({ field: `file:${f.id}`, message: `${f.name} is still being fingerprinted.` });
    else if (seen.has(f.hash)) issues.push({ field: `file:${f.id}`, message: `${f.name} is identical to ${seen.get(f.hash)}. Remove one copy.` });
    else seen.set(f.hash, f.name);
  }

  if (d.royaltyPercent < 0 || d.royaltyPercent > 25) issues.push({ field: "royalty", message: "Royalty must be between 0% and 25%." });
  for (const c of d.credits) {
    if (c.wallet && !/^0x[0-9a-fA-F]{40}$/.test(c.wallet)) issues.push({ field: "credits", message: `${c.name || "Credit"}: wallet address is not valid.` });
  }
  if (d.advanced.multiCreator) {
    const shares = d.credits.map((c) => Number(c.share || 0));
    const total = shares.reduce((a, b) => a + b, 0);
    if (d.credits.length && total > 100) issues.push({ field: "credits", message: "Ownership shares add up to more than 100%." });
  }
  return issues;
}

const clean = (o: Record<string, string>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && String(v).trim() !== "").map(([k, v]) => [k, String(v).trim()]));

export function buildMetadata(
  d: Draft,
  opts: { wallet: Address; socials: Record<string, string>; profileName: string; verifyBase?: string; chainId: number },
): IP4PSMetadata {
  const def = contentType(d.type!);
  const files = orderedFiles(d);
  const details = clean(d.fields);
  const preview = def
    .files(d.subtype)
    .filter((s) => s.preview)
    .map((s) => files.find((f) => f.slot === s.key && f.item === undefined && f.cid && f.mime.startsWith("image/")))
    .find(Boolean);
  const subtypeLabel = def.subtypes.find((s) => s.id === d.subtype)?.label ?? d.subtype;
  const creator = creatorName(d) || opts.profileName;

  const metaFiles: MetadataFile[] = files.map((f) => ({
    role: f.item !== undefined ? def.collection?.(d.subtype)?.file.key ?? "item" : f.slot,
    name: f.name,
    size: f.size,
    mime: f.mime,
    sha256: f.hash!,
    ...(f.cid ? { cid: f.cid } : {}),
    ...(f.item !== undefined ? { item: f.item } : {}),
  }));

  const attributes: IP4PSMetadata["attributes"] = [
    { trait_type: "Type", value: def.label },
    { trait_type: "Format", value: subtypeLabel },
    { trait_type: "Creator", value: creator },
    { trait_type: "Files", value: metaFiles.length },
    { trait_type: "Storage", value: d.storage === "ipfs" ? "IPFS" : "Fingerprint only" },
  ];
  if (details.genre) attributes.push({ trait_type: "Genre", value: details.genre });
  if (d.items.length) attributes.push({ trait_type: def.collection?.(d.subtype)?.itemLabel + "s", value: d.items.length });

  const description =
    details.description ||
    `${subtypeLabel} by ${creator}. Protected with IP4PS — the 4 Pillars System: smart contract, blockchain timestamp, NFT and verified identity.`;

  return {
    name: details.title ?? "Untitled",
    description,
    ...(preview?.cid ? { image: `ipfs://${preview.cid}` } : {}),
    ...(opts.verifyBase && files[0]?.hash ? { external_url: `${opts.verifyBase}/verify?chain=${opts.chainId}&hash=${files[0].hash}` } : {}),
    attributes,
    ip4ps: {
      version: 1,
      type: def.id,
      subtype: d.subtype,
      details,
      ...(d.items.length ? { items: d.items.map(clean) } : {}),
      ...(d.credits.length
        ? {
            credits: d.credits
              .filter((c) => c.name.trim())
              .map((c) => ({ role: c.role.trim() || "Collaborator", name: c.name.trim(), ...(c.wallet ? { wallet: c.wallet } : {}), ...(c.share ? { share: c.share } : {}) })),
          }
        : {}),
      ...(d.customFields.some((c) => c.key.trim()) ? { customFields: d.customFields.filter((c) => c.key.trim()) } : {}),
      creator: { name: creator, wallet: opts.wallet, ...(Object.keys(opts.socials).length ? { socials: opts.socials } : {}) },
      files: metaFiles,
      storage: d.storage,
      createdWith: "IP4PS",
    },
  };
}
