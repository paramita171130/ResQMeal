import type { ScoreReason } from "@/lib/types";

export function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(#1E5438 ${pct * 3.6}deg, #E5DEC9 0deg)` }}
      data-testid="rescue-iq-score-badge"
      aria-label={`RescueIQ score ${pct} out of 100`}
    >
      <div className="grid h-11 w-11 place-items-center rounded-full bg-white font-mono text-sm font-bold text-forest">
        {Math.round(pct)}
      </div>
    </div>
  );
}

export default function RescueIQBreakdown({ reasons }: { reasons: ScoreReason[] }) {
  return (
    <ul className="space-y-2.5" data-testid="rescue-iq-breakdown">
      {reasons.map((r) => (
        <li key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-forest">{r.label}</p>
            <p className="text-xs text-forest-muted">{r.detail}</p>
          </div>
          <span className="font-mono text-xs font-semibold text-forest">
            +{r.points}
            <span className="text-forest-muted">/{r.max_points}</span>
          </span>
          <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-cream-2">
            <div
              className="h-full rounded-full bg-forest-2"
              style={{ width: `${(r.points / r.max_points) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
