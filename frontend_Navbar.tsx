import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import Logo from "./Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMe } from "@/lib/app";
import { endSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const LANDING_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#rescueiq", label: "RescueIQ" },
  { href: "/#impact", label: "Impact" },
  { href: "/#rewardloop", label: "RewardLoop" },
];

export default function Navbar() {
  const { data: me, isError } = useMe();
  const user = isError ? undefined : me;
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/85 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <Logo />
        <ul className="hidden items-center gap-1 md:flex">
          {LANDING_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}-link`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-forest-muted transition-colors duration-150 hover:bg-cream-2 hover:text-forest"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <NavLink
                to="/dashboard"
                data-testid="nav-dashboard-link"
                className={buttonVariants({ variant: "default", size: "lg" })}
              >
                Dashboard
              </NavLink>
              <Button
                variant="ghost"
                size="lg"
                data-testid="nav-logout-button"
                onClick={() => void endSession("/")}
              >
                <LogOut aria-hidden /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login-link" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                Sign in
              </Link>
              <Link
                to="/register?role=donor"
                data-testid="nav-donate-cta"
                className={cn(buttonVariants({ size: "lg" }), "bg-orange text-white hover:bg-orange-dark")}
              >
                Donate Food
              </Link>
            </>
          )}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Open menu" data-testid="nav-mobile-menu-button" />}
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="right" className="bg-cream">
            <SheetTitle className="px-4 pt-4 font-heading">Menu</SheetTitle>
            <div className="flex flex-col gap-1 p-4" onClick={() => setOpen(false)}>
              {LANDING_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="rounded-lg px-3 py-3 font-medium hover:bg-cream-2">
                  {l.label}
                </a>
              ))}
              <div className="my-2 h-px bg-line" />
              {user ? (
                <>
                  <Link to="/dashboard" data-testid="mobile-dashboard-link" className={buttonVariants({ size: "lg" })}>
                    Dashboard
                  </Link>
                  <Button variant="ghost" size="lg" onClick={() => void endSession("/")} data-testid="mobile-logout-button">
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" data-testid="mobile-login-link" className={buttonVariants({ variant: "outline", size: "lg" })}>
                    Sign in
                  </Link>
                  <Link
                    to="/register?role=donor"
                    className={cn(buttonVariants({ size: "lg" }), "mt-2 bg-orange text-white hover:bg-orange-dark")}
                  >
                    Donate Food
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
