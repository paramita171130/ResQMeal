"""Allocation workflow (whole-donation, one accepted recipient per donation).

pending --(other party accepts)--> accepted --(recipient)--> collected --(recipient)--> distributed
pending --(other party)--> declined ; pending/accepted --(either party)--> cancelled
Food is never marked distributed by listing or matching — only by the recipient's explicit action.
"""

from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import current_user, require_role
from lib.db import db
from lib.rescueiq import eligibility, score
from models.schemas import AllocationCreate, AllocationOut, new_id, now_utc
from routers.donations import alloc_out, is_expired

router = APIRouter(prefix="/allocations", tags=["allocations"])

Action = Literal["accept", "decline", "cancel", "collect", "distribute"]


async def open_load(recipient_id: str) -> float:
    total = 0.0
    async for a in db.allocations.find({"recipient_id": recipient_id, "status": "accepted"}, {"quantity_kg": 1}):
        total += a["quantity_kg"]
    return total


@router.post("", response_model=AllocationOut, status_code=201)
async def create_allocation(body: AllocationCreate, user: dict = Depends(require_role("donor", "recipient"))):
    d = await db.donations.find_one({"id": body.donation_id}, {"_id": 0})
    if user["role"] == "donor":
        if not d or d["donor_id"] != user["id"]:
            raise HTTPException(status_code=404, detail="Donation not found")
        if not body.recipient_id:
            raise HTTPException(status_code=422, detail="Choose a recipient to offer this donation to")
        recipient = await db.users.find_one({"id": body.recipient_id, "role": "recipient"}, {"_id": 0})
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient not found")
    else:
        if not d:
            raise HTTPException(status_code=404, detail="Donation not found")
        recipient = user
    if d["status"] != "available" or is_expired(d):
        raise HTTPException(status_code=409, detail="This donation is no longer available")
    load = await open_load(recipient["id"])
    why = eligibility(d, recipient, load)
    if why:
        raise HTTPException(status_code=409, detail=f"Not eligible: {why}")
    if await db.allocations.find_one({"donation_id": d["id"], "recipient_id": recipient["id"], "status": {"$in": ["pending", "accepted", "collected"]}}):
        raise HTTPException(status_code=409, detail="A request or offer already exists for this recipient")
    total, reasons = score(d, recipient, load)
    now = now_utc()
    doc = {
        "id": new_id(),
        "donation_id": d["id"],
        "donor_id": d["donor_id"],
        "donor_email": d.get("donor_email"),
        "recipient_id": recipient["id"],
        "recipient_org": recipient["org_name"],
        "recipient_email": recipient["email"],
        "donor_name": d["donor_name"],
        "food_item": d["food_item"],
        "category": d["category"],
        "quantity_kg": d["quantity_kg"],
        "pickup_area": d["pickup_area"],
        "pickup_city": d["pickup_city"],
        "pickup_address": d.get("pickup_address", ""),
        "available_until": d["available_until"],
        "allergens": d.get("allergens", []),
        "handling_notes": d.get("handling_notes", ""),
        "status": "pending",
        "initiated_by": user["role"],
        "score": total,
        "reasons": reasons,
        "is_demo": bool(d.get("is_demo")),
        "created_at": now,
        "updated_at": now,
    }
    await db.allocations.insert_one(doc)
    return alloc_out(doc, user)


@router.get("", response_model=List[AllocationOut])
async def list_allocations(user: dict = Depends(current_user)):
    if user["role"] == "recipient":
        q = {"recipient_id": user["id"]}
    elif user["role"] == "donor":
        q = {"donor_id": user["id"]}
    else:
        q = {}
    docs = await db.allocations.find(q, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    return [alloc_out(a, user) for a in docs]


@router.post("/{allocation_id}/{action}", response_model=AllocationOut)
async def act(allocation_id: str, action: Action, user: dict = Depends(require_role("donor", "recipient"))):
    a = await db.allocations.find_one({"id": allocation_id}, {"_id": 0})
    party = None
    if a and a["donor_id"] == user["id"]:
        party = "donor"
    elif a and a["recipient_id"] == user["id"]:
        party = "recipient"
    if not a or not party:
        raise HTTPException(status_code=404, detail="Allocation not found")

    now = now_utc()
    st = a["status"]

    async def set_status(new: str, donation_status: str | None = None) -> None:
        res = await db.allocations.update_one({"id": a["id"], "status": st}, {"$set": {"status": new, "updated_at": now}})
        if res.modified_count != 1:
            raise HTTPException(status_code=409, detail="This allocation changed in the meantime. Refresh and try again")
        if donation_status:
            await db.donations.update_one({"id": a["donation_id"]}, {"$set": {"status": donation_status}})
        a["status"], a["updated_at"] = new, now

    if action in ("accept", "decline"):
        if st != "pending" or party == a["initiated_by"]:
            raise HTTPException(status_code=403, detail="Only the other party can respond to a pending request")
        if action == "decline":
            await set_status("declined")
        else:
            d = await db.donations.find_one({"id": a["donation_id"]}, {"_id": 0})
            if not d or is_expired(d):
                raise HTTPException(status_code=409, detail="This donation is no longer available")
            recipient = await db.users.find_one({"id": a["recipient_id"]}, {"_id": 0})
            why = eligibility(d, recipient or {}, await open_load(a["recipient_id"]))
            if why:
                raise HTTPException(status_code=409, detail=f"Cannot accept: {why}")
            # Atomic claim prevents two conflicting allocations for the same donation
            claimed = await db.donations.update_one({"id": d["id"], "status": "available"}, {"$set": {"status": "matched"}})
            if claimed.modified_count != 1:
                raise HTTPException(status_code=409, detail="This donation has already been matched")
            await set_status("accepted")
            await db.allocations.update_many(
                {"donation_id": d["id"], "status": "pending", "id": {"$ne": a["id"]}},
                {"$set": {"status": "superseded", "updated_at": now}},
            )
    elif action == "cancel":
        if st == "pending" and party == a["initiated_by"]:
            await set_status("cancelled")
        elif st == "accepted":
            await set_status("cancelled", "available")
        else:
            raise HTTPException(status_code=403, detail="This allocation cannot be cancelled now")
    elif action == "collect":
        if party != "recipient" or st != "accepted":
            raise HTTPException(status_code=403, detail="Only the recipient can confirm collection of an accepted allocation")
        await set_status("collected", "collected")
    elif action == "distribute":
        if party != "recipient" or st != "collected":
            raise HTTPException(status_code=403, detail="Mark the food as collected before reporting distribution")
        await set_status("distributed", "distributed")
    return alloc_out(a, user)
