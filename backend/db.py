# /app/backend/db.py

# This is a placeholder database. In a real application, you would replace this
# with your actual database connection (e.g., PostgreSQL, Redis, etc.).
FAKE_DB = {
    # This key would come from the user's authenticated session.
    # We use a placeholder that matches the one in our main.py auth logic.
    "user_from_jwt_placeholder": {
        "wallet_address": "user_from_jwt_placeholder",
        "sscrt_key": None,  # This will be set by the frontend
        "susdc_key": None,  # This will be set by the frontend
    }
}

async def get_user(user_id: str):
    """Gets user data from the fake DB."""
    print(f"DB: Fetching user {user_id}")
    return FAKE_DB.get(user_id)

async def create_user(user_id: str):
    """Creates a new user in the fake DB if they don't exist."""
    if user_id not in FAKE_DB:
        print(f"DB: Creating new user {user_id}")
        FAKE_DB[user_id] = {
            "wallet_address": user_id,
            "sscrt_key": None,
            "susdc_key": None,
        }
    return FAKE_DB[user_id]

async def set_viewing_keys(user_id: str, sscrt_key: str, susdc_key: str):
    """Sets the viewing keys for a user in the fake DB."""
    user = FAKE_DB.get(user_id)
    if user:
        print(f"DB: Setting viewing keys for {user_id}")
        user["sscrt_key"] = sscrt_key
        user["susdc_key"] = susdc_key
    return user
