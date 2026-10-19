"""Idempotent seed: admin account + clearly-flagged DEMO records (is_demo=True).
Run: cd /app/backend && python seed.py
Never deletes real (non-demo) data. Demo donations are refreshed so their deadlines stay in the future."""

import asyncio
from datetime import timedelta

from lib.auth import hash_password
from lib.db import db, ensure_indexes
from models.schemas import new_id, now_utc

ADMIN = ("admin@resqmeal.in", "Admin@12345")
DEMO_DONOR = ("donor@demo.resqmeal.in", "Donor@12345")
DEMO_RECIPIENT = ("recipient@demo.resqmeal.in", "Recipient@12345")

RECIPIENTS = [
    # email, org, area, city, categories, capacity, demand, status
    (DEMO_RECIPIENT[0], "Annapurna Community Kitchen (Demo)", "Koramangala", "Bengaluru",
     ["cooked_meals", "bakery", "fruits_vegetables"], 60, "high", "verified"),
    ("hope@demo.resqmeal.in", "Hope Shelter Trust (Demo)", "Indiranagar", "Bengaluru",
     ["cooked_meals", "packaged_dry", "dairy"], 25, "medium", "verified"),
    ("seva@demo.resqmeal.in", "Seva Food Bank (Demo)", "Andheri", "Mumbai",
     ["packaged_dry", "fruits_vegetables", "beverages", "bakery"], 120, "high", "verified"),
    ("newngo@demo.resqmeal.in", "Little Hands NGO (Demo, unverified)", "Koramangala", "Bengaluru",
     ["cooked_meals", "bakery"], 40, "high", "pending"),
]


async def upsert_user(email: str, password: str, **fields) -> str:
    existing = await db.users.find_one({"email": email})
    if existing:
        await db.users.update_one({"email": email}, {"$set": fields})
        return existing["id"]
    uid = new_id()
    await db.users.insert_one({
        "id": uid, "email": email, "password_hash": hash_password(password), "created_at": now_utc(),
        "accepted_categories": [], "capacity_kg": None, "demand_level": None, "verification_status": None,
        **fields,
    })
    return uid


async def main() -> None:
    await ensure_indexes()
    await upsert_user(ADMIN[0], ADMIN[1], role="admin", name="ResQMeal Admin", org_name="ResQMeal",
                      area="HQ", city="Bengaluru", is_demo=False)
    donor_id = await upsert_user(DEMO_DONOR[0], DEMO_DONOR[1], role="donor", name="Demo Donor",
                                 org_name="Green Leaf Café (Demo)", area="Koramangala", city="Bengaluru", is_demo=True)
    for email, org, area, city, cats, cap, demand, status in RECIPIENTS:
        pw = DEMO_RECIPIENT[1]
        await upsert_user(email, pw, role="recipient", name=org.split(" (")[0] + " Coordinator", org_name=org,
                          area=area, city=city, accepted_categories=cats, capacity_kg=cap, demand_level=demand,
                          verification_status=status, is_demo=True)

    # Refresh demo donations only (real ones untouched)
    await db.allocations.delete_many({"is_demo": True})
    await db.donations.delete_many({"is_demo": True})
    now = now_utc()
    demo = [
        ("Veg biryani trays", "cooked_meals", 18, "Koramangala", "Bengaluru", 5, ["dairy"], "Keep hot above 60°C or chill within 2 h."),
        ("Assorted bread & buns", "bakery", 9, "Indiranagar", "Bengaluru", 20, ["gluten", "eggs"], "Store dry, ambient."),
        ("Seasonal fruit crates", "fruits_vegetables", 35, "Andheri", "Mumbai", 30, [], "Keep cool and ventilated."),
        ("Packaged rice & dal kits", "packaged_dry", 150, "Andheri", "Mumbai", 72, [], "Exceeds every demo recipient's capacity — shows the no-match state."),
    ]
    for item, cat, qty, area, city, hrs, allergens, notes in demo:
        await db.donations.insert_one({
            "id": new_id(), "donor_id": donor_id, "donor_email": DEMO_DONOR[0], "donor_name": "Green Leaf Café (Demo)",
            "food_item": item, "category": cat, "quantity_kg": float(qty), "pickup_area": area, "pickup_city": city,
            "pickup_address": "Demo address — not a real location", "available_until": now + timedelta(hours=hrs),
            "allergens": allergens, "handling_notes": notes, "safety_confirmed": True, "status": "available",
            "is_demo": True, "created_at": now,
        })
    print("Seed complete")


if __name__ == "__main__":
    asyncio.run(main())
