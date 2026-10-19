import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Hourglass, Loader2, MapPin, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { PageShell, RequireRole } from "@/components/layout/PageShell";
import StatusBadge, { DemoBadge } from "@/components/StatusBadge";
import AllocationActions from "@/components/AllocationActions";
import SafetyNotice from "@/components/SafetyNotice";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPost } from "@/lib/api";
import { CATEGORY_LABELS, DEMAND_LABELS, errorMessage, formatDeadline, kg, timeLeftLabel } from "@/lib/app";
import type { Allocation, Donation, User } from "@/lib/types";

function RecipientView({ user }: { user: User }) {
  const qc = useQueryClient();
  const verified = user.verification_status === "verified";
  const [onlySuitable, setOnlySuitable] = useState(true);
  const donations = useQuery({ queryKey: ["donations"], queryFn: () => apiGet<Donation[]>("/donations") });
  const allocations = useQuery({ queryKey: ["allocations"], queryFn: () => apiGet<Allocation[]>("/allocations") });

  const activeIds = new Set(
    (allocations.data ?? []).filter((a) => ["pending", "accepted", "collected"].includes(a.status)).map((a) => a.donation_id),
  );
  const openLoad = (allocations.data ?? []).filter((a) => a.status === "accepted").reduce((s, a) => s + a.quantity_kg, 0);
  const free = (user.capacity_kg ?? 0) - openLoad;

  const list = useMemo(
    () =>
      (donations.data ?? []).filter(
        (d) => !onlySuitable || (user.accepted_categories.includes(d.category) && d.quantity_kg <= free),
      ),
    [donations.data, onlySuitable, user.accepted_categories, free],
  );

  const request = useMutation({
    mutationFn: (donation_id: string) => apiPost<Allocation>("/allocations", { donation_id }),
    onSuccess: () => {
      toast.success("Request sent. The donor will review it.");
      void qc.invalidateQueries({ queryKey: ["allocations"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const allocs = allocations.data ?? [];
  const offers = allocs.filter((a) => a.status === "pending" && a.initiated_by === "donor").length;
  const received = allocs.filter((a) => a.status === "collected" || a.status === "distributed").reduce((s, a) => s + a.quantity_kg, 0);
  const distributed = allocs.filter((a) => a.status === "distributed").reduce((s, a) => s + a.quantity_kg, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Recipient dashboard</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl" data-testid="recipient-dashboard-title">{user.org_name}</h1>
        <StatusBadge status={user.verification_status ?? "pending"} testId="recipient-verification-badge" />
        {user.is_demo && <DemoBadge />}
      </div>
      <p className="mt-2 text-sm text-forest-muted">
        {user.area}, {user.city} · accepts {user.accepted_categories.map((c) => CATEGORY_LABELS[c]).join(", ")} · capacity {kg(user.capacity_kg ?? 0)} · {DEMAND_LABELS[user.demand_level ?? "low"]} demand
      </p>

      {!verified && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-[#F3DE9B] bg-[#FEF7E0] p-4 text-sm text-[#854D0E]" role="status" data-testid="verification-pending-banner">
          <Hourglass className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            {user.verification_status === "rejected"
              ? "Your organisation was not approved. Contact the ResQMeal team to resolve this."
              : "Your organisation is awaiting admin verification. You can browse listings, but you can only request or receive food once verified."}
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Free capacity", kg(Math.max(free, 0))],
          ["Offers to review", String(offers)],
          ["Collected", kg(received)],
          ["Distributed", kg(distributed)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-line bg-white p-5" data-testid={`recipient-stat-${l.toLowerCase().replace(/\s+/g, "-")}`}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-muted">{l}</p>
            <p className="mt-2 font-mono text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="available" className="mt-10">
        <TabsList>
          <TabsTrigger value="available" data-testid="tab-available">Available food</TabsTrigger>
          <TabsTrigger value="mine" data-testid="tab-my-allocations">My requests & allocations {offers > 0 && `(${offers})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-5">
          <label className="mb-4 inline-flex items-center gap-2 text-sm">
            <Checkbox checked={onlySuitable} onCheckedChange={(c) => setOnlySuitable(!!c)} data-testid="only-suitable-checkbox" />
            Only show food that fits my categories and free capacity
          </label>
          {donations.isLoading && <div className="h-32 animate-pulse rounded-2xl bg-cream-2" />}
          {donations.isError && <p role="alert" className="text-sm text-destructive">{errorMessage(donations.error)}</p>}
          {donations.data && list.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center" data-testid="available-empty-state">
              <p className="font-heading font-bold">No suitable food right now</p>
              <p className="mt-1 text-sm text-forest-muted">New listings appear here as donors post them. Untick the filter to see everything available.</p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="available-list">
            {list.map((d) => {
              const fits = user.accepted_categories.includes(d.category) && d.quantity_kg <= free;
              const already = activeIds.has(d.id);
              return (
                <article key={d.id} className="flex flex-col rounded-2xl border border-line bg-white p-5" data-testid={`available-card-${d.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-forest-muted">{CATEGORY_LABELS[d.category]}</span>
                    {d.is_demo && <DemoBadge />}
                  </div>
                  <h3 className="mt-2 font-heading text-lg font-bold">{d.food_item}</h3>
                  <p className="text-sm text-forest-muted">from {d.donor_name}</p>
                  <div className="mt-4 space-y-1.5 text-sm">
                    <p className="font-mono text-xl font-bold text-forest">{kg(d.quantity_kg)}</p>
                    <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-forest-muted" aria-hidden />{d.pickup_area}, {d.pickup_city}</p>
                    <p className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-forest-muted" aria-hidden />{formatDeadline(d.available_until)} · <span className="font-semibold text-orange">{timeLeftLabel(d.available_until)}</span></p>
                    {d.allergens.length > 0 && <p className="flex items-center gap-1.5 capitalize"><ShieldAlert className="h-4 w-4 text-orange" aria-hidden />Contains: {d.allergens.join(", ")}</p>}
                    {d.handling_notes && <p className="text-forest-muted">{d.handling_notes}</p>}
                  </div>
                  <div className="mt-auto pt-5">
                    {already ? (
                      <p className="text-sm font-semibold text-forest-2">Request in progress — see My requests</p>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={!verified || !fits || request.isPending}
                        onClick={() => request.mutate(d.id)}
                        data-testid={`request-donation-button-${d.id}`}
                      >
                        {request.isPending && request.variables === d.id && <Loader2 className="animate-spin" aria-hidden />}
                        {!verified ? "Verification required" : !fits ? "Outside your categories/capacity" : "Request this food"}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="mine" className="mt-5 space-y-3">
          {allocations.isLoading && <div className="h-24 animate-pulse rounded-2xl bg-cream-2" />}
          {allocations.data && allocs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-sm text-forest-muted" data-testid="allocations-empty-state">
              No requests or offers yet.
            </div>
          )}
          {allocs.map((a) => (
            <article key={a.id} className="rounded-2xl border border-line bg-white p-5" data-testid={`my-allocation-${a.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} testId={`my-allocation-status-${a.id}`} />
                    <span className="text-xs text-forest-muted">{a.initiated_by === "donor" ? "Offered by donor" : "Requested by you"}</span>
                  </div>
                  <h3 className="mt-2 font-heading text-lg font-bold">{a.food_item}</h3>
                  <p className="text-sm text-forest-muted">
                    {kg(a.quantity_kg)} · {CATEGORY_LABELS[a.category]} · {a.pickup_area}, {a.pickup_city} · until {formatDeadline(a.available_until)}
                  </p>
                  {a.pickup_address && <p className="mt-1 text-sm"><span className="font-semibold">Pickup address:</span> {a.pickup_address}</p>}
                  {a.counterpart_email && <p className="text-sm"><span className="font-semibold">Donor contact:</span> {a.counterpart_email}</p>}
                  {a.allergens.length > 0 && <p className="text-sm capitalize text-[#9A3412]">Allergens: {a.allergens.join(", ")}</p>}
                </div>
                <AllocationActions a={a} party="recipient" />
              </div>
            </article>
          ))}
        </TabsContent>
      </Tabs>

      <div className="mt-12"><SafetyNotice /></div>
    </div>
  );
}

export default function RecipientDashboard() {
  return (
    <PageShell>
      <RequireRole roles={["recipient"]}>{(u) => <RecipientView user={u} />}</RequireRole>
    </PageShell>
  );
}
