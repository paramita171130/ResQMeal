from fastapi import APIRouter, Depends, HTTPException, Response

from lib.auth import clear_session, current_user, hash_password, set_session, verify_password
from lib.db import db
from models.schemas import LoginIn, OkOut, RegisterIn, UserOut, new_id, now_utc

router = APIRouter(prefix="/auth", tags=["auth"])


def to_user_out(u: dict) -> UserOut:
    return UserOut(**{k: v for k, v in u.items() if k != "password_hash"})


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    doc = {
        "id": new_id(),
        "email": email,
        "password_hash": hash_password(body.password),
        "role": body.role,  # only donor | recipient can self-register
        "name": body.name,
        "org_name": body.org_name,
        "area": body.area,
        "city": body.city,
        "accepted_categories": [],
        "capacity_kg": None,
        "demand_level": None,
        "verification_status": None,
        "is_demo": False,
        "created_at": now_utc(),
    }
    if body.role == "recipient":
        if not body.accepted_categories or not body.capacity_kg or not body.demand_level:
            raise HTTPException(
                status_code=422,
                detail="Recipient organisations must provide accepted categories, capacity and demand level",
            )
        doc.update(
            accepted_categories=list(dict.fromkeys(body.accepted_categories)),
            capacity_kg=round(body.capacity_kg, 1),
            demand_level=body.demand_level,
            verification_status="pending",
        )
    await db.users.insert_one(doc)
    set_session(response, doc["id"])
    return to_user_out(doc)


@router.post("/login", response_model=UserOut)
async def login(body: LoginIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    set_session(response, user["id"])
    return to_user_out(user)


@router.post("/logout", response_model=OkOut)
async def logout(response: Response):
    clear_session(response)
    return OkOut(message="Signed out")


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(current_user)):
    return to_user_out(user)
