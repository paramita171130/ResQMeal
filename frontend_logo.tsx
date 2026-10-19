import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Uses /resqmeal-logo.png when present; falls back to a text wordmark. */
export default function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <Link
      to="/"
      data-testid="brand-logo-link"
      aria-label="ResQMeal home"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-2 focus-visible:ring-offset-2",
        className,
      )}
    >
      {imgOk && (
        <img
          src="/resqmeal-logo.png"
          alt=""
          className="h-9 w-auto"
          onError={() => setImgOk(false)}
        />
      )}
      {!imgOk && (
        <span
          aria-hidden
          className="grid h-9 w-9 place-items-center rounded-xl bg-forest-2 font-heading text-base font-extrabold text-cream"
        >
          R<span className="text-orange">Q</span>
        </span>
      )}
      <span
        className={cn(
          "font-heading text-xl font-extrabold tracking-tight",
          inverse ? "text-cream" : "text-forest",
        )}
      >
        ResQ<span className="text-orange">Meal</span>
      </span>
    </Link>
  );
}
