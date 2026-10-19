import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { PageShell, RequireRole } from "@/components/layout/PageShell";

export function Dashboard() {
  return (
    <PageShell>
      <RequireRole roles={["donor", "recipient", "admin"]}>
        {(u) => <Navigate to={u.role === "admin" ? "/admin" : u.role === "recipient" ? "/recipient" : "/donor"} replace />}
      </RequireRole>
    </PageShell>
  );
}

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="rounded-xl border border-[#FBC9A3] bg-[#FFF7F0] px-4 py-3 text-sm font-semibold text-[#7C2D12]" data-testid="legal-draft-notice">
          Draft placeholder — must be reviewed by a qualified legal professional before public launch.
        </p>
        <h1 className="mt-8 font-heading text-4xl font-extrabold tracking-tight">{title}</h1>
        <div className="mt-6 space-y-5 leading-relaxed text-forest [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </PageShell>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>This placeholder describes how ResQMeal intends to handle personal data during pilot testing.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, organisation name, email, area and city.</li>
        <li>Donation details: food description, quantity, pickup area, optional private pickup address, deadline, allergens.</li>
        <li>Recipient organisation details: accepted categories, capacity and self-reported demand.</li>
      </ul>
      <h2>Who can see what</h2>
      <ul>
        <li>Public visitors see only aggregate kilogram statistics.</li>
        <li>Recipients see donation area and city, never a private address, until a match is accepted.</li>
        <li>Email contacts are shared only between the two parties of an accepted allocation.</li>
        <li>Admins can see account details to verify organisations.</li>
      </ul>
      <h2>Security</h2>
      <p>Passwords are hashed; sessions use secure, httpOnly cookies. We do not sell personal data.</p>
      <h2>Your choices</h2>
      <p>Contact the ResQMeal team to access or delete your account data. Retention periods and applicable law (including India's Digital Personal Data Protection Act, 2023) must be confirmed during legal review.</p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms of Use">
      <p>These draft terms describe the intended responsibilities of everyone using ResQMeal during pilot testing.</p>
      <h2>ResQMeal's role</h2>
      <p>ResQMeal is a matching platform. It does not handle, inspect, store, transport or certify food, and does not hold any food-safety certification.</p>
      <h2>Donor responsibilities</h2>
      <ul>
        <li>List only food that is safe, hygienically prepared and correctly stored.</li>
        <li>Disclose all known allergens and handling needs accurately.</li>
        <li>Set a realistic available-until time and keep food safe until collection.</li>
      </ul>
      <h2>Recipient responsibilities</h2>
      <ul>
        <li>Provide accurate organisation details for verification.</li>
        <li>Inspect food on collection and refuse anything unsafe.</li>
        <li>Store, transport and distribute food safely; confirm collection and distribution honestly.</li>
      </ul>
      <h2>RewardLoop</h2>
      <p>RewardLoop is a proposed programme. No vouchers or rewards are offered or guaranteed at this time.</p>
      <h2>Liability</h2>
      <p>Liability allocation, governing law and dispute resolution must be finalised during legal review.</p>
    </LegalPage>
  );
}

export function NotFound() {
  return (
    <PageShell>
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-mono text-sm text-orange">404</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold">Page not found</h1>
        <Link to="/" className="mt-6 inline-block font-semibold text-forest-2 underline" data-testid="notfound-home-link">Back to home</Link>
      </div>
    </PageShell>
  );
}
