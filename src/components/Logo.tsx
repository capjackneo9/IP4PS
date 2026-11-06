export function PillarsMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ip4ps-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="0.6" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <path d="M4 9 20 3l16 6v2H4z" fill="url(#ip4ps-g)" />
      {[7, 14, 23, 30].map((x) => (
        <rect key={x} x={x} y="13" width="3.5" height="19" rx="1" fill="url(#ip4ps-g)" />
      ))}
      <rect x="3" y="33" width="34" height="4" rx="1.5" fill="url(#ip4ps-g)" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <PillarsMark />
      {!compact && (
        <span className="text-lg font-bold tracking-tight">
          IP<span className="text-gradient">4</span>PS
        </span>
      )}
    </span>
  );
}
