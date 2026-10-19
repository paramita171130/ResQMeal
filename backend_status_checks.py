    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("email", ASCENDING)], name="email", unique=True),
        IndexModel([("role", ASCENDING), ("verification_status", ASCENDING)], name="role_verif"),
    ],
    "donations": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("donor_id", ASCENDING), ("created_at", DESCENDING)], name="donor_created"),
        IndexModel([("status", ASCENDING), ("available_until", ASCENDING)], name="status_until"),
    ],
    "allocations": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("donation_id", ASCENDING), ("status", ASCENDING)], name="donation_status"),
        IndexModel([("recipient_id", ASCENDING), ("status", ASCENDING)], name="recipient_status"),
        IndexModel([("donor_id", ASCENDING), ("updated_at", DESCENDING)], name="donor_updated"),
    ],
}