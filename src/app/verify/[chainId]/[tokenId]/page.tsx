import type { Metadata } from "next";
import { WorkRoute } from "@/components/work/WorkRoute";

export async function generateMetadata({ params }: { params: Promise<{ tokenId: string }> }): Promise<Metadata> {
  const { tokenId } = await params;
  return {
    title: `Verify IP #${tokenId}`,
    description: "Public, blockchain-backed proof of ownership verified with the IP4PS 4 Pillars System.",
  };
}

export default async function PublicVerifyPage({ params }: { params: Promise<{ chainId: string; tokenId: string }> }) {
  const { chainId, tokenId } = await params;
  return <WorkRoute chainId={chainId} tokenId={tokenId} mode="public" />;
}
