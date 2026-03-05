from dotenv import load_dotenv
import os

load_dotenv()

POCKETBASE_URL = os.getenv("POCKETBASE_URL", "https://personal-news-db.hendrikslab.online")
POCKETBASE_ADMIN_EMAIL = os.getenv("POCKETBASE_ADMIN_EMAIL", "")
POCKETBASE_ADMIN_PASSWORD = os.getenv("POCKETBASE_ADMIN_PASSWORD", "")
PORT = int(os.getenv("PORT", "8000"))
FETCH_INTERVAL_MINUTES = int(os.getenv("FETCH_INTERVAL_MINUTES", "30"))
MAX_ARTICLES_PER_FEED = int(os.getenv("MAX_ARTICLES_PER_FEED", "20"))
