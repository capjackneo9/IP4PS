"use client";
import { networkById } from "@/lib/chains";
import { WorkView } from "./WorkView";

export function WorkRoute({ chainId, tokenId, mode }: { chainId: string; tokenId: string; mode: "owner" | "public" }) {
  const id = /^\d+$/.test(tokenId) ? BigInt(tokenId) : undefined;
  return <WorkView network={networkById(Number(chainId))} tokenId={id} mode={mode} />;
}
