"""RescueIQ — a transparent, rule-based recipient matching score (0-100).

This is NOT machine learning. Every point is explained by a reason the donor can read.
Proximity is a text comparison of area/city (no GPS / mapping integration is configured).
"""

from datetime import datetime, timezone

CATEGORY_LABELS = {
    "cooked_meals": "Cooked meals",
    "bakery": "Bakery",
    "fruits_vegetables": "Fruits & vegetables",
    "dairy": "Dairy",
    "packaged_dry": "Packaged / dry goods",
    "beverages": "Beverages",
    "other": "Other",
}

MIN_HOURS_FOR_PICKUP = 1.0
ACTIVE_LOAD_STATUSES = ("accepted",)  # allocations still waiting to be collected


def aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def hours_left(donation: dict) -> float:
    return (aware(donation["available_until"]) - datetime.now(timezone.utc)).total_seconds() / 3600


def _norm(s: str) -> str:
    return (s or "").strip().lower()


def eligibility(donation: dict, recipient: dict, open_load_kg: float) -> str | None:
    """Return a human reason the recipient is NOT eligible, or None if eligible."""
    if recipient.get("verification_status") != "verified":
        return "Organisation not yet verified by an admin"
    if donation["category"] not in (recipient.get("accepted_categories") or []):
        return f"Does not accept {CATEGORY_LABELS.get(donation['category'], donation['category'])}"
    remaining = float(recipient.get("capacity_kg") or 0) - open_load_kg
    if donation["quantity_kg"] > remaining:
        return f"Not enough remaining capacity ({max(remaining, 0):.1f} kg free, {donation['quantity_kg']:.1f} kg needed)"
    if hours_left(donation) < MIN_HOURS_FOR_PICKUP:
        return "Too little time left before the deadline for a safe pickup"
    return None


def score(donation: dict, recipient: dict, open_load_kg: float) -> tuple[float, list[dict]]:
    reasons: list[dict] = []
    cat = CATEGORY_LABELS.get(donation["category"], donation["category"])

    reasons.append({
        "key": "category", "label": "Category compatibility", "points": 25, "max_points": 25,
        "detail": f"Accepts {cat}",
    })

    # Proximity: text-based only
    same_city = _norm(donation["pickup_city"]) == _norm(recipient.get("city", ""))
    same_area = same_city and _norm(donation["pickup_area"]) == _norm(recipient.get("area", ""))
    if same_area:
        p, d = 25, f"Same area ({recipient['area']}, {recipient['city']})"
    elif same_city:
        p, d = 12, f"Same city ({recipient['city']}), different area"
    else:
        p, d = 0, f"Different city ({recipient.get('city', '—')})"
    reasons.append({"key": "proximity", "label": "Proximity (text match, no GPS)", "points": p, "max_points": 25, "detail": d})

    # Capacity fit: prefer recipients that can use the food without being overloaded
    remaining = float(recipient.get("capacity_kg") or 0) - open_load_kg
    util = donation["quantity_kg"] / remaining if remaining > 0 else 1
    if util >= 0.5:
        p = 20
    elif util >= 0.2:
        p = 14
    else:
        p = 8
    reasons.append({
        "key": "capacity", "label": "Quantity vs capacity", "points": p, "max_points": 20,
        "detail": f"{donation['quantity_kg']:.1f} kg uses {util * 100:.0f}% of {remaining:.1f} kg free capacity",
    })

    demand = recipient.get("demand_level") or "low"
    p = {"high": 15, "medium": 10, "low": 5}.get(demand, 5)
    reasons.append({"key": "demand", "label": "Stated demand", "points": p, "max_points": 15, "detail": f"{demand.capitalize()} demand (self-reported)"})

    h = hours_left(donation)
    if h >= 6:
        p, d = 10, f"{h:.0f} h left — comfortable pickup window"
    elif h >= 3:
        p, d = 6, f"{h:.1f} h left — pickup soon"
    else:
        p, d = 3, f"{h:.1f} h left — urgent, best for nearby recipients"
    reasons.append({"key": "time", "label": "Time to deadline", "points": p, "max_points": 10, "detail": d})

    reasons.append({"key": "verified", "label": "Verification", "points": 5, "max_points": 5, "detail": "Verified by ResQMeal admin"})

    total = round(sum(r["points"] for r in reasons), 1)
    return total, reasons
