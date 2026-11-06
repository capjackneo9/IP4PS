"use client";
import { LayoutGrid, List, Plus, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConnectGate } from "@/components/ConnectGate";
import { cx, EmptyState, Notice, PageHeader, Skeleton } from "@/components/ui";
import { WorkCard } from "@/components/WorkCard";
import { CONTENT_TYPES, type ContentTypeId } from "@/lib/content-types";
import { useMyWorks } from "@/lib/hooks";

const PAGE = 12;

function Library() {
  const { works, isLoading, errors, networks, refetch } = useMyWorks();
  const [type, setType] = useState<ContentTypeId | "all">("all");
  const [network, setNetwork] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest" | "title">("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = works.filter(
      (w) =>
        (type === "all" || w.type === type) &&
        (network === "all" || w.network.key === network) &&
        (!needle ||
          w.title.toLowerCase().includes(needle) ||
          w.metadata?.ip4ps.creator.name.toLowerCase().includes(needle) ||
          w.tokenId.toString() === needle.replace("#", "")),
    );
    if (sort === "oldest") list.reverse();
    if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [works, type, network, q, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="My protected IP"
        subtitle={isLoading ? "Reading the blockchain…" : `${works.length} work${works.length === 1 ? "" : "s"} across ${networks.map((n) => n.label).join(", ") || "no networks"}`}
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={refetch} aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
            <Link href="/protect" className="btn-primary">
              <Plus className="h-4 w-4" /> New item
            </Link>
          </>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by type">
        {[{ id: "all" as const, label: "All", emoji: "" }, ...CONTENT_TYPES].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={type === t.id}
            onClick={() => {
              setType(t.id);
              setShown(PAGE);
            }}
            className={cx("chip min-h-9 shrink-0 px-3", type === t.id && "border-primary bg-primary/15")}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search your IP</span>
          <Search className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-muted" />
          <input type="search" className="input pl-9" placeholder="Search by title, creator or token #" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {networks.length > 1 && (
          <select className="input sm:w-44" aria-label="Network" value={network} onChange={(e) => setNetwork(e.target.value)}>
            <option value="all">All networks</option>
            {networks.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
        )}
        <select className="input sm:w-44" aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </select>
        <div className="flex gap-1" role="group" aria-label="View">
          <button type="button" className={cx("btn-ghost w-11 px-0", view === "grid" && "border-primary")} aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => setView("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button type="button" className={cx("btn-ghost w-11 px-0", view === "list" && "border-primary")} aria-pressed={view === "list"} aria-label="List view" onClick={() => setView("list")}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {errors.length > 0 && <div className="mb-4"><Notice tone="warn" title="Some networks could not be read">{errors.join(" · ")}</Notice></div>}

      {networks.length === 0 ? (
        <EmptyState icon="⛓️" title="No registry configured">
          This deployment has no IP4PS contract address set. See the developer docs to deploy one.
        </EmptyState>
      ) : isLoading && works.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏛️" title={works.length ? "Nothing matches" : "No protected works yet"} action={!works.length && <Link href="/protect" className="btn-primary">Protect your first work</Link>}>
          {works.length ? "Try a different filter or search." : "Register a song, film, artwork or anything else to see it here."}
        </EmptyState>
      ) : (
        <>
          <div className={view === "grid" ? "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" : "space-y-3"}>
            {filtered.slice(0, shown).map((w) => <WorkCard key={w.key} work={w} view={view} />)}
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 text-sm text-muted">
            <p>Showing {Math.min(shown, filtered.length)} of {filtered.length} items</p>
            {shown < filtered.length && (
              <button type="button" className="btn-ghost" onClick={() => setShown((s) => s + PAGE)}>Load more</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <ConnectGate title="Connect your wallet to see your IP">
      <Library />
    </ConnectGate>
  );
}
