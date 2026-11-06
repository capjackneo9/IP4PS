import "server-only";
import { isAddress, verifyMessage, type Address, type Hex } from "viem";
import { AUTH_TTL_MS, storageAuthMessage } from "../storage-auth";

const env = () => ({
  jwt: process.env.PINATA_JWT,
  uploadBase: (process.env.PINATA_UPLOAD_BASE ?? "https://uploads.pinata.cloud").replace(/\/$/, ""),
  apiBase: (process.env.PINATA_API_BASE ?? "https://api.pinata.cloud").replace(/\/$/, ""),
  allowlist: (process.env.IPFS_ALLOWED_ADDRESSES ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean),
});

export const storageConfigured = () => !!env().jwt;
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Checks the wallet signature the browser sends with every storage request. */
export async function requireWallet(header: string | null): Promise<Address> {
  if (!header) throw new HttpError(401, "Sign the storage authorization with your wallet first.");
  let parsed: { address?: string; issuedAt?: string; signature?: string };
  try {
    parsed = JSON.parse(header);
  } catch {
    throw new HttpError(401, "Malformed authorization.");
  }
  const { address, issuedAt, signature } = parsed;
  if (!address || !isAddress(address) || !issuedAt || !signature) throw new HttpError(401, "Incomplete authorization.");
  const issued = Date.parse(issuedAt);
  const now = Date.now();
  if (!Number.isFinite(issued) || issued > now + 5 * 60_000 || now - issued > AUTH_TTL_MS)
    throw new HttpError(401, "Authorization expired. Sign again.");
  const ok = await verifyMessage({
    address,
    message: storageAuthMessage(address, issuedAt),
    signature: signature as Hex,
  }).catch(() => false);
  if (!ok) throw new HttpError(401, "Signature does not match the wallet.");
  const { allowlist } = env();
  if (allowlist.length && !allowlist.includes(address.toLowerCase()))
    throw new HttpError(403, "This wallet is not allowed to upload on this deployment.");
  return address;
}

// Simple fixed-window limiter. Per instance only; put a shared limiter in front for multi-instance hosting.
const windows = new Map<string, { start: number; count: number }>();
export function rateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now - w.start > windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 10_000) for (const [k, v] of windows) if (now - v.start > windowMs) windows.delete(k);
    return;
  }
  if (++w.count > limit) throw new HttpError(429, "Too many requests. Wait a minute and try again.");
}

/** A one-time URL the browser uploads one file to directly, so large files never pass through this server. */
export async function signedUploadUrl(opts: { filename: string; size: number; wallet: Address }) {
  const { jwt, uploadBase } = env();
  if (!jwt) throw new HttpError(503, "IPFS storage is not configured on this deployment.");
  if (opts.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "Files are limited to 500 MB.");
  const res = await fetch(`${uploadBase}/v3/files/sign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      network: "public",
      date: Math.floor(Date.now() / 1000),
      expires: 3600,
      filename: opts.filename.slice(0, 200),
      max_file_size: opts.size + 1024,
      keyvalues: { app: "ip4ps", wallet: opts.wallet.toLowerCase() },
    }),
  });
  if (!res.ok) throw new HttpError(502, `Pinata refused the upload (${res.status}).`);
  const body = (await res.json()) as { data?: string };
  if (!body.data) throw new HttpError(502, "Pinata did not return an upload URL.");
  return body.data;
}

export async function pinJson(content: unknown, name: string, wallet: Address) {
  const { jwt, apiBase } = env();
  if (!jwt) throw new HttpError(503, "IPFS storage is not configured on this deployment.");
  const res = await fetch(`${apiBase}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      pinataContent: content,
      pinataMetadata: { name: name.slice(0, 200), keyvalues: { app: "ip4ps", wallet: wallet.toLowerCase() } },
    }),
  });
  if (!res.ok) throw new HttpError(502, `Pinata refused the metadata (${res.status}).`);
  const body = (await res.json()) as { IpfsHash?: string };
  if (!body.IpfsHash) throw new HttpError(502, "Pinata did not return a CID.");
  return body.IpfsHash;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Storage request failed." }, { status: 500 });
}
