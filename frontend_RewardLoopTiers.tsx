import { Sprout, Leaf, Trees } from "lucide-react";
import { cn } from "@/lib/utils";

export const TIERS = [
  { name: "Sprout", kg: 5, voucher: 100, icon: Sprout },
  { name: "Grow", kg: 20, voucher: 300, icon: Leaf },
  { name: "Impact", kg: 50, voucher: 750, icon: Trees },
];

export function ProposedPill() {
  return (
    <span
      data-testid="rewardloop-proposed-pill"
      className="inline-flex items-center rounded-full bg-orange px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
    >
      Proposed · not live
    </span>
  );
}

/** Illustrative tiers. `progressKg` (optional) shows how far a donor would be — no vouchers are issued. */
export default function RewardLoopTiers({ progressKg }: { progressKg?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3" data-testid="rewardloop-tiers">
      {TIERS.map((t) => {
        const Icon = t.icon;
        const reached = progressKg !== undefined && progressKg >= t.kg;
        const pct = progressKg === undefined ? 0 : Math.min(100, (progressKg / t.kg) * 100);
        return (
          <div
            key={t.name}
            data-testid={`rewardloop-tier-${t.name.toLowerCase()}`}
            className={cn(
              "rounded-2xl border bg-white p-5 transition-transform duration-200 hover:-translate-y-0.5",
              reached ? "border-forest-2" : "border-line",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-forest-2">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-forest-muted">Illustrative</span>
            </div>
            <p className="mt-4 font-heading text-lg font-bold text-forest">{t.name}</p>
            <p className="text-sm text-forest-muted">{t.kg} kg donated</p>
            <p className="mt-3 font-mono text-2xl font-bold text-orange">₹{t.voucher}</p>
            <p className="text-xs text-forest-muted">sponsor voucher (proposed)</p>
            {progressKg !== undefined && (
              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-cream-2">
                  <div className="h-full rounded-full bg-orange" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-forest-muted">
                  {reached ? "Milestone reached (no voucher issued — programme not live)" : `${Math.max(0, t.kg - progressKg).toFixed(1)} kg to go`}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
