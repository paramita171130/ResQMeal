import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { apiDelete } from "@/lib/api";
import { errorMessage } from "@/lib/app";
import { queryClient } from "@/lib/queryClient";
import type { Donation, OkOut } from "@/lib/types";

export default function DeleteDonationButton({
  donation, onDeleted, iconOnly = false,
}: { donation: Donation; onDeleted?: () => void; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const locked = donation.status === "collected" || donation.status === "distributed";
  const del = useMutation({
    mutationFn: () => apiDelete<OkOut>(`/donations/${donation.id}`),
    onSuccess: () => {
      toast.success("Donation deleted");
      setOpen(false);
      for (const k of ["donations", "donor-stats", "public-stats", "allocations"]) void queryClient.invalidateQueries({ queryKey: [k] });
      onDeleted?.();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (locked) return null;
  return (
    <>
      <Button
        variant="outline"
        size={iconOnly ? "icon" : "sm"}
        className="text-destructive hover:bg-[#FDECEC] hover:text-destructive"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${donation.food_item}`}
        data-testid={`delete-donation-button-${donation.id}`}
      >
        <Trash2 aria-hidden /> {!iconOnly && "Delete"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{donation.food_item}”?</DialogTitle>
            <DialogDescription>
              This permanently removes the listing. Any pending or accepted allocations will be cancelled and the recipient will see the change.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" data-testid="delete-donation-cancel" />}>Keep it</DialogClose>
            <Button variant="destructive" onClick={() => del.mutate()} disabled={del.isPending} data-testid="delete-donation-confirm">
              {del.isPending && <Loader2 className="animate-spin" aria-hidden />} Delete donation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
