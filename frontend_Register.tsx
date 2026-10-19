import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Building2, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import Logo from "@/components/layout/Logo";
import { AuthAside } from "./Login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiPost } from "@/lib/api";
import { CATEGORY_LABELS, DEMAND_LABELS, errorMessage } from "@/lib/app";
import { beginSession } from "@/lib/session";
import type { Category, DemandLevel, RegisterIn, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Register() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<"donor" | "recipient">(params.get("role") === "recipient" ? "recipient" : "donor");
  const [f, setF] = useState({ name: "", org_name: "", email: "", password: "", area: "", city: "", capacity_kg: "" });
  const [cats, setCats] = useState<Category[]>([]);
  const [demand, setDemand] = useState<DemandLevel | "">("");
  const [error, setError] = useState("");

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const reg = useMutation({
    mutationFn: (body: RegisterIn) => apiPost<User>("/auth/register", body),
    onSuccess: (u) => {
      beginSession();
      toast.success(u.role === "recipient" ? "Organisation registered — pending admin verification" : "Account created");
      nav("/dashboard", { replace: true });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (f.name.trim().length < 2 || f.org_name.trim().length < 2) return setError("Enter your name and organisation name");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError("Enter a valid email address");
    if (f.password.length < 8) return setError("Password must be at least 8 characters");
    if (f.area.trim().length < 2 || f.city.trim().length < 2) return setError("Enter your area and city");
    const cap = Number(f.capacity_kg);
    if (role === "recipient") {
      if (!cats.length) return setError("Select at least one food category you can accept");
      if (!cap || cap <= 0 || cap > 5000) return setError("Enter a realistic capacity between 1 and 5,000 kg");
      if (!demand) return setError("Select your current demand level");
    }
    reg.mutate({
      email: f.email.trim(),
      password: f.password,
      role,
      name: f.name.trim(),
      org_name: f.org_name.trim(),
      area: f.area.trim(),
      city: f.city.trim(),
      accepted_categories: role === "recipient" ? cats : [],
      capacity_kg: role === "recipient" ? cap : null,
      demand_level: role === "recipient" && demand ? demand : null,
    });
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <AuthAside
        title={role === "donor" ? "Turn surplus into support." : "Receive food your community needs."}
        text={role === "donor" ? "List safe surplus in under a minute and see exactly why RescueIQ recommends each organisation." : "Tell us what you can accept and store. After admin verification, you'll see suitable food near you."}
      />
      <main className="flex flex-col justify-center px-4 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-lg">
          <div className="lg:hidden"><Logo /></div>
          <h1 className="mt-8 font-heading text-3xl font-extrabold tracking-tight lg:mt-0">Create your account</h1>
          <div className="mt-6 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
            {([
              ["donor", "I'm donating food", Store],
              ["recipient", "We receive food", Building2],
            ] as const).map(([r, l, Icon]) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={role === r}
                data-testid={`register-role-${r}`}
                onClick={() => setRole(r)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-2",
                  role === r ? "border-forest-2 bg-mint text-forest" : "border-line bg-white text-forest-muted hover:bg-cream-2",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden /> {l}
              </button>
            ))}
          </div>
          <form onSubmit={submit} noValidate className="mt-6 space-y-4" data-testid="register-form">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="r-name">Your name</Label>
                <Input id="r-name" autoComplete="name" value={f.name} onChange={set("name")} data-testid="register-name-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-org">{role === "donor" ? "Business / organisation" : "Organisation name"}</Label>
                <Input id="r-org" autoComplete="organization" value={f.org_name} onChange={set("org_name")} data-testid="register-org-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-email">Email</Label>
                <Input id="r-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} data-testid="register-email-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-pw">Password (min 8 characters)</Label>
                <Input id="r-pw" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} data-testid="register-password-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-area">Area / locality</Label>
                <Input id="r-area" value={f.area} onChange={set("area")} data-testid="register-area-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-city">City</Label>
                <Input id="r-city" value={f.city} onChange={set("city")} data-testid="register-city-input" />
              </div>
            </div>
            {role === "recipient" && (
              <div className="space-y-4 rounded-2xl border border-line bg-white p-4">
                <fieldset>
                  <legend className="text-sm font-medium">Food categories you can safely accept</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                      <label key={k} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-cream-2">
                        <Checkbox
                          checked={cats.includes(k as Category)}
                          data-testid={`register-category-${k}`}
                          onCheckedChange={(c) => setCats((p) => (c ? [...p, k as Category] : p.filter((x) => x !== k)))}
                        />
                        {l}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-cap">Max kg you can collect & store at once</Label>
                    <Input id="r-cap" type="number" min="1" max="5000" value={f.capacity_kg} onChange={set("capacity_kg")} data-testid="register-capacity-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-demand">Current demand</Label>
                    <Select value={demand} onValueChange={(v) => setDemand(v as DemandLevel)}>
                      <SelectTrigger id="r-demand" className="w-full" data-testid="register-demand-select">
                        <SelectValue>{(v) => (v ? DEMAND_LABELS[v as string] : "Select")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DEMAND_LABELS).map(([k, l]) => (
                          <SelectItem key={k} value={k}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-forest-muted">Your organisation will be reviewed by a ResQMeal admin before it can request or receive food.</p>
              </div>
            )}
            {error && <p role="alert" className="rounded-lg bg-[#FDECEC] px-3 py-2 text-sm text-destructive" data-testid="register-error">{error}</p>}
            <p className="text-xs text-forest-muted">
              By creating an account you agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link> (draft, pending legal review).
            </p>
            <Button type="submit" size="lg" className="h-11 w-full bg-orange text-white hover:bg-orange-dark" disabled={reg.isPending} data-testid="register-submit-button">
              {reg.isPending && <Loader2 className="animate-spin" aria-hidden />} Create account
            </Button>
          </form>
          <p className="mt-6 text-sm text-forest-muted">
            Already have an account? <Link to="/login" className="font-semibold text-forest-2 underline underline-offset-4">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
