import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Clock, MapPin, Plus, Search } from "lucide-react";
import { PageShell, RequireRole } from "@/components/layout/PageShell";
import StatusBadge, { DemoBadge } from "@/components/StatusBadge";
import DonationForm from "@/components/DonationForm";
import DeleteDonationButton from "@/components/DeleteDonationButton";
import RewardLoopTiers, { ProposedPill } from "@/components/rewards/RewardLoopTiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet } from "@/lib/api";
import { CATEGORY_LABELS, errorMessage, formatDeadline, kg, timeLeftLabel } from "@/lib/app";
import type { Donation, DonorStats, User } from "@/lib/types";

const FILTERS: Record<string, string> = {
  all: "All statuses",
  available: "Available",
  expired: "Expired",
  matched: "Matched",
  collected: "Collected",
  distributed: "Distributed",
};

export const displayStatus = (d: Donation) => (d.expired ? "expired" : d.status);

function Stat({ label, value, hint, testid }: { label: string; value: string; hint?: string; testid: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5" data-testid={testid}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-muted">{label}</p>
      <p className="mt-2 font-mono text-3xl font-bold text-forest">{value}</p>
      {hint && <p className="mt-1 text-xs text-forest-muted">{hint}</p>}
    </div>
  );
}

function DonorView({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const donations = useQuery({ queryKey: ["donations"], queryFn: () => apiGet<Donation[]>("/donations") });
  const stats = useQuery({ queryKey: ["donor-stats"], queryFn: () => apiGet<DonorStats>("/stats/me") });

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (donations.data ?? []).filter(
      (d) =>
        (status === "all" || displayStatus(d) === status) &&
        (!term || `${d.food_item} ${d.pickup_area} ${d.pickup_city} ${CATEGORY_LABELS[d.category]}`.toLowerCase().includes(term)),
    );
  }, [donations.data, q, status]);

  const s = stats.data;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Donor dashboard</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl" data-testid="donor-dashboard-title">
            {user.org_name}
          </h1>
          {user.is_demo && <p className="mt-1 text-sm text-forest-muted"><DemoBadge /> This is a demo account with sample records.</p>}
        </div>
        <Button size="lg" className="h-11 bg-orange text-white hover:bg-orange-dark" onClick={() => setOpen(true)} data-testid="new-donation-button">
          <Plus aria-hidden /> Donate food
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat testid="stat-active" label="Active" value={s ? String(s.active) : "—"} hint={s ? `${s.expired} expired` : undefined} />
        <Stat testid="stat-matched" label="Matched" value={s ? String(s.matched) : "—"} hint="Awaiting collection" />
        <Stat testid="stat-completed" label="Collected / distributed" value={s ? `${s.collected} / ${s.distributed}` : "—"} hint="Confirmed by recipients" />
        <Stat testid="stat-kg" label="kg listed · redistributed" value={s ? `${s.kg_listed} · ${s.kg_redistributed}` : "—"} hint="Redistributed = confirmed distributed" />
      </div>

      <section className="mt-10" aria-labelledby="donations-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="donations-title" className="font-heading text-xl font-bold">Your donations</h2>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-muted" aria-hidden />
              <Input aria-label="Search donations" placeholder="Search food or area" className="h-10 bg-white pl-9" value={q} onChange={(e) => setQ(e.target.value)} data-testid="donation-search-input" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 w-40 bg-white" aria-label="Filter by status" data-testid="donation-status-filter">
                <SelectValue>{(v) => FILTERS[v as string]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FILTERS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-3" data-testid="donation-list">
          {donations.isLoading && [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-cream-2" />)}
          {donations.isError && (
            <p className="rounded-2xl border border-line bg-white p-6 text-sm text-destructive" role="alert">{errorMessage(donations.error, "Could not load donations.")}</p>
          )}
          {donations.data && list.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center" data-testid="donation-empty-state">
              <p className="font-heading font-bold">{donations.data.length ? "No donations match these filters" : "No donations yet"}</p>
              <p className="mt-1 text-sm text-forest-muted">{donations.data.length ? "Try a different search or status." : "List your first surplus to see RescueIQ recommendations."}</p>
            </div>
          )}
          {list.map((d) => {
            const pending = d.allocations.filter((a) => a.status === "pending" && a.initiated_by === "recipient").length;
            return (
              <article key={d.id} className="group flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 transition-shadow duration-200 hover:shadow-sm sm:flex-row sm:items-center" data-testid={`donation-row-${d.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={displayStatus(d)} testId={`donation-status-${d.id}`} />
                    {d.is_demo && <DemoBadge />}
                    {pending > 0 && <span className="rounded-full bg-orange px-2 py-0.5 text-xs font-bold text-white">{pending} request{pending > 1 ? "s" : ""}</span>}
                  </div>
                  <h3 className="mt-2 truncate font-heading text-lg font-bold">{d.food_item}</h3>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-forest-muted">
                    <span>{CATEGORY_LABELS[d.category]}</span>
                    <span className="font-mono font-semibold text-forest">{kg(d.quantity_kg)}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{d.pickup_area}, {d.pickup_city}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{formatDeadline(d.available_until)} · {timeLeftLabel(d.available_until)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <DeleteDonationButton donation={d} iconOnly />
                  <Link to={`/donations/${d.id}`} className="inline-flex h-9 items-center gap-1 rounded-lg bg-forest-2 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-forest" data-testid={`view-donation-${d.id}`}>
                    {d.status === "available" && !d.expired ? "View matches" : "Details"} <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="rl-title">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="rl-title" className="font-heading text-xl font-bold">RewardLoop progress</h2>
          <ProposedPill />
        </div>
        <p className="mt-1 text-sm text-forest-muted">
          Based on {s ? kg(s.kg_confirmed_collected) : "—"} confirmed collected by verified recipients. Illustrative only — no vouchers are issued.
        </p>
        <div className="mt-4"><RewardLoopTiers progressKg={s?.kg_confirmed_collected ?? 0} /></div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Donate surplus food</DialogTitle>
            <DialogDescription>Fields marked * are required. Your exact address stays private until you accept a match.</DialogDescription>
          </DialogHeader>
          <DonationForm user={user} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DonorDashboard() {
  return (
    <PageShell>
      <RequireRole roles={["donor"]}>{(u) => <DonorView user={u} />}</RequireRole>
    </PageShell>
  );
}
