from pymongo import MongoClient

from app.config import settings

client = MongoClient(settings.mongodb_uri)
db = client[settings.mongodb_db]

users_collection = db["users"]
users_collection.create_index("email", unique=True)

organizations_collection = db["organizations"]
organizations_collection.create_index("owner_user_id")

memberships_collection = db["memberships"]
memberships_collection.create_index([("org_id", 1), ("user_id", 1)], unique=True)
memberships_collection.create_index("user_id")

inboxes_collection = db["inboxes"]
inboxes_collection.create_index("org_id")

filters_collection = db["filters"]
filters_collection.create_index("org_id")

member_inbox_access_collection = db["member_inbox_access"]
member_inbox_access_collection.create_index(
    [("org_id", 1), ("user_id", 1), ("inbox_id", 1)], unique=True
)
