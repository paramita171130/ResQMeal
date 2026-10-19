import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SafetyNotice from "@/components/SafetyNotice";
import { apiPost } from "@/lib/api";
import { ALLERGENS, CATEGORY_LABELS, errorMessage } from "@/lib/app";
import type { Allergen, Category, Donation, DonationIn, User } from "@/lib/types";

const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

function defaultDeadline(): { date: Date; time: string } {
  const d = new Date(Date.now() + 4 * 3_600_000);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return { date: d, time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` };
}

type Errors = Partial<Record<keyof DonationIn | "deadline", string>>;

export default function DonationForm({ user, onDone }: { user: User; onDone: () => void }) {
  const qc = useQueryClient();
  const init = defaultDeadline();
  const [form, setForm] = useState({
    donor_name: user.org_name,
    food_item: "",
    category: "" as Category | "",
    quantity_kg: "",
    pickup_area: user.area,
    pickup_city: user.city,
    pickup_address: "",
    handling_notes: "",
  });
  const [date, setDate] = useState<Date | undefined>(init.date);
  const [time, setTime] = useState(init.time);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [safe, setSafe] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [calOpen, setCalOpen] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: (body: DonationIn) => apiPost<Donation>("/donations", body),
    onSuccess: (d) => {
      toast.success(`“${d.food_item}” listed. RescueIQ can now suggest recipients.`);
      void qc.invalidateQueries({ queryKey: ["donations"] });
      void qc.invalidateQueries({ queryKey: ["donor-stats"] });
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Errors = {};
    const qty = Number(form.quantity_kg);
    if (form.donor_name.trim().length < 2) errs.donor_name = "Enter the donor or organisation name";
    if (form.food_item.trim().length < 2) errs.food_item = "Describe the food item";
    if (!form.category) errs.category = "Choose a category";
    if (!form.quantity_kg || !Number.isFinite(qty) || qty <= 0) errs.quantity_kg = "Enter a quantity above 0 kg";
    else if (qty > 2000) errs.quantity_kg = "Quantities above 2,000 kg need to be split into separate listings";
    if (form.pickup_area.trim().length < 2) errs.pickup_area = "Enter the pickup area";
    if (form.pickup_city.trim().length < 2) errs.pickup_city = "Enter the city";
    let until: Date | null = null;
    if (!date) errs.deadline = "Pick a date";
    else {
      until = new Date(date);
      const [h, m] = time.split(":").map(Number);
      until.setHours(h, m, 0, 0);
      const hrs = (until.getTime() - Date.now()) / 3_600_000;
      if (hrs < 1) errs.deadline = "Must be at least 1 hour from now for a safe pickup";
      else if (hrs > 24 * 7) errs.deadline = "Cannot be more than 7 days ahead";
    }
    if (!safe) errs.safety_confirmed = "Please confirm the food is safe for redistribution";
    setErrors(errs);
    if (Object.keys(errs).length || !until) return;
    create.mutate({
      donor_name: form.donor_name.trim(),
      food_item: form.food_item.trim(),
      category: form.category as Category,
      quantity_kg: qty,
      pickup_area: form.pickup_area.trim(),
      pickup_city: form.pickup_city.trim(),
      pickup_address: form.pickup_address.trim(),
      available_until: until.toISOString(),
      allergens,
      handling_notes: form.handling_notes.trim(),
      safety_confirmed: safe,
    });
  }

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`${k}-error`} className="text-xs font-medium text-destructive" role="alert">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-5" data-testid="donation-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="donor_name">Donor / organisation name *</Label>
          <Input id="donor_name" data-testid="donation-donor-name-input" value={form.donor_name} onChange={set("donor_name")} aria-invalid={!!errors.donor_name} aria-describedby="donor_name-error" />
          {err("donor_name")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="food_item">Food item *</Label>
          <Input id="food_item" placeholder="e.g. Veg pulao, 40 portions" data-testid="donation-food-item-input" value={form.food_item} onChange={set("food_item")} aria-invalid={!!errors.food_item} aria-describedby="food_item-error" />
          {err("food_item")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category *</Label>
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as Category }))}>
            <SelectTrigger id="category" className="w-full" data-testid="donation-category-select" aria-invalid={!!errors.category}>
              <SelectValue>{(v) => (v ? CATEGORY_LABELS[v as string] : "Choose a category")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                <SelectItem key={k} value={k} data-testid={`category-option-${k}`}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {err("category")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quantity_kg">Quantity (kg) *</Label>
          <Input id="quantity_kg" type="number" inputMode="decimal" min="0.1" step="0.1" max="2000" data-testid="donation-quantity-input" value={form.quantity_kg} onChange={set("quantity_kg")} aria-invalid={!!errors.quantity_kg} aria-describedby="quantity_kg-error" />
          {err("quantity_kg")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pickup_area">Pickup area *</Label>
          <Input id="pickup_area" placeholder="Neighbourhood / locality" data-testid="donation-area-input" value={form.pickup_area} onChange={set("pickup_area")} aria-invalid={!!errors.pickup_area} />
          {err("pickup_area")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pickup_city">City *</Label>
          <Input id="pickup_city" data-testid="donation-city-input" value={form.pickup_city} onChange={set("pickup_city")} aria-invalid={!!errors.pickup_city} />
          {err("pickup_city")}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pickup_address">Exact pickup address (private)</Label>
          <Input id="pickup_address" placeholder="Shared only with the recipient once a match is accepted" data-testid="donation-address-input" value={form.pickup_address} onChange={set("pickup_address")} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium" id="deadline-label">Available until *</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="deadline-label">
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger render={<Button type="button" variant="outline" className="min-w-44 justify-start" data-testid="donation-date-button" />}>
                <CalendarIcon aria-hidden /> {date ? format(date, "d MMM yyyy") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setCalOpen(false);
                  }}
                  disabled={(d) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const max = new Date(today.getTime() + 7 * 86_400_000);
                    return d < today || d > max;
                  }}
                />
              </PopoverContent>
            </Popover>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="w-32" data-testid="donation-time-select" aria-label="Time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {err("deadline")}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Allergens present (tick all that apply)</legend>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => {
            const on = allergens.includes(a);
            return (
              <label
                key={a}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm capitalize transition-colors duration-150 ${on ? "border-forest-2 bg-mint" : "border-line bg-white hover:bg-cream-2"}`}
              >
                <Checkbox
                  checked={on}
                  data-testid={`allergen-${a}-checkbox`}
                  onCheckedChange={(c) => setAllergens((prev) => (c ? [...prev, a] : prev.filter((x) => x !== a)))}
                />
                {a}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="handling_notes">Handling notes</Label>
        <Textarea id="handling_notes" rows={3} maxLength={500} placeholder="Storage temperature, packaging, reheating instructions…" data-testid="donation-handling-input" value={form.handling_notes} onChange={set("handling_notes")} />
      </div>

      <SafetyNotice compact />

      <label className="flex items-start gap-3 rounded-xl border border-line bg-white p-4 text-sm">
        <Checkbox checked={safe} onCheckedChange={(c) => setSafe(!!c)} data-testid="donation-safety-checkbox" aria-describedby="safety_confirmed-error" />
        <span>
          I confirm this food is safe, has been stored correctly, is within its safe consumption window, and all known allergens are declared. *
        </span>
      </label>
      {err("safety_confirmed")}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onDone} data-testid="donation-cancel-button">
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={create.isPending} className="bg-orange text-white hover:bg-orange-dark" data-testid="donation-submit-button">
          {create.isPending && <Loader2 className="animate-spin" aria-hidden />}
          List donation
        </Button>
      </div>
    </form>
  );
}
