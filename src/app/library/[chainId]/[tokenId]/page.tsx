import { WorkRoute } from "@/components/work/WorkRoute";

export const metadata = { title: "Protected work" };

export default async function WorkPage({ params }: { params: Promise<{ chainId: string; tokenId: string }> }) {
  const { chainId, tokenId } = await params;
  return <WorkRoute chainId={chainId} tokenId={tokenId} mode="owner" />;
}
