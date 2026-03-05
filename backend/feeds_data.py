"""
Curated list of RSS feeds organized by category.
"""

FEEDS = [
    # ── World News ─────────────────────────────────────────────────────────
    {
        "name": "BBC World News",
        "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
        "category": "world",
        "source": "BBC",
        "emoji": "🌍",
    },
    {
        "name": "Reuters Top News",
        "url": "https://feeds.reuters.com/reuters/topNews",
        "category": "world",
        "source": "Reuters",
        "emoji": "📡",
    },
    {
        "name": "Al Jazeera English",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "category": "world",
        "source": "Al Jazeera",
        "emoji": "🌐",
    },
    {
        "name": "The Guardian World",
        "url": "https://www.theguardian.com/world/rss",
        "category": "world",
        "source": "The Guardian",
        "emoji": "📰",
    },
    {
        "name": "Associated Press",
        "url": "https://feeds.apnews.com/rss/apf-topnews",
        "category": "world",
        "source": "AP News",
        "emoji": "🗞️",
    },

    # ── Technology ─────────────────────────────────────────────────────────
    {
        "name": "TechCrunch",
        "url": "https://techcrunch.com/feed/",
        "category": "technology",
        "source": "TechCrunch",
        "emoji": "💻",
    },
    {
        "name": "Ars Technica",
        "url": "https://feeds.arstechnica.com/arstechnica/index",
        "category": "technology",
        "source": "Ars Technica",
        "emoji": "🔬",
    },
    {
        "name": "The Verge",
        "url": "https://www.theverge.com/rss/index.xml",
        "category": "technology",
        "source": "The Verge",
        "emoji": "⚡",
    },
    {
        "name": "Wired",
        "url": "https://www.wired.com/feed/rss",
        "category": "technology",
        "source": "Wired",
        "emoji": "🔌",
    },
    {
        "name": "Hacker News",
        "url": "https://news.ycombinator.com/rss",
        "category": "technology",
        "source": "Hacker News",
        "emoji": "🟠",
    },
    {
        "name": "MIT Technology Review",
        "url": "https://www.technologyreview.com/feed/",
        "category": "technology",
        "source": "MIT Tech Review",
        "emoji": "🎓",
    },

    # ── Science ────────────────────────────────────────────────────────────
    {
        "name": "BBC Science & Environment",
        "url": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
        "category": "science",
        "source": "BBC",
        "emoji": "🧬",
    },
    {
        "name": "NASA Breaking News",
        "url": "https://www.nasa.gov/rss/dyn/breaking_news.rss",
        "category": "science",
        "source": "NASA",
        "emoji": "🚀",
    },
    {
        "name": "New Scientist",
        "url": "https://www.newscientist.com/feed/home/",
        "category": "science",
        "source": "New Scientist",
        "emoji": "🔭",
    },
    {
        "name": "Scientific American",
        "url": "https://www.scientificamerican.com/platform/syndication/rss/",
        "category": "science",
        "source": "Sci Am",
        "emoji": "⚗️",
    },
    {
        "name": "Nature News",
        "url": "https://www.nature.com/nature.rss",
        "category": "science",
        "source": "Nature",
        "emoji": "🌿",
    },

    # ── Business ───────────────────────────────────────────────────────────
    {
        "name": "BBC Business",
        "url": "https://feeds.bbci.co.uk/news/business/rss.xml",
        "category": "business",
        "source": "BBC",
        "emoji": "📊",
    },
    {
        "name": "The Guardian Business",
        "url": "https://www.theguardian.com/business/rss",
        "category": "business",
        "source": "The Guardian",
        "emoji": "💼",
    },
    {
        "name": "CNBC Top News",
        "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
        "category": "business",
        "source": "CNBC",
        "emoji": "💰",
    },
    {
        "name": "Bloomberg Markets",
        "url": "https://feeds.bloomberg.com/markets/news.rss",
        "category": "business",
        "source": "Bloomberg",
        "emoji": "📈",
    },

    # ── Health ─────────────────────────────────────────────────────────────
    {
        "name": "BBC Health",
        "url": "https://feeds.bbci.co.uk/news/health/rss.xml",
        "category": "health",
        "source": "BBC",
        "emoji": "❤️",
    },
    {
        "name": "The Guardian Health",
        "url": "https://www.theguardian.com/society/health/rss",
        "category": "health",
        "source": "The Guardian",
        "emoji": "🏥",
    },
    {
        "name": "Medical News Today",
        "url": "https://www.medicalnewstoday.com/rss/news.xml",
        "category": "health",
        "source": "MNT",
        "emoji": "💊",
    },
    {
        "name": "Harvard Health Blog",
        "url": "https://www.health.harvard.edu/blog/feed",
        "category": "health",
        "source": "Harvard Health",
        "emoji": "🩺",
    },

    # ── Sports ─────────────────────────────────────────────────────────────
    {
        "name": "BBC Sport",
        "url": "https://feeds.bbci.co.uk/sport/rss.xml",
        "category": "sports",
        "source": "BBC",
        "emoji": "⚽",
    },
    {
        "name": "ESPN",
        "url": "https://www.espn.com/espn/rss/news",
        "category": "sports",
        "source": "ESPN",
        "emoji": "🏆",
    },
    {
        "name": "The Guardian Sport",
        "url": "https://www.theguardian.com/sport/rss",
        "category": "sports",
        "source": "The Guardian",
        "emoji": "🎽",
    },

    # ── Entertainment ──────────────────────────────────────────────────────
    {
        "name": "BBC Entertainment & Arts",
        "url": "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
        "category": "entertainment",
        "source": "BBC",
        "emoji": "🎬",
    },
    {
        "name": "Variety",
        "url": "https://variety.com/feed/",
        "category": "entertainment",
        "source": "Variety",
        "emoji": "🎭",
    },
    {
        "name": "The Guardian Culture",
        "url": "https://www.theguardian.com/culture/rss",
        "category": "entertainment",
        "source": "The Guardian",
        "emoji": "🎨",
    },
    {
        "name": "Pitchfork",
        "url": "https://pitchfork.com/feed/feed-news/rss",
        "category": "entertainment",
        "source": "Pitchfork",
        "emoji": "🎵",
    },

    # ── Politics ───────────────────────────────────────────────────────────
    {
        "name": "BBC Politics",
        "url": "https://feeds.bbci.co.uk/news/politics/rss.xml",
        "category": "politics",
        "source": "BBC",
        "emoji": "🏛️",
    },
    {
        "name": "The Guardian Politics",
        "url": "https://www.theguardian.com/politics/rss",
        "category": "politics",
        "source": "The Guardian",
        "emoji": "🗳️",
    },
    {
        "name": "Politico",
        "url": "https://www.politico.com/rss/politics08.xml",
        "category": "politics",
        "source": "Politico",
        "emoji": "🏟️",
    },
]

CATEGORIES = [
    {"id": "world", "name": "World", "emoji": "🌍", "color": "blue"},
    {"id": "technology", "name": "Technology", "emoji": "💻", "color": "purple"},
    {"id": "science", "name": "Science", "emoji": "🧬", "color": "green"},
    {"id": "business", "name": "Business", "emoji": "📊", "color": "amber"},
    {"id": "health", "name": "Health", "emoji": "❤️", "color": "rose"},
    {"id": "sports", "name": "Sports", "emoji": "⚽", "color": "orange"},
    {"id": "entertainment", "name": "Entertainment", "emoji": "🎬", "color": "pink"},
    {"id": "politics", "name": "Politics", "emoji": "🏛️", "color": "indigo"},
]
