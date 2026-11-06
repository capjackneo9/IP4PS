import { createSHA256 } from "hash-wasm";
import type { Hex } from "viem";

const CHUNK = 8 * 1024 * 1024;

/**
 * SHA-256 of a file, computed on this device in 8 MB chunks so even 500 MB videos never have
 * to be loaded into memory at once. The file never leaves the browser to be hashed.
 */
export async function sha256File(file: Blob, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<Hex> {
  const hasher = await createSHA256();
  hasher.init();
  for (let offset = 0; offset < file.size; offset += CHUNK) {
    if (signal?.aborted) throw new DOMException("Hashing cancelled", "AbortError");
    const buf = new Uint8Array(await file.slice(offset, offset + CHUNK).arrayBuffer());
    hasher.update(buf);
    onProgress?.(Math.min(1, (offset + buf.length) / file.size));
  }
  if (file.size === 0) onProgress?.(1);
  return `0x${hasher.digest("hex")}` as Hex;
}

export const isSha256Hex = (v: string): v is Hex => /^0x[0-9a-fA-F]{64}$/.test(v.trim());

/** Accepts "0x…" or bare 64-char hex, as printed by `sha256sum` or `shasum -a 256`. */
export function normalizeHash(v: string): Hex | undefined {
  const t = v.trim().split(/\s+/)[0] ?? "";
  const withPrefix = t.startsWith("0x") || t.startsWith("0X") ? `0x${t.slice(2)}` : `0x${t}`;
  return isSha256Hex(withPrefix) ? (withPrefix.toLowerCase() as Hex) : undefined;
}
