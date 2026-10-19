import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; cls: string }> = {
  available: { label: "Available", cls: "bg-mint text-[#134E2E] border-[#B7DCC1]" },
  matched: { label: "Matched", cls: "bg-[#FFF1E6] text-[#9A3412] border-[#FBC9A3]" },
  collected: { label: "Collected", cls: "bg-[#E6EEF8] text-[#1E3A5F] border-[#BCD0E8]" },
  distributed: { label: "Distributed", cls: "bg-forest-2 text-white border-forest-2" },
  expired: { label: "Expired", cls: "bg-[#F1EEE8] text-[#6B6458] border-line-strong" },
  pending: { label: "Pending", cls: "bg-[#FEF7E0] text-[#854D0E] border-[#F3DE9B]" },
  accepted: { label: "Accepted", cls: "bg-[#FFF1E6] text-[#9A3412] border-[#FBC9A3]" },
  declined: { label: "Declined", cls: "bg-[#FDECEC] text-[#991B1B] border-[#F5C2C2]" },
  cancelled: { label: "Cancelled", cls: "bg-[#F1EEE8] text-[#6B6458] border-line-strong" },
  superseded: { label: "Closed", cls: "bg-[#F1EEE8] text-[#6B6458] border-line-strong" },
  verified: { label: "Verified", cls: "bg-mint text-[#134E2E] border-[#B7DCC1]" },
  rejected: { label: "Rejected", cls: "bg-[#FDECEC] text-[#991B1B] border-[#F5C2C2]" },
};

export default function StatusBadge({ status, testId }: { status: string; testId?: string }) {
  const s = STYLES[status] ?? { label: status, cls: "bg-cream-2 text-forest border-line" };
  return (
    <span
      data-testid={testId ?? "status-badge"}
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        s.cls,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-line-strong bg-cream-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-forest-muted">
      Demo
    </span>
  );
}
