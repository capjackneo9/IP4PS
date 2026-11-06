import { describe, expect, it } from "vitest";
import { normalizeHash, sha256File } from "@/lib/hash";
import { fetchMetadata, toDataUri } from "@/lib/metadata";
import { buildMetadata, emptyDraft, orderedFiles, validateDraft, type Draft, type DraftFile } from "@/lib/wizard";

const H = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as `0x${string}`;
const file = (slot: string, hash: number, extra: Partial<DraftFile> = {}): DraftFile => ({
  id: `${slot}${hash}`,
  slot,
  name: `${slot}-${hash}`,
  size: 10,
  mime: "application/octet-stream",
  hash: H(hash),
  hashProgress: 1,
  ...extra,
});
const WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function single(): Draft {
  return {
    ...emptyDraft("fingerprint", 5),
    type: "music",
    subtype: "single",
    fields: { title: "Silent Night Vibes", artist: "MCCA", genre: "Vibe 19" },
    files: [file("cover", 3, { mime: "image/png", cid: "bafycover" }), file("lyrics", 2), file("audio", 1)],
  };
}

describe("sha256File", () => {
  it("matches the known SHA-256 of 'abc'", async () => {
    expect(await sha256File(new Blob(["abc"]))).toBe("0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("hashes the empty file", async () => {
    expect(await sha256File(new Blob([]))).toBe("0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

describe("normalizeHash", () => {
  it("accepts sha256sum output and 0x-prefixed hex", () => {
    const hex = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    expect(normalizeHash(`${hex}  file.wav`)).toBe(`0x${hex}`);
    expect(normalizeHash(`0X${hex.toUpperCase()}`)).toBe(`0x${hex}`);
    expect(normalizeHash("nope")).toBeUndefined();
  });
});

describe("validateDraft", () => {
  it("passes a complete single", () => {
    expect(validateDraft(single())).toEqual([]);
  });
  it("requires title, creator and the audio file", () => {
    const d = { ...single(), fields: {}, files: [] };
    const fields = validateDraft(d).map((i) => i.field);
    expect(fields).toEqual(expect.arrayContaining(["title", "artist", "file:audio"]));
  });
  it("flags identical files and files still hashing", () => {
    const d = single();
    d.files.push(file("lyrics", 1, { id: "dup" }), { ...file("lyrics", 9, { id: "busy" }), hash: undefined, hashProgress: 0.3 });
    const msgs = validateDraft(d).map((i) => i.message).join(" | ");
    expect(msgs).toMatch(/identical/);
    expect(msgs).toMatch(/still being fingerprinted/);
  });
  it("requires each album track to have a title and audio", () => {
    const d: Draft = { ...emptyDraft("fingerprint", 0), type: "music", subtype: "album", fields: { title: "A", artist: "B" }, items: [{ title: "" }] };
    const fields = validateDraft(d).map((i) => i.field);
    expect(fields).toEqual(expect.arrayContaining(["tracks.0.title", "tracks.0.file"]));
  });
});

describe("orderedFiles and metadata", () => {
  it("puts the work first, then album tracks, then extras", () => {
    const d: Draft = {
      ...emptyDraft("fingerprint", 0),
      type: "music",
      subtype: "album",
      items: [{ title: "One" }, { title: "Two" }],
      files: [file("cover", 9), file("audio", 2, { item: 1 }), file("audio", 1, { item: 0 })],
    };
    expect(orderedFiles(d).map((f) => f.hash)).toEqual([H(1), H(2), H(9)]);
    expect(orderedFiles(single()).map((f) => f.slot)).toEqual(["audio", "lyrics", "cover"]);
  });

  it("builds ERC-721 metadata that round-trips through a data URI", async () => {
    const m = buildMetadata(single(), { wallet: WALLET, socials: { twitter: "mcca" }, profileName: "", chainId: 137 });
    expect(m.name).toBe("Silent Night Vibes");
    expect(m.image).toBe("ipfs://bafycover");
    expect(m.ip4ps.files[0]).toMatchObject({ role: "audio", sha256: H(1) });
    expect(m.ip4ps.creator).toEqual({ name: "MCCA", wallet: WALLET, socials: { twitter: "mcca" } });
    expect(m.attributes).toContainEqual({ trait_type: "Genre", value: "Vibe 19" });
    expect(await fetchMetadata(toDataUri(m))).toEqual(m);
  });
});
