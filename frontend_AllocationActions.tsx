import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { apiPost } from "@/lib/api";
import { errorMessage } from "@/lib/app";
import type { Allocation } from "@/lib/types";

type Action = "accept" | "decline" | "cancel" | "collect" | "distribute";

const CONFIRM: Partial<Record<Action, { title: string; body: string }>> = {
  collect: {
    title: "Confirm collection",
    body: "Only confirm once your team has physically collected the food and checked it is safe. This updates the donor's record.",
  },
  distribute: {
    title: "Confirm distribution",
    body: "Confirm that this food has been distributed to people in need. This is counted as redistributed in impact statistics.",
  },
  cancel: { title: "Cancel this allocation?", body: "If it was accepted, the donation becomes available again for other organisations." },
};

const LABEL: Record<Action, string> = {
  accept: "Accept",
  decline: "Decline",
  cancel: "Cancel",
  collect: "Mark collected",
  distribute: "Mark distributed",
};

/** Buttons for the actions the current party may take on an allocation. Server re-checks every rule. */
export default function AllocationActions({ a, party }: { a: Allocation; party: "donor" | "recipient" }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<Action | null>(null);
  const m = useMutation({
    mutationFn: (action: Action) => apiPost<Allocation>(`/allocations/${a.id}/${action}`),
    onSuccess: (res, action) => {
      toast.success(`${LABEL[action]} — status is now ${res.status}`);
      setConfirm(null);
      for (const k of ["allocations", "donations", "donation", "matches", "donor-stats", "public-stats"]) {
        void qc.invalidateQueries({ queryKey: [k] });
      }
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      setConfirm(null);
    },
  });

  const actions: Action[] = [];
  if (a.status === "pending") {
    if (party !== a.initiated_by) actions.push("accept", "decline");
    else actions.push("cancel");
  }
  if (a.status === "accepted") {
    if (party === "recipient") actions.push("collect");
    actions.push("cancel");
  }
  if (a.status === "collected" && party === "recipient") actions.push("distribute");
  if (!actions.length) return null;

  const run = (act: Action) => (CONFIRM[act] ? setConfirm(act) : m.mutate(act));

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((act) => (
        <Button
          key={act}
          size="sm"
          variant={act === "decline" || act === "cancel" ? "outline" : "default"}
          className={act === "accept" || act === "collect" || act === "distribute" ? "bg-forest-2" : ""}
          disabled={m.isPending}
          onClick={() => run(act)}
          data-testid={`allocation-${act}-button`}
        >
          {m.isPending && m.variables === act && <Loader2 className="animate-spin" aria-hidden />}
          {LABEL[act]}
        </Button>
      ))}
      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm ? CONFIRM[confirm]?.title : ""}</DialogTitle>
            <DialogDescription>{confirm ? CONFIRM[confirm]?.body : ""}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" data-testid="allocation-confirm-cancel" />}>Go back</DialogClose>
            <Button disabled={m.isPending} onClick={() => confirm && m.mutate(confirm)} data-testid="allocation-confirm-button">
              {m.isPending && <Loader2 className="animate-spin" aria-hidden />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
