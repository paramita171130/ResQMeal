import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useMe } from "@/lib/app";
import { ApiError } from "@/lib/api";
import type { Role, User } from "@/lib/types";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-forest focus:px-4 focus:py-2 focus:text-cream"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

/** Gate a page on a signed-in user of the given role(s). */
export function RequireRole({ roles, children }: { roles: Role[]; children: (u: User) => ReactNode }) {
  const { data, isLoading, error } = useMe();
  const loc = useLocation();
  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-forest-muted" data-testid="auth-loading">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (error instanceof ApiError && error.status === 401) {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center" data-testid="auth-unavailable">
        <p className="font-heading text-xl font-bold">Dashboard unavailable</p>
        <p className="mt-2 text-forest-muted">We couldn't reach the ResQMeal server. Please try again shortly.</p>
      </div>
    );
  }
  if (!roles.includes(data.role)) return <Navigate to="/dashboard" replace />;
  return <>{children(data)}</>;
}
