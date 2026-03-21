import json
from pathlib import Path

from .database import get_connection

SEED_FILE = Path(__file__).parent.parent / "seed_data" / "neetcode_problems.json"


def seed_problems():
    if not SEED_FILE.exists():
        print(f"Seed file not found: {SEED_FILE}")
        return

    with open(SEED_FILE) as f:
        problems = json.load(f)

    conn = get_connection()
    for p in problems:
        conn.execute(
            """INSERT OR IGNORE INTO problems
               (title, slug, url, difficulty, topic, neetcode_75, neetcode_150, neetcode_250, neetcode_all)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                p["title"],
                p["slug"],
                p["url"],
                p["difficulty"],
                p["topic"],
                p.get("neetcode_75", False),
                p.get("neetcode_150", False),
                p.get("neetcode_250", False),
                p.get("neetcode_all", True),
            ),
        )
    conn.commit()
    conn.close()
    print(f"Seeded {len(problems)} problems")
