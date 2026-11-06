"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PILLARS } from "@/lib/pillars";
import { cx } from "../ui";

export function PillarExplorer() {
  const [active, setActive] = useState(0);
  const p = PILLARS[active];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="grid grid-cols-2 gap-3" role="tablist" aria-label="The four pillars">
        {PILLARS.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            className={cx("card text-left transition hover:scale-[1.02]")}
            style={i === active ? { boxShadow: `0 0 32px ${x.color}44`, borderColor: x.color } : undefined}
          >
            <span className="text-3xl" aria-hidden="true">
              {x.emoji}
            </span>
            <p className="mt-2 text-xs font-semibold text-muted">P{x.n}</p>
            <p className="font-bold">{x.name}</p>
            <p className="text-xs text-muted">{x.tech}</p>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={p.id}
          role="tabpanel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="card flex flex-col justify-center"
        >
          <p className="text-sm font-semibold" style={{ color: p.color }}>
            Pillar {p.n} · {p.tech}
          </p>
          <h3 className="mt-1 text-3xl font-bold">{p.name}</h3>
          <p className="mt-3 text-muted">{p.summary}</p>
          <ul className="mt-4 space-y-2">
            {p.points.map((pt) => (
              <li key={pt} className="flex gap-2 text-sm">
                <span style={{ color: p.color }} aria-hidden="true">
                  ◆
                </span>{" "}
                {pt}
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
