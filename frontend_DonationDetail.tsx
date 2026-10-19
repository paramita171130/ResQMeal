import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Clock, Info, Loader2, MapPin, Package, Send } from "lucide-react";
import { toast } from "sonner";
import { PageShell, RequireRole } from "@/components/layout/PageShell";
import StatusBadge, { DemoBadge } from "@/components/StatusBadge";
import RescueIQBreakdown, { ScoreRing } from "@/components/rescue-iq/RescueIQBreakdown";
import AllocationActions from "@/components/AllocationActions";
import DeleteDonationButton from "@/components/DeleteDonationButton";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { CATEGORY_LABELS, errorMessage, formatDeadline, kg, timeLeftLabel } from "@/lib/app";
import type { Allocation, Donation, MatchResponse, User } from "@/lib/types";
import { displayStatus } from "./DonorDashboard";

function Matches({ donation }: { donation: Donation }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["matches", donation.id],
    queryFn: () => apiGet<MatchResponse>(`/matches/${donation.id}`),
  });
  const offer = useMutation({
    mutationFn: (recipient_id: string) => apiPost<Allocation>("/allocations", { donation_id: donation.id, recipient_id }),
    onSuccess: (a) => {
      toast.success(`Offer sent to ${a.recipient_org}. They must accept before pickup details are shared.`);
      for (const k of ["matches", "donation", "donations"]) void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-7" aria-labelledby="riq-title" data-testid="rescueiq-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="riq-title" className="font-heading text-xl font-bold">RescueIQ recommendations</h2>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-[#134E2E]">Rule-based · not AI</span>
      </div>
      {q.isLoading && <div className="mt-6 h-40 animate-pulse rounded-2xl bg-cream-2" />}
      {q.isError && <p className="mt-4 text-sm text-destructive" role="alert">{errorMessage(q.error, "Could not load matches.")}</p>}
      {q.data && (
        <>
          <p className="mt-2 text-sm text-forest-muted" data-testid="rescueiq-message">{q.data.message}</p>
          {q.data.next_steps.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#FBC9A3] bg-[#FFF7F0] p-4" data-testid="rescueiq-no-match">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#7C2D12]"><AlertTriangle className="h-4 w-4" aria-hidden /> Possible next steps</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#7C2D12]">
                {q.data.next_steps.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}
          <ol className="mt-5 space-y-4">
            {q.data.eligible.map((m, i) => {
              const busy = m.existing_allocation_status && m.existing_allocation_status !== "declined";
              return (
                <li key={m.recipient_id} className="rounded-2xl border border-line p-4 sm:p-5" data-testid={`match-card-${i}`}>
                  <div className="flex flex-wrap items-start gap-4">
                    <ScoreRing score={m.score} />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-forest-muted">#{i + 1}</p>
                      <p className="font-heading text-lg font-bold" data-testid={`match-org-${i}`}>{m.org_name}</p>
                      <p className="text-sm text-forest-muted">{m.area}, {m.city} · {kg(m.remaining_capacity_kg)} free capacity</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status="verified" />
                      {busy ? (
                        <StatusBadge status={m.existing_allocation_status ?? ""} />
                      ) : m.existing_allocation_status === "declined" ? (
                        <span className="text-xs text-forest-muted">Declined earlier</span>
                      ) : (
                        <Button size="sm" className="bg-orange text-white hover:bg-orange-dark" disabled={offer.isPending} onClick={() => offer.mutate(m.recipient_id)} data-testid={`offer-match-button-${i}`}>
                          {offer.isPending && offer.variables === m.recipient_id ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />} Offer
                        </Button>
                      )}
                    </div>
                  </div>
                  <details className="mt-4 group" open={i === 0}>
                    <summary className="cursor-pointer text-sm font-semibold text-forest-2">Why this recommendation?</summary>
                    <div className="mt-3"><RescueIQBreakdown reasons={m.reasons} /></div>
                  </details>
                </li>
              );
            })}
          </ol>
          {q.data.excluded.length > 0 && (
            <details className="mt-5 rounded-2xl bg-cream-2 p-4" data-testid="rescueiq-excluded">
              <summary className="cursor-pointer text-sm font-semibold">Not eligible ({q.data.excluded.length})</summary>
              <ul className="mt-3 space-y-1.5 text-sm">
                {q.data.excluded.map((x, i) => (
                  <li key={i}><span className="font-semibold">{x.org_name}</span> — <span className="text-forest-muted">{x.reason}</span></li>
                ))}
              </ul>
            </details>
          )}
          <p className="mt-4 flex items-start gap-2 text-xs text-forest-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{q.data.method}. Proximity compares area/city names only.</p>
        </>
      )}
    </section>
  );
}

function Detail({ user }: { user: User }) {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["donation", id], queryFn: () => apiGet<Donation>(`/donations/${id}`) });
  const d = q.data;
  const back = user.role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to={back} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-2 hover:underline" data-testid="back-to-dashboard">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard
      </Link>
      {q.isLoading && <div className="mt-6 h-64 animate-pulse rounded-3xl bg-cream-2" />}
      {q.isError && <p className="mt-6 rounded-2xl border border-line bg-white p-6 text-destructive" role="alert" data-testid="donation-detail-error">{errorMessage(q.error, "Donation not found.")}</p>}
      {d && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <section className="rounded-3xl border border-line bg-white p-6" data-testid="donation-detail">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={displayStatus(d)} testId="donation-detail-status" />
                {d.is_demo && <DemoBadge />}
              </div>
              <h1 className="mt-3 font-heading text-2xl font-extrabold tracking-tight sm:text-3xl" data-testid="donation-detail-title">{d.food_item}</h1>
              <p className="text-sm text-forest-muted">by {d.donor_name}</p>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-forest-muted">Category</dt><dd className="font-semibold">{CATEGORY_LABELS[d.category]}</dd></div>
                <div><dt className="text-forest-muted">Quantity</dt><dd className="font-mono font-semibold">{kg(d.quantity_kg)}</dd></div>
                <div><dt className="flex items-center gap-1 text-forest-muted"><MapPin className="h-3.5 w-3.5" aria-hidden />Pickup</dt><dd className="font-semibold">{d.pickup_area}, {d.pickup_city}</dd></div>
                <div><dt className="flex items-center gap-1 text-forest-muted"><Clock className="h-3.5 w-3.5" aria-hidden />Available until</dt><dd className="font-semibold">{formatDeadline(d.available_until)}<span className="block text-xs font-normal text-forest-muted">{timeLeftLabel(d.available_until)}</span></dd></div>
                {d.pickup_address && <div className="col-span-2"><dt className="text-forest-muted">Private address</dt><dd className="font-semibold">{d.pickup_address}</dd></div>}
                <div className="col-span-2"><dt className="text-forest-muted">Allergens</dt><dd className="mt-1 flex flex-wrap gap-1.5">{d.allergens.length ? d.allergens.map((a) => <span key={a} className="rounded-full bg-[#FFF1E6] px-2 py-0.5 text-xs font-semibold capitalize text-[#9A3412]">{a}</span>) : <span className="font-semibold">None declared</span>}</dd></div>
                {d.handling_notes && <div className="col-span-2"><dt className="text-forest-muted">Handling</dt><dd>{d.handling_notes}</dd></div>}
              </dl>
              <div className="mt-6 flex justify-end">
                <DeleteDonationButton donation={d} onDeleted={() => nav(back)} />
              </div>
            </section>

            <section className="rounded-3xl border border-line bg-white p-6" aria-labelledby="alloc-title" data-testid="allocations-panel">
              <h2 id="alloc-title" className="flex items-center gap-2 font-heading text-lg font-bold"><Package className="h-5 w-5 text-orange" aria-hidden /> Requests & allocations</h2>
              {d.allocations.length === 0 && <p className="mt-2 text-sm text-forest-muted">No requests or offers yet.</p>}
              <ul className="mt-4 space-y-3">
                {d.allocations.map((a) => (
                  <li key={a.id} className="rounded-2xl border border-line p-4" data-testid={`allocation-row-${a.id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{a.recipient_org}</p>
                      <StatusBadge status={a.status} testId={`allocation-status-${a.id}`} />
                    </div>
                    <p className="mt-1 text-xs text-forest-muted">
                      {a.initiated_by === "recipient" ? "Requested by recipient" : "Offered by you"}
                      {a.score !== null && ` · RescueIQ ${a.score}`}
                      {a.counterpart_email && ` · Contact: ${a.counterpart_email}`}
                    </p>
                    {user.role === "donor" && <div className="mt-3"><AllocationActions a={a} party="donor" /></div>}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <div className="lg:col-span-7">
            {d.status === "available" && !d.expired ? (
              <Matches donation={d} />
            ) : (
              <section className="rounded-3xl border border-line bg-white p-6 text-sm text-forest-muted" data-testid="rescueiq-closed">
                {d.expired ? "This donation passed its available-until time. Do not redistribute it; list fresh surplus instead." : `Matching is closed — this donation is ${d.status}.`}
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DonationDetail() {
  return (
    <PageShell>
      <RequireRole roles={["donor", "admin"]}>{(u) => <Detail user={u} />}</RequireRole>
    </PageShell>
  );
}
