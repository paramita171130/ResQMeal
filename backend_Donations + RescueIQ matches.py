"""Donations + RescueIQ matches. Ownership: only the donor who created a donation (or an admin)
may see its private address, allocations and matches, or delete it."""

from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import current_user, require_role
from lib.db import db
from lib.rescueiq import aware, eligibility, score
from models.schemas import (
    AllocationOut, DonationIn, DonationOut, ExcludedRecipient, MatchResponse, MatchResult, OkOut,
    new_id, now_utc,
)

router = APIRouter(tags=["donations"])

ACTIVE_ALLOC = ["pending", "accepted", "collected"]


def is_expired(d: dict) -> bool:
    return d["status"] == "available" and aware(d["available_until"]) <= now_utc()


def alloc_out(a: dict, viewer: dict) -> AllocationOut:
    revealed = a["status"] in ("accepted", "collected", "distributed")
    data = {**a}
    data["available_until"] = aware(a["available_until"])
    data["created_at"] = aware(a["created_at"])
    data["updated_at"] = aware(a["updated_at"])
    if viewer["role"] == "admin" or revealed:
        data["counterpart_email"] = a.get("recipient_email") if viewer["id"] == a["donor_id"] else a.get("donor_email")
        if viewer["role"] == "admin":
            data["counterpart_email"] = None
    else:
        data["pickup_address"] = None
        data["counterpart_email"] = None
    return AllocationOut(**data)


def donation_out(d: dict, viewer: dict, allocations: List[dict] | None = None) -> DonationOut:
    owner = viewer["role"] == "admin" or viewer["id"] == d["donor_id"]
    data = {k: v for k, v in d.items() if k != "_id"}
    data["available_until"] = aware(d["available_until"])
    data["created_at"] = aware(d["created_at"])
    data["expired"] = is_expired(d)
    if not owner:
        data["pickup_address"] = None
    data["allocations"] = [alloc_out(a, viewer) for a in (allocations or [])] if owner else []
    return DonationOut(**data)


async def load_owned(donation_id: str, user: dict) -> dict:
    d = await db.donations.find_one({"id": donation_id}, {"_id": 0})
    if not d or (user["role"] != "admin" and d["donor_id"] != user["id"]):
        raise HTTPException(status_code=404, detail="Donation not found")
    return d


@router.post("/donations", response_model=DonationOut, status_code=201)
async def create_donation(body: DonationIn, user: dict = Depends(require_role("donor"))):
    until = aware(body.available_until)
    now = now_utc()
    if until < now + timedelta(minutes=60):
        raise HTTPException(status_code=422, detail="Available-until must be at least 1 hour from now to allow a safe pickup")
    if until > now + timedelta(days=7):
        raise HTTPException(status_code=422, detail="Available-until cannot be more than 7 days ahead")
    doc = {
        **body.model_dump(),
        "id": new_id(),
        "donor_id": user["id"],  # stamped from the session, never the body
        "donor_email": user["email"],
        "available_until": until,
        "status": "available",
        "is_demo": False,
        "created_at": now,
    }
    await db.donations.insert_one(doc)
    return donation_out(doc, user, [])


