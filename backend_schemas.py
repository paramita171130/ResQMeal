"""Pydantic v2 models for ResQMeal. Mirrored by hand in frontend/src/lib/types.ts — keep in sync."""

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

Role = Literal["donor", "recipient", "admin"]
Category = Literal[
    "cooked_meals", "bakery", "fruits_vegetables", "dairy", "packaged_dry", "beverages", "other"
]
Allergen = Literal["gluten", "dairy", "nuts", "peanuts", "soy", "eggs", "fish", "shellfish", "sesame"]
DemandLevel = Literal["low", "medium", "high"]
Verification = Literal["pending", "verified", "rejected"]
DonationStatus = Literal["available", "matched", "collected", "distributed"]
AllocationStatus = Literal[
    "pending", "accepted", "collected", "distributed", "declined", "cancelled", "superseded"
]

CATEGORIES: list[str] = list(Category.__args__)  # type: ignore[attr-defined]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


def _clean(v: Optional[str]) -> Optional[str]:
    return v.strip() if isinstance(v, str) else v


# ---------- users ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["donor", "recipient"]
    name: str = Field(min_length=2, max_length=80)
    org_name: str = Field(min_length=2, max_length=120)
    area: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=2, max_length=60)
    # recipient-only
    accepted_categories: List[Category] = Field(default_factory=list)
    capacity_kg: Optional[float] = Field(default=None, gt=0, le=5000)
    demand_level: Optional[DemandLevel] = None

    _strip = field_validator("name", "org_name", "area", "city", mode="before")(_clean)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: str
    email: str
    role: Role
    name: str
    org_name: str
    area: str
    city: str
    accepted_categories: List[str] = Field(default_factory=list)
    capacity_kg: Optional[float] = None
    demand_level: Optional[str] = None
    verification_status: Optional[Verification] = None
    is_demo: bool = False
    created_at: datetime


class OrgOut(BaseModel):
    """Admin view of a recipient organisation."""
    id: str
    email: str
    name: str
    org_name: str
    area: str
    city: str
    accepted_categories: List[str]
    capacity_kg: Optional[float] = None
    demand_level: Optional[str] = None
    verification_status: Verification
    is_demo: bool = False
    created_at: datetime


class VerifyIn(BaseModel):
    status: Verification


# ---------- donations ----------
class DonationIn(BaseModel):
    donor_name: str = Field(min_length=2, max_length=120)
    food_item: str = Field(min_length=2, max_length=120)
    category: Category
    quantity_kg: float = Field(gt=0, le=2000)
    pickup_area: str = Field(min_length=2, max_length=80)
    pickup_city: str = Field(min_length=2, max_length=60)
    pickup_address: str = Field(default="", max_length=240)
    available_until: datetime
    allergens: List[Allergen] = Field(default_factory=list, max_length=9)
    handling_notes: str = Field(default="", max_length=500)
    safety_confirmed: bool

    _strip = field_validator(
        "donor_name", "food_item", "pickup_area", "pickup_city", "pickup_address", "handling_notes",
        mode="before",
    )(_clean)

    @field_validator("safety_confirmed")
    @classmethod
    def must_confirm(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must confirm the food is safe and suitable for redistribution")
        return v

    @field_validator("quantity_kg")
    @classmethod
    def round_qty(cls, v: float) -> float:
        return round(v, 1)


class ScoreReason(BaseModel):
    key: str
    label: str
    points: float
    max_points: float
    detail: str


class AllocationOut(BaseModel):
    id: str
    donation_id: str
    donor_id: str
    recipient_id: str
    recipient_org: str
    donor_name: str
    food_item: str
    category: str
    quantity_kg: float
    pickup_area: str
    pickup_city: str
    pickup_address: Optional[str] = None  # revealed only once accepted
    counterpart_email: Optional[str] = None  # revealed only once accepted
    available_until: datetime
    allergens: List[str] = Field(default_factory=list)
    handling_notes: str = ""
    status: AllocationStatus
    initiated_by: Literal["donor", "recipient"]
    score: Optional[float] = None
    reasons: List[ScoreReason] = Field(default_factory=list)
    is_demo: bool = False
    created_at: datetime
    updated_at: datetime


class DonationOut(BaseModel):
    id: str
    donor_id: str
    donor_name: str
    food_item: str
    category: str
    quantity_kg: float
    pickup_area: str
    pickup_city: str
    pickup_address: Optional[str] = None  # owner/admin only
    available_until: datetime
    allergens: List[str] = Field(default_factory=list)
    handling_notes: str = ""
    safety_confirmed: bool
    status: DonationStatus
    expired: bool
    is_demo: bool = False
    created_at: datetime
    allocations: List[AllocationOut] = Field(default_factory=list)  # owner/admin only


class AllocationCreate(BaseModel):
    donation_id: str = Field(min_length=1, max_length=64)
    recipient_id: Optional[str] = Field(default=None, max_length=64)  # donor offers only


# ---------- RescueIQ ----------
class MatchResult(BaseModel):
    recipient_id: str
    org_name: str
    area: str
    city: str
    verification_status: Verification
    remaining_capacity_kg: float
    score: float
    reasons: List[ScoreReason]
    existing_allocation_status: Optional[str] = None


class ExcludedRecipient(BaseModel):
    org_name: str
    reason: str


class MatchResponse(BaseModel):
    donation_id: str
    method: str
    eligible: List[MatchResult]
    excluded: List[ExcludedRecipient]
    message: str
    next_steps: List[str] = Field(default_factory=list)


# ---------- stats ----------
class ImpactStats(BaseModel):
    donations_listed: int
    kg_listed: float
    kg_matched: float
    kg_redistributed: float
    verified_orgs: int


class PublicStats(BaseModel):
    live: ImpactStats
    demo: ImpactStats


class DonorStats(BaseModel):
    active: int
    matched: int
    collected: int
    distributed: int
    expired: int
    kg_listed: float
    kg_redistributed: float
    kg_confirmed_collected: float


class DemoDataInfo(BaseModel):
    demo_users: int
    demo_donations: int
    demo_allocations: int


class OkOut(BaseModel):
    ok: bool = True
    message: str = ""
