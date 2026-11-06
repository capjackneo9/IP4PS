"use client";
import { useState } from "react";

/**
 * Small, dependency-free charts. Every chart is single-series (one hue, the brand primary), so identity never
 * depends on telling colours apart; each ships a hover tooltip and a table view for screen readers.
 */

export interface Point {
  label: string;
  value: number;
}

export function BarList({ data, format = (v) => String(v), caption }: { data: Point[]; format?: (v: number) => string; caption: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <ul className="space-y-2.5" aria-hidden="true">
        {data.map((d) => (
          <li key={d.label} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 text-sm" title={`${d.label}: ${format(d.value)}`}>
            <span className="truncate text-muted">{d.label}</span>
            <span className="h-3 rounded-r bg-surface-2">
              <span className="block h-3 rounded-r-[4px] bg-primary transition-[width]" style={{ width: `${(d.value / max) * 100}%`, minWidth: d.value ? 4 : 0 }} />
            </span>
            <span className="text-right font-mono text-fg">{format(d.value)}</span>
          </li>
        ))}
      </ul>
      <DataTable caption={caption} data={data} format={format} />
    </figure>
  );
}

export function LineChart({ data, caption, height = 180 }: { data: Point[]; caption: string; height?: number }) {
  const [hover, setHover] = useState<number>();
  const W = 600;
  const pad = { l: 32, r: 12, t: 12, b: 24 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 4) * 4 || 4;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (1 - v / nice) * (height - pad.t - pad.b);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const ticks = [0, nice / 2, nice];
  const h = hover !== undefined ? data[hover] : undefined;

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={caption}
        onMouseLeave={() => setHover(undefined)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{t}</text>
          </g>
        ))}
        {data.map((d, i) =>
          i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
            <text key={d.label} x={x(i)} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{d.label}</text>
          ) : null,
        )}
        <path d={`${path} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="var(--primary)" opacity="0.12" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== undefined && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} stroke="var(--line-strong)" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="5" fill="var(--primary)" stroke="var(--surface-solid)" strokeWidth="2" />
          </>
        )}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-line bg-surface-solid px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${(x(hover!) / W) * 100}%`, transform: "translateX(-50%)" }}
        >
          <p className="text-muted">{h.label}</p>
          <p className="font-mono font-semibold">{h.value} total</p>
        </div>
      )}
      <DataTable caption={caption} data={data} />
    </figure>
  );
}

function DataTable({ caption, data, format = (v: number) => String(v) }: { caption: string; data: Point[]; format?: (v: number) => string }) {
  return (
    <details className="mt-3 text-xs text-muted">
      <summary className="cursor-pointer">Table view</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-b border-line">
              <th scope="row" className="py-1 font-normal">{d.label}</th>
              <td className="py-1 text-right font-mono text-fg">{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
