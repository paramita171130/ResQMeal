// Hand-written mirrors of backend/models/schemas.py — keep in sync.

export type Role = "donor" | "recipient" | "admin";
export type Category =
  | "cooked_meals"
  | "bakery"
  | "fruits_vegetables"
  | "dairy"
  | "packaged_dry"
  | "beverages"
  | "other";
export type Allergen =
  | "gluten"
  | "dairy"
  | "nuts"
  | "peanuts"
  | "soy"
  | "eggs"
  | "fish"
  | "shellfish"
  | "sesame";
export type DemandLevel = "low" | "medium" | "high";
export type Verification = "pending" | "verified" | "rejected";
export type DonationStatus = "available" | "matched" | "collected" | "distributed";
export type AllocationStatus =
  | "pending"
  | "accepted"
  | "collected"
  | "distributed"
  | "declined"
  | "cancelled"
  | "superseded";

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  org_name: string;
  area: string;
  city: string;
  accepted_categories: string[];
  capacity_kg: number | null;
  demand_level: string | null;
  verification_status: Verification | null;
  is_demo: boolean;
  created_at: string;
}

export interface RegisterIn {
  email: string;
  password: string;
  role: "donor" | "recipient";
  name: string;
  org_name: string;
  area: string;
  city: string;
  accepted_categories: Category[];
  capacity_kg: number | null;
  demand_level: DemandLevel | null;
}

export interface Org {
  id: string;
  email: string;
  name: string;
  org_name: string;
  area: string;
  city: string;
  accepted_categories: string[];
  capacity_kg: number | null;
  demand_level: string | null;
  verification_status: Verification;
  is_demo: boolean;
  created_at: string;
}

export interface DonationIn {
  donor_name: string;
  food_item: string;
  category: Category;
  quantity_kg: number;
  pickup_area: string;
  pickup_city: string;
  pickup_address: string;
  available_until: string;
  allergens: Allergen[];
  handling_notes: string;
  safety_confirmed: boolean;
}

export interface ScoreReason {
  key: string;
  label: string;
  points: number;
  max_points: number;
  detail: string;
}

export interface Allocation {
  id: string;
  donation_id: string;
  donor_id: string;
  recipient_id: string;
  recipient_org: string;
  donor_name: string;
  food_item: string;
  category: string;
  quantity_kg: number;
  pickup_area: string;
  pickup_city: string;
  pickup_address: string | null;
  counterpart_email: string | null;
  available_until: string;
  allergens: string[];
  handling_notes: string;
  status: AllocationStatus;
  initiated_by: "donor" | "recipient";
  score: number | null;
  reasons: ScoreReason[];
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  donor_id: string;
  donor_name: string;
  food_item: string;
  category: string;
  quantity_kg: number;
  pickup_area: string;
  pickup_city: string;
  pickup_address: string | null;
  available_until: string;
  allergens: string[];
  handling_notes: string;
  safety_confirmed: boolean;
  status: DonationStatus;
  expired: boolean;
  is_demo: boolean;
  created_at: string;
  allocations: Allocation[];
}

export interface MatchResult {
  recipient_id: string;
  org_name: string;
  area: string;
  city: string;
  verification_status: Verification;
  remaining_capacity_kg: number;
  score: number;
  reasons: ScoreReason[];
  existing_allocation_status: string | null;
}

export interface ExcludedRecipient {
  org_name: string;
  reason: string;
}

export interface MatchResponse {
  donation_id: string;
  method: string;
  eligible: MatchResult[];
  excluded: ExcludedRecipient[];
  message: string;
  next_steps: string[];
}

export interface ImpactStats {
  donations_listed: number;
  kg_listed: number;
  kg_matched: number;
  kg_redistributed: number;
  verified_orgs: number;
}

export interface PublicStats {
  live: ImpactStats;
  demo: ImpactStats;
}

export interface DonorStats {
  active: number;
  matched: number;
  collected: number;
  distributed: number;
  expired: number;
  kg_listed: number;
  kg_redistributed: number;
  kg_confirmed_collected: number;
}

export interface DemoDataInfo {
  demo_users: number;
  demo_donations: number;
  demo_allocations: number;
}

export interface OkOut {
  ok: boolean;
  message: string;
}
