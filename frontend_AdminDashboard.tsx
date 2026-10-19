import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, RequireRole } from "@/components/layout/PageShell";
import StatusBadge, { DemoBadge } from "@/components/StatusBadge";
import DeleteDonationButton from "@/components/DeleteDonationButton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { CATEGORY_LABELS, errorMessage, formatDeadline, kg } from "@/lib/app";
import type { DemoDataInfo, Donation, OkOut, Org, Verification } from "@/lib/types";
import { displayStatus } from "./DonorDashboard";

function AdminView() {
  const qc = useQueryClient();
  const orgs = useQuery({ queryKey: ["orgs"], queryFn: () => apiGet<Org[]>("/admin/organizations") });
  const donations = useQuery({ queryKey: ["donations"], queryFn: () => apiGet<Donation[]>("/donations") });
  const demo = useQuery({ queryKey: ["demo-data"], queryFn: () => apiGet<DemoDataInfo>("/demo-data") });

  const verify = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Verification }) => apiPost<Org>(`/admin/organizations/${id}/verify`, { status }),
    onSuccess: (o) => {
      toast.success(`${o.org_name} is now ${o.verification_status}`);
      void qc.invalidateQueries({ queryKey: ["orgs"] });
      void qc.invalidateQueries({ queryKey: ["public-stats"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const clearDemo = useMutation({
    mutationFn: () => apiDelete<OkOut>("/demo-data"),
    onSuccess: (r) => {
      toast.success(r.message);
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const pending = (orgs.data ?? []).filter((o) => o.verification_status === "pending").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Admin</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl" data-testid="admin-dashboard-title">Operations console</h1>
      <p className="mt-2 max-w-2xl text-sm text-forest-muted">
        Verification here records that an admin reviewed the organisation inside ResQMeal. Document checks (registration certificate, FSSAI, ID) are a manual process and must be completed before approving.
      </p>

      <Tabs defaultValue="orgs" className="mt-8">
        <TabsList>
          <TabsTrigger value="orgs" data-testid="admin-tab-orgs">Organisations {pending > 0 && `(${pending} pending)`}</TabsTrigger>
          <TabsTrigger value="donations" data-testid="admin-tab-donations">All donations</TabsTrigger>
          <TabsTrigger value="demo" data-testid="admin-tab-demo">Demo data</TabsTrigger>
        </TabsList>

        <TabsContent value="orgs" className="mt-5">
          {orgs.isError && <p role="alert" className="text-sm text-destructive">{errorMessage(orgs.error)}</p>}
          <div className="rounded-2xl border border-line bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Accepts</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orgs.data ?? []).map((o) => (
                  <TableRow key={o.id} data-testid={`org-row-${o.id}`}>
                    <TableCell>
                      <p className="font-semibold">{o.org_name} {o.is_demo && <DemoBadge />}</p>
                      <p className="text-xs text-forest-muted">{o.name} · {o.email}</p>
                    </TableCell>
                    <TableCell>{o.area}, {o.city}</TableCell>
                    <TableCell className="max-w-56 whitespace-normal text-xs">{o.accepted_categories.map((c) => CATEGORY_LABELS[c]).join(", ")}</TableCell>
                    <TableCell className="font-mono">{kg(o.capacity_kg ?? 0)}</TableCell>
                    <TableCell><StatusBadge status={o.verification_status} testId={`org-status-${o.id}`} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {o.verification_status !== "verified" && (
                          <Button size="sm" className="bg-forest-2" disabled={verify.isPending} onClick={() => verify.mutate({ id: o.id, status: "verified" })} data-testid={`verify-org-button-${o.id}`}>
                            {verify.isPending && verify.variables?.id === o.id && <Loader2 className="animate-spin" aria-hidden />} Verify
                          </Button>
                        )}
                        {o.verification_status !== "rejected" && (
                          <Button size="sm" variant="outline" disabled={verify.isPending} onClick={() => verify.mutate({ id: o.id, status: "rejected" })} data-testid={`reject-org-button-${o.id}`}>
                            {o.verification_status === "verified" ? "Revoke" : "Reject"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orgs.data && orgs.data.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-forest-muted">No recipient organisations yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="donations" className="mt-5">
          <div className="rounded-2xl border border-line bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Food</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(donations.data ?? []).map((d) => (
                  <TableRow key={d.id} data-testid={`admin-donation-row-${d.id}`}>
                    <TableCell className="font-semibold">{d.food_item} {d.is_demo && <DemoBadge />}</TableCell>
                    <TableCell>{d.donor_name}</TableCell>
                    <TableCell className="font-mono">{kg(d.quantity_kg)}</TableCell>
                    <TableCell>{formatDeadline(d.available_until)}</TableCell>
                    <TableCell><StatusBadge status={displayStatus(d)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/donations/${d.id}`} className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-sm font-semibold hover:bg-cream-2">View</Link>
                        <DeleteDonationButton donation={d} iconOnly />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="demo" className="mt-5">
          <div className="max-w-xl rounded-2xl border border-line bg-white p-6" data-testid="demo-data-panel">
            <p className="font-heading text-lg font-bold">Demo records</p>
            <p className="mt-1 text-sm text-forest-muted">
              Demo records are flagged <code className="font-mono">is_demo</code>, labelled in the UI and reported separately from live impact. Clearing removes only flagged records — real data is never touched.
            </p>
            {demo.data && (
              <p className="mt-4 font-mono text-sm" data-testid="demo-data-counts">
                {demo.data.demo_users} accounts · {demo.data.demo_donations} donations · {demo.data.demo_allocations} allocations
              </p>
            )}
            <Button variant="destructive" className="mt-4" disabled={clearDemo.isPending} onClick={() => clearDemo.mutate()} data-testid="clear-demo-data-button">
              {clearDemo.isPending && <Loader2 className="animate-spin" aria-hidden />} Clear demo data before launch
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <PageShell>
      <RequireRole roles={["admin"]}>{() => <AdminView />}</RequireRole>
    </PageShell>
  );
}
