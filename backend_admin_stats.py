"""Admin org verification, impact statistics and demo-data management."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import current_user, require_role
from lib.db import db
from models.schemas import (
    DemoDataInfo, DonorStats, ImpactStats, OkOut, OrgOut, PublicStats, VerifyIn, now_utc,
)

router = APIRouter(tags=["admin", "stats"])


@router.get("/admin/organizations", response_model=List[OrgOut])
async def list_orgs(_: dict = Depends(require_role("admin"))):
    docs = await db.users.find({"role": "recipient"}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return [OrgOut(**d) for d in docs]


@router.post("/admin/organizations/{org_id}/verify", response_model=OrgOut)
async def verify_org(org_id: str, body: VerifyIn, admin: dict = Depends(require_role("admin"))):
    res = await db.users.find_one_and_update(
        {"id": org_id, "role": "recipient"},
        {"$set": {"verification_status": body.status, "verified_by": admin["id"], "verified_at": now_utc()}},
        projection={"_id": 0, "password_hash": 0},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return OrgOut(**res)


async def _impact(is_demo: bool) -> ImpactStats:
    flag = {"is_demo": True} if is_demo else {"is_demo": {"$ne": True}}
    listed = 0
    kg = 0.0
    async for d in db.donations.find(flag, {"quantity_kg": 1}):
        listed += 1
        kg += d["quantity_kg"]
    kg_matched = 0.0
    kg_dist = 0.0
    async for a in db.allocations.find({**flag, "status": {"$in": ["accepted", "collected", "distributed"]}}, {"quantity_kg": 1, "status": 1}):
        kg_matched += a["quantity_kg"]
        if a["status"] == "distributed":
            kg_dist += a["quantity_kg"]
    orgs = await db.users.count_documents({**flag, "role": "recipient", "verification_status": "verified"})
    return ImpactStats(donations_listed=listed, kg_listed=round(kg, 1), kg_matched=round(kg_matched, 1),
                       kg_redistributed=round(kg_dist, 1), verified_orgs=orgs)


@router.get("/stats/public", response_model=PublicStats)
async def public_stats():
    return PublicStats(live=await _impact(False), demo=await _impact(True))


@router.get("/stats/me", response_model=DonorStats)
async def donor_stats(user: dict = Depends(require_role("donor"))):
    now = now_utc()
    s = dict(active=0, matched=0, collected=0, distributed=0, expired=0)
    kg_listed = kg_dist = kg_coll = 0.0
    async for d in db.donations.find({"donor_id": user["id"]}, {"_id": 0}):
        kg_listed += d["quantity_kg"]
        until = d["available_until"]
        until = until if until.tzinfo else until.replace(tzinfo=now.tzinfo)
        if d["status"] == "available":
            s["expired" if until <= now else "active"] += 1
        else:
            s[d["status"]] += 1
        if d["status"] in ("collected", "distributed"):
            kg_coll += d["quantity_kg"]
        if d["status"] == "distributed":
            kg_dist += d["quantity_kg"]
    return DonorStats(**s, kg_listed=round(kg_listed, 1), kg_redistributed=round(kg_dist, 1), kg_confirmed_collected=round(kg_coll, 1))


@router.get("/demo-data", response_model=DemoDataInfo)
async def demo_data_info(_: dict = Depends(current_user)):
    return DemoDataInfo(
        demo_users=await db.users.count_documents({"is_demo": True}),
        demo_donations=await db.donations.count_documents({"is_demo": True}),
        demo_allocations=await db.allocations.count_documents({"is_demo": True}),
    )


@router.delete("/demo-data", response_model=OkOut)
async def clear_demo_data(_: dict = Depends(require_role("admin"))):
    """Removes ONLY records flagged is_demo=True. Real records are never touched."""
    a = await db.allocations.delete_many({"is_demo": True})
    d = await db.donations.delete_many({"is_demo": True})
    u = await db.users.delete_many({"is_demo": True, "role": {"$ne": "admin"}})
    return OkOut(message=f"Removed {d.deleted_count} demo donations, {a.deleted_count} demo allocations, {u.deleted_count} demo accounts")
