import { useQuery } from "@tanstack/react-query";
import { ApiError, apiGet } from "./api";
import type { User } from "./types";

export const CATEGORY_LABELS: Record<string, string> = {
  cooked_meals: "Cooked meals",
  bakery: "Bakery",
  fruits_vegetables: "Fruits & vegetables",
  dairy: "Dairy",
  packaged_dry: "Packaged / dry goods",
  beverages: "Beverages",
  other: "Other",
};

export const ALLERGENS = [
  "gluten",
  "dairy",
  "nuts",
  "peanuts",
  "soy",
  "eggs",
  "fish",
  "shellfish",
  "sesame",
] as const;

export const DEMAND_LABELS: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<User>("/auth/me"),
    retry: false,
    staleTime: 30_000,
  });
}

/** Turn any API failure into a readable sentence for the user. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | null;
    const detail = body?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0] as { msg?: string; loc?: unknown[] };
      const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1]) : "";
      return `${field ? field.replace(/_/g, " ") + ": " : ""}${(first.msg ?? "invalid value").replace(/^Value error, /, "")}`;
    }
    if (err.status >= 500) return "The server had a problem. Please try again shortly.";
  }
  if (err instanceof TypeError) return "Can't reach ResQMeal right now. Check your connection.";
  return fallback;
}

export function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function hoursLeft(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

export function timeLeftLabel(iso: string): string {
  const h = hoursLeft(iso);
  if (h <= 0) return "Deadline passed";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min left`;
  if (h < 48) return `${Math.floor(h)} h left`;
  return `${Math.floor(h / 24)} days left`;
}

export function kg(n: number): string {
  return `${n.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg`;
}
