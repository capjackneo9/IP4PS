"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatEther } from "viem";
import { BarList, LineChart } from "@/components/charts";
import { ConnectGate } from "@/components/ConnectGate";
import { EmptyState, Notice, PageHeader, Skeleton } from "@/components/ui";
import { CONTENT_TYPES } from "@/lib/content-types";
import { clientFor, fetchRegistrationTx, fetchTokenLicenses, nativeUsdPrice, workPath, type LicenseInfo, type Work } from "@/lib/contract/registry";
import { useMyWorks } from "@/lib/hooks";

const MAX_RECEIPTS = 40;

/** Gas actually paid for each registration, and every license on each work. Read from the chain, nothing tracked. */
function useChainStats(works: Work[]) {
  return useQuery({
    queryKey: ["chain-stats", works.map((w) => w.key).join()],
    enabled: works.length > 0,
    queryFn: async () => {
      const gas = new Map<string, { native: number; usd?: number }>();
      const prices = new Map<number, number | undefined>();
      for (const w of works.slice(0, MAX_RECEIPTS)) {
        try {
          const hash = await fetchRegistrationTx(w.network, w.tokenId, w.blockNumber);
          if (!hash) continue;
          const r = await clientFor(w.network).getTransactionReceipt({ hash });
          if (!prices.has(w.network.chain.id)) prices.set(w.network.chain.id, await nativeUsdPrice(w.network));
          const native = Number(formatEther(r.gasUsed * r.effectiveGasPrice));
          const price = prices.get(w.network.chain.id);
          gas.set(w.key, { native, usd: price ? native * price : undefined });
        } catch {
          /* skip unreadable receipts */
        }
      }
      const licenses = new Map<string, LicenseInfo[]>();
      await Promise.all(works.map(async (w) => licenses.set(w.key, await fetchTokenLicenses(w.network, w.tokenId).catch(() => []))));
      return { gas, licenses };
    },
  });
}

function Analytics() {
  const { works, isLoading } = useMyWorks();
  const stats = useChainStats(works);
  const now = Date.now();
  const last30 = works.filter((w) => now - w.registeredAt.getTime() < 30 * 86400_000);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (11 - i));
    return d;
  });
  const growth = months.map((m) => {
    const end = new Date(m.getFullYear(), m.getMonth() + 1, 1).getTime();
    return { label: m.toLocaleString(undefined, { month: "short" }), value: works.filter((w) => w.registeredAt.getTime() < end).length };
  });

  const byType = CONTENT_TYPES.map((t) => ({ label: `${t.emoji} ${t.label}`, value: works.filter((w) => w.type === t.id).length })).sort((a, b) => b.value - a.value);
  const nets = [...new Set(works.map((w) => w.network.label))].map((label) => ({ label, value: works.filter((w) => w.network.label === label).length })).sort((a, b) => b.value - a.value);
  const pct = (v: number) => (works.length ? `${Math.round((v / works.length) * 100)}%` : "0%");

  const gasValues = [...(stats.data?.gas.values() ?? [])];
  const gasUsd = gasValues.reduce((a, g) => a + (g.usd ?? 0), 0);
  const allLicenses = [...(stats.data?.licenses.values() ?? [])].flat();
  const activeLicenses = allLicenses.filter((l) => l.active).length;
  const everActivated = allLicenses.filter((l) => l.startsAt).length;
  const mostLicensed = works
    .map((w) => ({ w, n: stats.data?.licenses.get(w.key)?.length ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  if (isLoading)
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <PageHeader title="IP analytics & insights" subtitle="Calculated live from your on-chain records." />
      {works.length === 0 ? (
        <EmptyState icon="📊" title="No data yet" action={<Link href="/protect" className="btn-primary">Protect your first work</Link>}>
          Analytics appear once you have registered works.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["New items (30 days)", String(last30.length)],
              ["Total protected", String(works.length)],
              ["Active licenses", stats.isLoading ? "…" : String(activeLicenses)],
              ["Gas spent", stats.isLoading ? "…" : gasUsd ? `$${gasUsd.toFixed(gasUsd < 1 ? 3 : 2)}` : `${gasValues.reduce((a, g) => a + g.native, 0).toPrecision(3)} native`],
            ].map(([label, value]) => (
              <div key={label} className="card p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          <section className="card">
            <h2 className="font-semibold">Protection growth</h2>
            <p className="mb-3 text-xs text-muted">Total protected works, last 12 months</p>
            <LineChart data={growth} caption="Total protected works by month" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card">
              <h2 className="mb-4 font-semibold">Content type distribution</h2>
              <BarList data={byType} caption="Works by content type" format={(v) => pct(v)} />
            </section>
            <section className="card">
              <h2 className="mb-4 font-semibold">Network distribution</h2>
              <BarList data={nets} caption="Works by network" format={(v) => pct(v)} />
            </section>
          </div>

          <section className="card">
            <h2 className="font-semibold">Most licensed works</h2>
            {mostLicensed.length ? (
              <ol className="mt-3 space-y-2 text-sm">
                {mostLicensed.map(({ w, n }, i) => (
                  <li key={w.key}>
                    {i + 1}. <Link href={workPath(w)} className="hover:text-primary">{w.title}</Link> — {n} license{n === 1 ? "" : "s"}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-muted">No licenses yet. Create one from any work&apos;s page.</p>
            )}
            {everActivated > 0 && <p className="mt-3 text-xs text-muted">{everActivated} license{everActivated === 1 ? "" : "s"} activated so far.</p>}
          </section>

          {works.length > MAX_RECEIPTS && <Notice>Gas totals cover your {MAX_RECEIPTS} most recent registrations.</Notice>}
          <p className="text-xs text-muted">Page views are not tracked: IP4PS keeps no analytics on who opens your verification pages.</p>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ConnectGate>
      <Analytics />
    </ConnectGate>
  );
}
