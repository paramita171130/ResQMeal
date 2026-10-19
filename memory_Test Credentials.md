# Test Credentials
# Agent writes here when creating/modifying auth credentials (admin accounts, test users).
# Testing agent reads this before auth tests. Fork/continuation agents read on startup.

Seeded by `cd /app/backend && python seed.py` (idempotent):

| Role | Email | Password | Notes |
|---|---|---|---|
| admin | admin@resqmeal.in | Admin@12345 | real (non-demo) admin; verify orgs, clear demo data |
| donor | donor@demo.resqmeal.in | Donor@12345 | DEMO donor "Green Leaf Café (Demo)", Koramangala, Bengaluru |
| recipient (verified) | recipient@demo.resqmeal.in | Recipient@12345 | "Annapurna Community Kitchen (Demo)", Koramangala, Bengaluru, cap 60kg, cooked_meals/bakery/fruits_vegetables |
| recipient (verified) | hope@demo.resqmeal.in | Recipient@12345 | Indiranagar, Bengaluru, cap 25kg |
| recipient (verified) | seva@demo.resqmeal.in | Recipient@12345 | Andheri, Mumbai, cap 120kg |
| recipient (pending) | newngo@demo.resqmeal.in | Recipient@12345 | unverified — cannot request |

Auth = httpOnly cookie `rq_session` (JWT), Secure flag controlled by COOKIE_SECURE in backend/.env.
