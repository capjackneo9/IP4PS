import type { Address, Hex } from "viem";
import type { ContentTypeId } from "./content-types";

export type StorageMode = "fingerprint" | "ipfs";

export interface MetadataFile {
  role: string;
  name: string;
  size: number;
  mime: string;
  sha256: Hex;
  cid?: string;
  item?: number;
}

export interface IP4PSMetadata {
  name: string;
  description: string;
  image?: string;
  external_url?: string;
  attributes: { trait_type: string; value: string | number }[];
  ip4ps: {
    version: 1;
    type: ContentTypeId;
    subtype: string;
    details: Record<string, string>;
    items?: Record<string, string>[];
    credits?: { role: string; name: string; wallet?: string }[];
    customFields?: { key: string; value: string }[];
    creator: {
      name: string;
      wallet: Address;
      socials?: Record<string, string>;
    };
    files: MetadataFile[];
    storage: StorageMode;
    createdWith: string;
  };
}

function utf8ToBase64(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function base64ToUtf8(b64: string) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export const toDataUri = (m: IP4PSMetadata) => `data:application/json;base64,${utf8ToBase64(JSON.stringify(m))}`;

export const IPFS_GATEWAYS = [
  process.env.NEXT_PUBLIC_IPFS_GATEWAY,
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
].filter(Boolean) as string[];

export const ipfsCid = (uri?: string) => (uri?.startsWith("ipfs://") ? uri.slice(7).replace(/^ipfs\//, "") : undefined);
export const gatewayUrl = (uriOrCid: string, gateway = IPFS_GATEWAYS[0]) =>
  `${gateway.replace(/\/?$/, "/")}${ipfsCid(uriOrCid) ?? uriOrCid}`;

/** Resolves a token URI (data:, ipfs:// or https://) to its metadata, trying each IPFS gateway in turn. */
export async function fetchMetadata(uri: string, signal?: AbortSignal): Promise<IP4PSMetadata | undefined> {
  if (!uri) return undefined;
  if (uri.startsWith("data:")) {
    const [head, body = ""] = uri.split(",", 2);
    const json = head.endsWith(";base64") ? base64ToUtf8(body) : decodeURIComponent(body);
    return JSON.parse(json);
  }
  const urls = uri.startsWith("ipfs://") ? IPFS_GATEWAYS.map((g) => gatewayUrl(uri, g)) : [uri];
  let lastError: unknown;
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal });
      if (res.ok) return (await res.json()) as IP4PSMetadata;
      lastError = new Error(`${res.status} from ${url}`);
    } catch (e) {
      if (signal?.aborted) throw e;
      lastError = e;
    }
  }
  throw lastError ?? new Error("Metadata unavailable");
}

export function previewImage(m?: IP4PSMetadata) {
  if (!m?.image) return undefined;
  return m.image.startsWith("ipfs://") ? gatewayUrl(m.image) : m.image;
}
