"use client";
import { getPublicClient } from "wagmi/actions";
import { formatUnits, type Address, type Hex, type PublicClient } from "viem";
import { networkById, type NetworkInfo } from "../chains";
import { kindFromIndex, type ContentTypeId } from "../content-types";
import { fetchMetadata, type IP4PSMetadata } from "../metadata";
import { wagmiConfig } from "../wagmi";
import { ip4psRegistryAbi } from "./abi";

export const abi = ip4psRegistryAbi;

export interface Work {
  key: string;
  network: NetworkInfo;
  contract: Address;
  tokenId: bigint;
  creator: Address;
  owner: Address;
  type: ContentTypeId;
  subtype: string;
  title: string;
  metadataURI: string;
  contentHash: Hex;
  fileHashes: Hex[];
  royaltyBps: number;
  registeredAt: Date;
  blockNumber: bigint;
  metadata?: IP4PSMetadata;
  metadataError?: string;
}

export interface PillarStatus {
  synergy: boolean;
  time: boolean;
  elements: boolean;
  celestialBodies: boolean;
}

export const LICENSE_STATUS = ["None", "Offered", "Active", "Revoked"] as const;
export interface LicenseInfo {
  id: bigint;
  tokenId: bigint;
  licensor: Address;
  licensee: Address;
  durationDays: bigint;
  startsAt?: Date;
  expiresAt?: Date;
  perpetual: boolean;
  fee: bigint;
  status: (typeof LICENSE_STATUS)[number];
  active: boolean;
  licenseType: string;
  termsURI: string;
}

export function clientFor(n: NetworkInfo): PublicClient {
  const c = getPublicClient(wagmiConfig, { chainId: n.chain.id as never });
  if (!c) throw new Error(`No RPC client for ${n.label}`);
  return c as PublicClient;
}

function need(n: NetworkInfo): Address {
  if (!n.contract) throw new Error(`IP4PS is not deployed on ${n.label} yet.`);
  return n.contract;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([p, new Promise<T>((_, rej) => (t = setTimeout(() => rej(new Error("Timed out")), ms)))]).finally(() =>
    clearTimeout(t),
  );
}

export async function fetchWork(n: NetworkInfo, tokenId: bigint, opts: { metadata?: boolean } = {}): Promise<Work> {
  const contract = need(n);
  const client = clientFor(n);
  const [record, fileHashes, owner] = await client.readContract({ address: contract, abi, functionName: "getIP", args: [tokenId] });
  const work: Work = {
    key: `${n.chain.id}:${tokenId}`,
    network: n,
    contract,
    tokenId,
    creator: record.creator,
    owner,
    type: kindFromIndex(record.kind),
    subtype: record.subtype,
    title: record.title,
    metadataURI: record.metadataURI,
    contentHash: record.contentHash,
    fileHashes: [...fileHashes],
    royaltyBps: Number(record.royaltyBps),
    registeredAt: new Date(Number(record.registeredAt) * 1000),
    blockNumber: record.blockNumber,
  };
  if (opts.metadata !== false && record.metadataURI) {
    try {
      work.metadata = await withTimeout(fetchMetadata(record.metadataURI), 12_000);
    } catch (e) {
      work.metadataError = e instanceof Error ? e.message : "Metadata unavailable";
    }
  }
  return work;
}

export async function fetchOwnedWorks(n: NetworkInfo, owner: Address): Promise<Work[]> {
  const contract = need(n);
  const ids = await clientFor(n).readContract({ address: contract, abi, functionName: "tokensOfOwner", args: [owner] });
  const works = await Promise.all(ids.map((id) => fetchWork(n, id)));
  return works.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
}

export async function fetchPillars(n: NetworkInfo, tokenId: bigint): Promise<PillarStatus> {
  const [synergy, time, elements, celestialBodies] = await clientFor(n).readContract({
    address: need(n),
    abi,
    functionName: "verifyFourPillars",
    args: [tokenId],
  });
  return { synergy, time, elements, celestialBodies };
}

export async function lookupHash(n: NetworkInfo, hash: Hex): Promise<bigint> {
  return clientFor(n).readContract({ address: need(n), abi, functionName: "tokenOfHash", args: [hash] });
}

export async function lookupHashes(n: NetworkInfo, hashes: Hex[]) {
  return Promise.all(hashes.map(async (h) => ({ hash: h, tokenId: await lookupHash(n, h) })));
}

async function readLicense(n: NetworkInfo, id: bigint): Promise<LicenseInfo> {
  const client = clientFor(n);
  const contract = need(n);
  const [l, active] = await Promise.all([
    client.readContract({ address: contract, abi, functionName: "getLicense", args: [id] }),
    client.readContract({ address: contract, abi, functionName: "isLicenseActive", args: [id] }),
  ]);
  const perpetual = l.expiresAt === 2n ** 64n - 1n;
  return {
    id,
    tokenId: l.tokenId,
    licensor: l.licensor,
    licensee: l.licensee,
    durationDays: l.durationDays,
    startsAt: l.startsAt > 0n ? new Date(Number(l.startsAt) * 1000) : undefined,
    expiresAt: l.expiresAt > 0n && !perpetual ? new Date(Number(l.expiresAt) * 1000) : undefined,
    perpetual: l.durationDays === 0n,
    fee: l.fee,
    status: LICENSE_STATUS[l.status] ?? "None",
    active,
    licenseType: l.licenseType,
    termsURI: l.termsURI,
  };
}

export async function fetchTokenLicenses(n: NetworkInfo, tokenId: bigint) {
  const ids = await clientFor(n).readContract({ address: need(n), abi, functionName: "licensesOfToken", args: [tokenId] });
  return Promise.all(ids.map((id) => readLicense(n, id)));
}

export async function fetchLicenseeLicenses(n: NetworkInfo, licensee: Address) {
  const ids = await clientFor(n).readContract({ address: need(n), abi, functionName: "licensesOfLicensee", args: [licensee] });
  return Promise.all(ids.map((id) => readLicense(n, id)));
}

export async function fetchPendingWithdrawal(n: NetworkInfo, account: Address) {
  return clientFor(n).readContract({ address: need(n), abi, functionName: "pendingWithdrawals", args: [account] });
}

/** Finds the registration transaction from the block the contract recorded, so no wide log scan is needed. */
export async function fetchRegistrationTx(n: NetworkInfo, tokenId: bigint, blockNumber: bigint) {
  const logs = await clientFor(n).getContractEvents({
    address: need(n),
    abi,
    eventName: "IPRegistered",
    args: { tokenId },
    fromBlock: blockNumber,
    toBlock: blockNumber,
  });
  return logs[0]?.transactionHash;
}

const feedAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

/** Native token price in USD from the network's Chainlink feed (mainnets only). */
export async function nativeUsdPrice(n: NetworkInfo): Promise<number | undefined> {
  if (!n.usdFeed) return undefined;
  try {
    const [, answer] = await clientFor(n).readContract({ address: n.usdFeed, abi: feedAbi, functionName: "latestRoundData" });
    return Number(formatUnits(answer, 8));
  } catch {
    return undefined;
  }
}

export const workPath = (w: Pick<Work, "network" | "tokenId">) => `/library/${w.network.chain.id}/${w.tokenId}`;
export const verifyPath = (chainId: number, tokenId: bigint | string) => `/verify/${chainId}/${tokenId}`;
export const networkForChainParam = (p: string) => networkById(Number(p));
