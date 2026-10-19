import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Building2, HandHeart, PackageCheck, ScanSearch, ShieldCheck, Store, Truck, UtensilsCrossed, Users,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import RewardLoopTiers, { ProposedPill } from "@/components/rewards/RewardLoopTiers";
import SafetyNotice from "@/components/SafetyNotice";
import { buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { kg } from "@/lib/app";
import type { ImpactStats, PublicStats } from "@/lib/types";
import { cn } from "@/lib/utils";

const FLOW = [
  { icon: UtensilsCrossed, title: "Surplus Food", text: "A donor lists safe surplus with quantity, allergens and a deadline." },
  { icon: ScanSearch, title: "RescueIQ Matching", text: "Transparent rules rank verified recipients by fit, distance and time." },
  { icon: ShieldCheck, title: "Verified Recipient", text: "An admin-verified organisation accepts and collects the food." },
  { icon: PackageCheck, title: "Food Rescued", text: "Collection and distribution are confirmed by the recipient." },
];

const WEIGHTS = [
  ["Category compatibility", 25, "Required — recipients only see categories they accept"],
  ["Proximity", 25, "Same area > same city (text match, no GPS yet)"],
  ["Quantity vs capacity", 20, "Never exceeds a recipient's remaining capacity"],
  ["Stated demand", 15, "Self-reported by the organisation"],
  ["Time to deadline", 10, "Pickups under 1 hour are excluded"],
  ["Verification", 5, "Unverified organisations are not matched"],
] as const;

function StatBlock({ stats, label, testid }: { stats: ImpactStats; label: string; testid: string }) {
  const items = [
    ["Donations listed", String(stats.donations_listed)],
    ["Food listed", kg(stats.kg_listed)],
    ["Food matched", kg(stats.kg_matched)],
    ["Confirmed redistributed", kg(stats.kg_redistributed)],
  ];
  return (
    <div data-testid={testid}>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-forest-muted">{label}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-white p-5">
            <p className="font-mono text-2xl font-bold text-forest sm:text-3xl">{v}</p>
            <p className="mt-1 text-sm text-forest-muted">{k}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const stats = useQuery({ queryKey: ["public-stats"], queryFn: () => apiGet<PublicStats>("/stats/public"), retry: false });

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-20">
          <div className="rq-rise lg:col-span-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-forest-2">
              <span className="h-2 w-2 rounded-full bg-orange" aria-hidden /> Rescue surplus. Redistribute smarter.
            </span>
            <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-forest sm:text-5xl lg:text-6xl" data-testid="hero-headline">
              Good food deserves a <span className="text-orange">second chance.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-forest-muted">
              ResQMeal connects restaurants, caterers and events with surplus food to verified community
              organisations who can get it to people in need — matched by RescueIQ, with every
              recommendation explained.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register?role=donor" data-testid="hero-donate-food-cta" className={cn(buttonVariants({ size: "lg" }), "h-12 bg-orange px-6 text-base text-white hover:bg-orange-dark active:scale-[0.98]")}>
                Donate Food <ArrowRight aria-hidden />
              </Link>
              <Link to="/register?role=recipient" data-testid="hero-find-food-cta" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 border-forest-2 px-6 text-base text-forest-2 active:scale-[0.98]")}>
                Find Food
              </Link>
            </div>
            <p className="mt-4 text-sm text-forest-muted">
              Already registered? <Link to="/login" className="font-semibold text-forest-2 underline underline-offset-4">Sign in</Link>
            </p>
          </div>
          <div className="relative lg:col-span-6">
            <div className="overflow-hidden rounded-[28px] border border-line">
              <img
                src="https://images.unsplash.com/photo-1591586116988-62fe65164f8d?crop=entropy&cs=srgb&fm=jpg&q=80&w=1200"
                alt="Fresh surplus vegetables ready for redistribution"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 left-4 right-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm backdrop-blur sm:left-auto sm:right-6 sm:w-80">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-forest-2">
                  <ScanSearch className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold text-forest">RescueIQ explains every match</p>
                  <p className="text-xs text-forest-muted">Category · proximity · capacity · time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FLOW */}
      <section aria-labelledby="flow-title" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <h2 id="flow-title" className="sr-only">How food moves through ResQMeal</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="visual-flow">
          {FLOW.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center gap-3">
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl", i === 1 ? "bg-orange text-white" : "bg-mint text-forest-2")}>
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-mono text-xs font-semibold text-forest-muted">0{i + 1}</span>
              </div>
              <p className="mt-4 font-heading font-bold text-forest">{s.title}</p>
              <p className="mt-1 text-sm text-forest-muted">{s.text}</p>
              {i < FLOW.length - 1 && <span aria-hidden className="rq-flow-line absolute -right-4 top-10 hidden h-0.5 w-4 lg:block" />}
            </li>
          ))}
        </ol>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">How it works</p>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-forest sm:text-4xl">From surplus to someone's plate.</h2>
            <p className="mt-4 text-forest-muted">Every step is an explicit action by a real person. Food is never marked rescued just because it was listed or matched.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            {[
              ["1. List", "Donors post the food item, category, kilograms, pickup area, deadline and allergens — and confirm it is safe."],
              ["2. Match", "RescueIQ ranks verified organisations that accept the category and still have capacity. Donors offer; recipients can also request."],
              ["3. Accept & collect", "Once one side accepts, the pickup address is shared privately with the matched organisation only."],
              ["4. Confirm", "The recipient confirms collection, then distribution. Only confirmed records count towards impact."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-line bg-white p-6">
                <p className="font-heading text-lg font-bold text-forest">{t}</p>
                <p className="mt-2 text-sm leading-relaxed text-forest-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO */}
      <section aria-labelledby="who-title" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Who can participate</p>
        <h2 id="who-title" className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-forest sm:text-4xl">Built for both sides of the table.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-12">
          <div className="rounded-3xl border border-line bg-white p-7 md:col-span-5">
            <Store className="h-7 w-7 text-orange" aria-hidden />
            <p className="mt-4 font-heading text-xl font-bold">Food donors</p>
            <p className="mt-2 text-sm text-forest-muted">Restaurants, caterers, hostels, corporate canteens, bakeries, event organisers and grocers with safe surplus.</p>
            <Link to="/register?role=donor" data-testid="who-donor-cta" className={cn(buttonVariants({ variant: "link" }), "mt-3 px-0 text-orange")}>
              Register as a donor <ArrowRight aria-hidden />
            </Link>
          </div>
          <div className="overflow-hidden rounded-3xl border border-line bg-forest text-cream md:col-span-7">
            <div className="grid h-full sm:grid-cols-2">
              <div className="p-7">
                <Building2 className="h-7 w-7 text-orange" aria-hidden />
                <p className="mt-4 font-heading text-xl font-bold">Recipient organisations</p>
                <p className="mt-2 text-sm text-[#A7C4B2]">NGOs, shelters, community kitchens and food banks. Each organisation is reviewed by an admin before it can receive food.</p>
                <Link to="/register?role=recipient" data-testid="who-recipient-cta" className={cn(buttonVariants({ variant: "link" }), "mt-3 px-0 text-orange")}>
                  Register your organisation <ArrowRight aria-hidden />
                </Link>
              </div>
              <img src="https://images.pexels.com/photos/6591166/pexels-photo-6591166.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Volunteers packing meals for distribution" className="h-56 w-full object-cover sm:h-full" />
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-3xl border border-dashed border-line-strong p-6 md:col-span-12">
            <Users className="h-6 w-6 shrink-0 text-forest-muted" aria-hidden />
            <p className="text-sm text-forest-muted"><span className="font-semibold text-forest">Volunteers & delivery partners</span> — planned for a future release. Transport is currently arranged directly between the matched donor and recipient.</p>
          </div>
        </div>
      </section>

      {/* RESCUEIQ */}
      <section id="rescueiq" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-10 rounded-[32px] border border-line bg-white p-6 sm:p-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">RescueIQ</p>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-forest">Matching you can read, not a black box.</h2>
            <p className="mt-4 text-forest-muted">RescueIQ is a transparent, rule-based scoring system — not AI. Each recommendation shows the points it earned and why. Proximity currently compares area and city names; GPS distances will only appear once a mapping service is connected.</p>
          </div>
          <div className="lg:col-span-7">
            <table className="w-full text-left text-sm" data-testid="rescueiq-weights-table">
              <caption className="sr-only">RescueIQ score weights</caption>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-forest-muted">
                  <th className="py-2 font-semibold">Factor</th>
                  <th className="py-2 font-semibold">Max</th>
                  <th className="hidden py-2 font-semibold sm:table-cell">Rule</th>
                </tr>
              </thead>
              <tbody>
                {WEIGHTS.map(([f, p, r]) => (
                  <tr key={f} className="border-b border-line/70 last:border-0">
                    <td className="py-3 font-semibold text-forest">{f}</td>
                    <td className="py-3 font-mono font-semibold text-orange">{p}</td>
                    <td className="hidden py-3 text-forest-muted sm:table-cell">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="impact" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-24 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Impact</p>
        <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-forest sm:text-4xl">Counted from records, never estimated.</h2>
        <p className="mt-3 max-w-2xl text-forest-muted">We report kilograms only. We do not estimate meals, beneficiaries, carbon or money saved until verified methods exist.</p>
        <div className="mt-8 space-y-8">
          {stats.isLoading && <div className="h-28 animate-pulse rounded-2xl bg-cream-2" />}
          {stats.isError && <p className="rounded-2xl border border-line bg-white p-5 text-sm text-forest-muted" data-testid="impact-unavailable">Live statistics are unavailable right now.</p>}
          {stats.data && !stats.isError && (
            <>
              <StatBlock stats={stats.data.live} label="Live — calculated from real platform records" testid="impact-live-stats" />
              {stats.data.demo.donations_listed > 0 && (
                <StatBlock stats={stats.data.demo} label="Demo data — sample records for illustration only" testid="impact-demo-stats" />
              )}
            </>
          )}
        </div>
      </section>

      {/* REWARDLOOP */}
      <section id="rewardloop" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-24 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">RewardLoop</p>
          <ProposedPill />
        </div>
        <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-forest sm:text-4xl">A proposed sponsor-funded thank-you.</h2>
        <p className="mt-3 max-w-2xl text-forest-muted">
          RewardLoop is a proposal: sponsors would fund vouchers for donors whose food is confirmed collected by a verified recipient. No sponsors have partnered yet, no vouchers are issued, and the tiers below are illustrative until sponsor agreements, eligibility rules and redemption are in place.
        </p>
        <div className="mt-8">
          <RewardLoopTiers />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line-strong p-5 text-sm text-forest-muted">
          <HandHeart className="h-5 w-5 text-orange" aria-hidden />
          Interested in sponsoring RewardLoop? Sponsor onboarding will open once eligibility and redemption rules are finalised.
        </div>
      </section>

      {/* SAFETY */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Truck className="h-7 w-7 text-orange" aria-hidden />
            <h2 className="mt-3 font-heading text-2xl font-extrabold text-forest">Trust and food safety come first.</h2>
          </div>
          <div className="lg:col-span-8">
            <SafetyNotice />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
