"use client";
import { formatEther } from "viem";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ConnectGate } from "@/components/ConnectGate";
import { EmptyState, Notice, PageHeader, Skeleton } from "@/components/ui";
import { WorkCard } from "@/components/WorkCard";
import { CONTENT_TYPES, contentType } from "@/lib/content-types";
import { abi, verifyPath, workPath } from "@/lib/contract/registry";
import { timeAgo } from "@/lib/format";
import { useMyLicensing, useMyWorks } from "@/lib/hooks";
import { useApp } from "@/lib/store";
import { useTx } from "@/lib/useTx";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const profile = useApp((s) => s.profile);
  const { works, isLoading, errors } = useMyWorks();
  const licensing = useMyLicensing();
  const { run, pending } = useTx();
  const name = profile.artistName || profile.displayName || "Artist";

  const count = (t: string) => works.filter((w) => w.type === t).length;
  const stats = [
    { label: "Total items", value: works.length },
    { label: "🎵 Music", value: count("music") },
    { label: "🎬 Film", value: count("film") },
    { label: "🎨 Art", value: count("artwork") },
    { label: "🎙️ Podcasts", value: count("podcast") },
    { label: "📱 Content & ⚙️ Custom", value: count("content") + count("custom") },
  ];

  const offers = (licensing.data ?? []).flatMap((n) => n.licenses.filter((l) => l.status === "Offered").map((l) => ({ ...l, network: n.network })));
  const pendingFees = (licensing.data ?? []).filter((n) => n.pending > 0n);

  const activity = works
    .map((w) => ({ at: w.registeredAt, text: `${w.title} registered`, href: workPath(w), emoji: contentType(w.type).emoji }))
    .slice(0, 6);

  const types = new Set(works.map((w) => w.type)).size;
  const badges = [
    { id: "first", label: "First Protection", emoji: "🛡️", earned: works.length >= 1 },
    { id: "five", label: "Prolific (5 works)", emoji: "🔥", earned: works.length >= 5 },
    { id: "multi", label: "Multi-disciplinary (3 types)", emoji: "🎭", earned: types >= 3 },
    { id: "album", label: "Full Body of Work", emoji: "💿", earned: works.some((w) => w.subtype === "album" || w.subtype === "series") },
    { id: "public", label: "Permanent (IPFS)", emoji: "🌐", earned: works.some((w) => w.metadata?.ip4ps.storage === "ipfs") },
    { id: "royal", label: "Royalties On", emoji: "👑", earned: works.some((w) => w.royaltyBps > 0) },
  ];
  const level = badges.filter((b) => b.earned).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <PageHeader
        title={`${greeting()}, ${name}`}
        subtitle={
          <>
            Your IP protection status · Level {level} of {badges.length}
            {!profile.artistName && (
              <> · <Link href="/settings" className="text-primary hover:underline">set your artist name</Link></>
            )}
          </>
        }
        actions={<Link href="/protect" className="btn-primary"><Plus className="h-4 w-4" /> New protection</Link>}
      />

      {errors.length > 0 && <Notice tone="warn" title="Some networks could not be read">{errors.join(" · ")}</Notice>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-muted">{s.label}</p>
            {isLoading ? <Skeleton className="mt-2 h-8 w-12" /> : <p className="mt-1 text-3xl font-bold">{s.value}</p>}
          </div>
        ))}
      </div>

      {(offers.length > 0 || pendingFees.length > 0) && (
        <section className="card space-y-3 border-accent/40">
          <h2 className="font-semibold">💰 Licensing</h2>
          {pendingFees.map((n) => (
            <div key={n.network.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>License fees ready on {n.network.label}: <strong>{formatEther(n.pending)} {n.network.chain.nativeCurrency.symbol}</strong></span>
              <button type="button" className="btn-gold min-h-9 px-3 text-xs" disabled={!!pending} onClick={() => run("Withdraw fees", { address: n.network.contract!, abi, functionName: "withdraw", chainId: n.network.chain.id })}>
                Withdraw
              </button>
            </div>
          ))}
          {offers.map((l) => (
            <div key={`${l.network.key}-${l.id}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>License offer #{l.id.toString()} ({l.licenseType}) for token #{l.tokenId.toString()} on {l.network.label}</span>
              <Link href={verifyPath(l.network.chain.id, l.tokenId)} className="btn-ghost min-h-9 px-3 text-xs">Review &amp; accept</Link>
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card">
          <h2 className="font-semibold">Recent activity</h2>
          {isLoading ? (
            <div className="mt-3 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : activity.length ? (
            <ol className="mt-3 space-y-3 border-l border-line pl-4">
              {activity.map((a, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" />
                  <Link href={a.href} className="hover:text-primary">{a.emoji} {a.text}</Link>
                  <p className="text-xs text-muted">{timeAgo(a.at)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted">Nothing yet — your registrations will appear here.</p>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold">Quick actions</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map((t) => (
              <Link key={t.id} href={`/protect?type=${t.id}`} className="btn-ghost justify-start">
                <span aria-hidden="true">{t.emoji}</span> New {t.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <h2 className="font-semibold">Achievements</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {badges.map((b) => (
            <div key={b.id} className={`rounded-xl border p-3 text-center ${b.earned ? "border-accent/50 bg-accent/10" : "border-line opacity-50 grayscale"}`}>
              <p className="text-2xl" aria-hidden="true">{b.emoji}</p>
              <p className="mt-1 text-xs font-medium">{b.label}</p>
              <p className="sr-only">{b.earned ? "Earned" : "Not earned yet"}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Latest works</h2>
          <Link href="/library" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[3/4]" />)}</div>
        ) : works.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{works.slice(0, 4).map((w) => <WorkCard key={w.key} work={w} />)}</div>
        ) : (
          <EmptyState icon="🏛️" title="Protect your first work" action={<Link href="/protect" className="btn-primary">Start now</Link>}>
            It takes a couple of minutes and one wallet confirmation.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ConnectGate>
      <Dashboard />
    </ConnectGate>
  );
}
