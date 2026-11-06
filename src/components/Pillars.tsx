"use client";
import { motion } from "motion/react";
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { PILLARS, type PillarId } from "@/lib/pillars";
import { cx } from "./ui";

/** Animated four-pillar temple used on the landing page. */
export function PillarsVisual({ active = 4 }: { active?: number }) {
  return (
    <div className="relative mx-auto w-full max-w-md select-none" aria-hidden="true">
      <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="mx-auto h-0 w-0 border-x-[11rem] border-b-[3.5rem] border-x-transparent border-b-primary/70 sm:border-x-[13rem]"
        style={{ filter: "drop-shadow(0 0 24px var(--glow))" }}
      />
      <div className="mx-auto -mt-px h-3 w-[22rem] rounded-sm bg-gradient-to-r from-primary via-secondary to-accent sm:w-[26rem]" />
      <div className="mx-auto flex w-[20rem] justify-between px-3 sm:w-[24rem]">
        {PILLARS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: i < active ? 1 : 0.25 }}
            transition={{ duration: 0.7, delay: 0.15 * i, ease: "easeOut" }}
            style={{ transformOrigin: "bottom" }}
            className="flex flex-col items-center"
          >
            <div
              className="relative h-44 w-12 rounded-md sm:h-52 sm:w-14"
              style={{
                background: `linear-gradient(180deg, ${p.color}, ${p.color}55)`,
                boxShadow: `0 0 28px ${p.color}66, inset 0 0 0 1px rgb(255 255 255 / 0.15)`,
              }}
            >
              {[0.2, 0.4, 0.6, 0.8].map((x) => (
                <span key={x} className="absolute top-2 bottom-2 w-px bg-white/20" style={{ left: `${x * 100}%` }} />
              ))}
              <motion.span
                className="absolute inset-x-0 top-0 h-10 rounded-md bg-white/25"
                animate={{ y: [0, 140, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
              />
            </div>
            <span className="mt-2 text-xs font-semibold text-muted">P{p.n}</span>
          </motion.div>
        ))}
      </div>
      <div className="mx-auto mt-1 h-4 w-[24rem] rounded-sm bg-gradient-to-r from-primary/80 via-secondary/80 to-accent/80 sm:w-[28rem]" />
    </div>
  );
}

export type PillarState = boolean | "pending" | undefined;

export function PillarGrid({
  status,
  details,
  compact,
}: {
  status: Partial<Record<PillarId, PillarState>>;
  details?: Partial<Record<PillarId, ReactNode>>;
  compact?: boolean;
}) {
  return (
    <div className={cx("grid gap-3", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
      {PILLARS.map((p) => {
        const s = status[p.id];
        return (
          <div key={p.id} className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">
                {p.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">
                    P{p.n}: {p.name}
                  </p>
                  {s === true ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="Verified" />
                  ) : s === false ? (
                    <XCircle className="h-5 w-5 shrink-0 text-danger" aria-label="Not verified" />
                  ) : (
                    <CircleDashed className="h-5 w-5 shrink-0 animate-spin text-muted [animation-duration:3s]" aria-label="Pending" />
                  )}
                </div>
                <p className="text-xs text-muted">{p.tech}</p>
                {!compact && <div className="mt-2 text-sm text-fg/85">{details?.[p.id] ?? p.summary}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
