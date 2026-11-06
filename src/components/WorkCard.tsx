"use client";
import { CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { contentType } from "@/lib/content-types";
import { workPath, type Work } from "@/lib/contract/registry";
import { timeAgo } from "@/lib/format";
import { previewImage } from "@/lib/metadata";
import { cx } from "./ui";

export function WorkThumb({ work, className }: { work: Work; className?: string }) {
  const img = previewImage(work.metadata);
  const def = contentType(work.type);
  return (
    <div className={cx("relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/25 via-secondary/15 to-accent/15", className)}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="text-5xl" aria-hidden="true">{def.emoji}</span>
      )}
    </div>
  );
}

export function WorkCard({ work, view = "grid" }: { work: Work; view?: "grid" | "list" }) {
  const def = contentType(work.type);
  const sub = def.subtypes.find((s) => s.id === work.subtype)?.label ?? work.subtype;
  if (view === "list")
    return (
      <Link href={workPath(work)} className="card flex items-center gap-4 p-3 transition hover:border-primary/50">
        <WorkThumb work={work} className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{work.title}</p>
          <p className="text-xs text-muted">
            {def.label} · {sub} · {work.network.label}
          </p>
        </div>
        <div className="hidden text-right text-xs sm:block">
          <p className="font-mono">Token #{work.tokenId.toString()}</p>
          <p className="text-muted">{timeAgo(work.registeredAt)}</p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted" aria-hidden="true" />
      </Link>
    );
  return (
    <Link href={workPath(work)} className="card group flex flex-col gap-3 p-3 transition hover:-translate-y-1 hover:border-primary/50">
      <WorkThumb work={work} className="aspect-square w-full" />
      <div className="min-w-0 px-1">
        <p className="truncate font-semibold">{work.title}</p>
        <p className="text-xs text-muted">
          {def.emoji} {def.label} · {sub}
        </p>
        <p className="mt-2 flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> 4 Pillars
        </p>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span className="font-mono">#{work.tokenId.toString()} · {work.network.label}</span>
          <span>{timeAgo(work.registeredAt)}</span>
        </div>
      </div>
    </Link>
  );
}
