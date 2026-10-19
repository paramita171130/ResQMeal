# ResQMeal — living spec

Surplus-food rescue platform. Stack: FastAPI + MongoDB (backend/), React 19 + Vite + Tailwind v4 + shadcn (frontend/).
Note: the user's original files (api/*.js, migrations/001_resqmeal.sql, public/*) were NOT present in the workspace; the app was rebuilt on this stack with the same feature set and API names (donations, matches, delete-donation → DELETE /api/donations/{id}, demo-data).

## Roles & auth
- donor, recipient (organisation), admin. Email+password, bcrypt hashes, JWT in an httpOnly cookie. The user is re-read from the DB on every request.
- Only donor/recipient can self-register; recipients start `verification_status=pending`; an admin verifies, rejects or revokes.
- Credentials: memory/test_credentials.md.

## Data model (Mongo, string uuid `id`)
- users: id, email (unique), password_hash, role, name, org_name, area, city, accepted_categories[], capacity_kg, demand_level, verification_status, is_demo, created_at
- donations: id, donor_id, donor_email, donor_name, food_item, category, quantity_kg (0–2000), pickup_area, pickup_city, pickup_address (private), available_until (1h–7d ahead), allergens[], handling_notes, safety_confirmed (must be true), status available|matched|collected|distributed, is_demo, created_at. "expired" = available && past deadline (computed).
- allocations: whole-donation; status pending|accepted|collected|distributed|declined|cancelled|superseded; initiated_by donor|recipient; score + reasons snapshot.

## Workflow
- Donor lists → RescueIQ GET /api/matches/{id} → donor "Offer" (pending) OR recipient "Request" (pending) → the other party accepts (donation→matched, other pendings→superseded, atomic) → recipient marks collected → recipient marks distributed.
- Cancel an accepted allocation → donation back to available. Delete is blocked once collected/distributed (409).
- Pickup address + counterpart email are revealed only after acceptance.

## RescueIQ (rule-based, lib/rescueiq.py)
Eligibility: verified, accepts the category, quantity ≤ remaining capacity (capacity − accepted-uncollected kg), ≥1h to deadline.
Score/100: category 25, proximity 25 (same area 25 / same city 12, text match, no GPS), capacity fit 20, demand 15, time 10, verified 5.

## Endpoints (/api)
auth/register|login|logout|me; donations (GET, POST), donations/{id} (GET, DELETE); matches/{id}; allocations (GET, POST); allocations/{id}/{accept|decline|cancel|collect|distribute}; admin/organizations, admin/organizations/{id}/verify; stats/public (live vs demo split); stats/me (donor); demo-data (GET counts, DELETE admin-only removes is_demo records).

## Seed (backend/seed.py)
4 demo donations from the demo donor: Veg biryani 18kg cooked (Koramangala, 5h), Bread 9kg bakery (Indiranagar, 20h), Fruit 35kg (Andheri Mumbai, 30h), Rice kits 150kg packaged_dry (exceeds every capacity → no-match state). Re-running the seed refreshes demo donations/allocations only.

## Pages
/, /login, /register?role=, /dashboard (role redirect), /donor, /donations/:id, /recipient, /admin, /privacy, /terms.
Logo: frontend/public/resqmeal-logo.png if present, else a text wordmark (the user will upload the PNG).