@router.get("/donations", response_model=List[DonationOut])
async def list_donations(user: dict = Depends(current_user)):
    if user["role"] == "donor":
        query = {"donor_id": user["id"]}
    elif user["role"] == "admin":
        query = {}
    else:  # recipients browse food that is still available and in date
        query = {"status": "available", "available_until": {"$gt": now_utc()}}
    docs = await db.donations.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    if user["role"] == "recipient":
        return [donation_out(d, user) for d in docs]
    ids = [d["id"] for d in docs]
    allocs = await db.allocations.find({"donation_id": {"$in": ids}}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    by_d: dict[str, list] = {}
    for a in allocs:
        by_d.setdefault(a["donation_id"], []).append(a)
    return [donation_out(d, user, by_d.get(d["id"], [])) for d in docs]


@router.get("/donations/{donation_id}", response_model=DonationOut)
async def get_donation(donation_id: str, user: dict = Depends(current_user)):
    d = await db.donations.find_one({"id": donation_id}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Donation not found")
    owner = user["role"] == "admin" or d["donor_id"] == user["id"]
    if not owner:
        # recipients may view available donations, or ones allocated to them
        mine = await db.allocations.find_one({"donation_id": donation_id, "recipient_id": user["id"]})
        if not (user["role"] == "recipient" and (d["status"] == "available" or mine)):
            raise HTTPException(status_code=404, detail="Donation not found")
        return donation_out(d, user)
    allocs = await db.allocations.find({"donation_id": donation_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return donation_out(d, user, allocs)


@router.delete("/donations/{donation_id}", response_model=OkOut)
async def delete_donation(donation_id: str, user: dict = Depends(require_role("donor", "admin"))):
    d = await load_owned(donation_id, user)
    if d["status"] in ("collected", "distributed"):
        raise HTTPException(status_code=409, detail="Collected or distributed donations are kept as impact history and cannot be deleted")
    await db.allocations.update_many(
        {"donation_id": donation_id, "status": {"$in": ["pending", "accepted"]}},
        {"$set": {"status": "cancelled", "updated_at": now_utc(), "note": "Donation deleted by donor"}},
    )
    await db.donations.delete_one({"id": donation_id})
    return OkOut(message="Donation deleted")


@router.get("/matches/{donation_id}", response_model=MatchResponse)
async def matches(donation_id: str, user: dict = Depends(require_role("donor", "admin"))):
    d = await load_owned(donation_id, user)
    base = dict(donation_id=donation_id, method="RescueIQ rule-based scoring (transparent, no AI/GPS)")
    if d["status"] != "available":
        return MatchResponse(**base, eligible=[], excluded=[], message=f"This donation is already {d['status']}; matching is closed.")
    if is_expired(d):
        return MatchResponse(**base, eligible=[], excluded=[], message="This donation has passed its available-until time and cannot be matched.",
                             next_steps=["Do not redistribute food past its safe window", "List fresh surplus as a new donation"])

    recipients = await db.users.find({"role": "recipient"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    rids = [r["id"] for r in recipients]
    loads: dict[str, float] = {}
    async for a in db.allocations.find({"recipient_id": {"$in": rids}, "status": "accepted"}, {"_id": 0}):
        loads[a["recipient_id"]] = loads.get(a["recipient_id"], 0) + a["quantity_kg"]
    existing = {a["recipient_id"]: a["status"] async for a in db.allocations.find(
        {"donation_id": donation_id, "status": {"$in": ACTIVE_ALLOC + ["declined"]}}, {"_id": 0})}

    eligible: list[MatchResult] = []
    excluded: list[ExcludedRecipient] = []
    for r in recipients:
        load = loads.get(r["id"], 0.0)
        why = eligibility(d, r, load)
        if why:
            excluded.append(ExcludedRecipient(org_name=r["org_name"], reason=why))
            continue
        total, reasons = score(d, r, load)
        eligible.append(MatchResult(
            recipient_id=r["id"], org_name=r["org_name"], area=r["area"], city=r["city"],
            verification_status=r["verification_status"], remaining_capacity_kg=round(float(r["capacity_kg"]) - load, 1),
            score=total, reasons=reasons, existing_allocation_status=existing.get(r["id"]),
        ))
    eligible.sort(key=lambda m: m.score, reverse=True)
    if eligible:
        msg = f"{len(eligible)} eligible verified recipient(s), ranked by score."
        steps: list[str] = []
    else:
        msg = "No suitable verified recipient right now."
        steps = [
            "Keep the listing open — verified recipients can still request it from their dashboard",
            "Split large quantities into smaller listings so more organisations can accept them",
            "Extend the available-until time only if the food remains safe",
            "Contact a local food bank directly if the deadline is near",
        ]
    return MatchResponse(**base, eligible=eligible, excluded=excluded, message=msg, next_steps=steps)
