import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Logo from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { errorMessage } from "@/lib/app";
import { beginSession } from "@/lib/session";
import type { User } from "@/lib/types";

export function AuthAside({ title, text }: { title: string; text: string }) {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-forest p-10 text-cream lg:flex">
      <Logo inverse />
      <div>
        <h2 className="font-heading text-4xl font-extrabold leading-tight">{title}</h2>
        <p className="mt-4 max-w-md text-[#A7C4B2]">{text}</p>
      </div>
      <p className="text-xs text-[#A7C4B2]">Rescue surplus. Redistribute smarter.</p>
    </aside>
  );
}

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = useMutation({
    mutationFn: () => apiPost<User>("/auth/login", { email, password }),
    onSuccess: (u) => {
      beginSession();
      toast.success(`Welcome back, ${u.name.split(" ")[0]}`);
      const next = params.get("next");
      nav(next && next.startsWith("/") ? next : "/dashboard", { replace: true });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Enter your email and password");
    login.mutate();
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <AuthAside title="Welcome back to the rescue." text="Sign in to list surplus, review RescueIQ recommendations, or collect food for your community." />
      <main className="flex flex-col justify-center px-4 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden"><Logo /></div>
          <h1 className="mt-8 font-heading text-3xl font-extrabold tracking-tight lg:mt-0">Sign in</h1>
          <p className="mt-2 text-forest-muted">Donors, recipient organisations and admins use the same sign-in.</p>
          <form onSubmit={submit} noValidate className="mt-8 space-y-4" data-testid="login-form">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" />
            </div>
            {error && <p role="alert" className="rounded-lg bg-[#FDECEC] px-3 py-2 text-sm text-destructive" data-testid="login-error">{error}</p>}
            <Button type="submit" size="lg" className="h-11 w-full" disabled={login.isPending} data-testid="login-submit-button">
              {login.isPending && <Loader2 className="animate-spin" aria-hidden />} Sign in
            </Button>
          </form>
          <p className="mt-6 text-sm text-forest-muted">
            New to ResQMeal? <Link to="/register" className="font-semibold text-forest-2 underline underline-offset-4" data-testid="login-register-link">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
