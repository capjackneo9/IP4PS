import type { Address } from "viem";
import { AUTH_HEADER, AUTH_TTL_MS, storageAuthMessage } from "./storage-auth";

export interface StorageStatus {
  configured: boolean;
  provider: string;
  maxFileBytes: number;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const res = await fetch("/api/ipfs/status", { cache: "no-store" });
  if (!res.ok) return { configured: false, provider: "Pinata", maxFileBytes: 0 };
  return res.json();
}

type Signer = (args: { message: string }) => Promise<string>;

const key = (a: Address) => `ip4ps:storage-auth:${a.toLowerCase()}`;

/** One wallet signature (not a transaction) covers an hour of uploads. */
export async function storageAuth(address: Address, sign: Signer): Promise<string> {
  try {
    const cached = sessionStorage.getItem(key(address));
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - Date.parse(parsed.issuedAt) < AUTH_TTL_MS - 5 * 60_000) return cached;
    }
  } catch {
    /* storage unavailable — sign fresh */
  }
  const issuedAt = new Date().toISOString();
  const signature = await sign({ message: storageAuthMessage(address, issuedAt) });
  const value = JSON.stringify({ address, issuedAt, signature });
  try {
    sessionStorage.setItem(key(address), value);
  } catch {
    /* ignore */
  }
  return value;
}

async function errorText(res: Response) {
  try {
    const j = await res.json();
    return j.error ?? `${res.status}`;
  } catch {
    return `${res.status}`;
  }
}

/** Uploads straight from the browser to Pinata through a one-time signed URL. Resolves to the CID. */
export async function uploadFile(file: File, auth: string, onProgress?: (fraction: number) => void): Promise<string> {
  const signRes = await fetch("/api/ipfs/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json", [AUTH_HEADER]: auth },
    body: JSON.stringify({ filename: file.name, size: file.size }),
  });
  if (!signRes.ok) throw new Error(await errorText(signRes));
  const { url } = (await signRes.json()) as { url: string };

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("network", "public");
    form.append("file", file, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onerror = () => reject(new Error(`Upload of ${file.name} failed (network).`));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(`Upload of ${file.name} failed (${xhr.status}).`));
      try {
        const body = JSON.parse(xhr.responseText);
        const cid = body?.data?.cid ?? body?.cid ?? body?.IpfsHash;
        if (!cid) throw new Error("no CID");
        onProgress?.(1);
        resolve(cid);
      } catch {
        reject(new Error(`Pinata did not return a CID for ${file.name}.`));
      }
    };
    xhr.send(form);
  });
}

export async function pinMetadata(content: object, name: string, auth: string): Promise<string> {
  const res = await fetch("/api/ipfs/json", {
    method: "POST",
    headers: { "Content-Type": "application/json", [AUTH_HEADER]: auth },
    body: JSON.stringify({ name, content }),
  });
  if (!res.ok) throw new Error(await errorText(res));
  return ((await res.json()) as { cid: string }).cid;
}
