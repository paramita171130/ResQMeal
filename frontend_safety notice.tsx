import { ShieldAlert } from "lucide-react";

export default function SafetyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="flex gap-3 rounded-2xl border border-[#FBC9A3] bg-[#FFF7F0] p-4 text-sm text-[#7C2D12]"
      data-testid="food-safety-notice"
      role="note"
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold">Food-safety responsibilities</p>
        {compact ? (
          <p>
            Only list food that is safe to eat, stored correctly and within its safe window. Declare all known allergens.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-4">
            <li>Donors list only food that is safe, hygienically prepared and stored at the right temperature.</li>
            <li>Declare all known allergens and handling needs (hot/cold holding, reheating).</li>
            <li>Recipients inspect food on collection and may refuse anything that looks or smells unsafe.</li>
            <li>Each party is responsible for safe storage and transport while food is in their care.</li>
            <li>ResQMeal does not inspect or certify food and does not hold food-safety certification.</li>
          </ul>
        )}
      </div>
    </div>
  );
}
