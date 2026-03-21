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
    seed_slugs = set()

    for p in problems:
        seed_slugs.add(p["slug"])
        conn.execute(
            """INSERT INTO problems
               (title, slug, url, difficulty, topic, neetcode_75, neetcode_150, neetcode_250, neetcode_all)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(slug) DO UPDATE SET
                 title = excluded.title,
                 url = excluded.url,
                 difficulty = excluded.difficulty,
                 topic = excluded.topic,
                 neetcode_75 = excluded.neetcode_75,
                 neetcode_150 = excluded.neetcode_150,
                 neetcode_250 = excluded.neetcode_250,
                 neetcode_all = excluded.neetcode_all""",
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

    # Remove problems that are no longer in the seed JSON
    # Must clean up related user data first (progress, reviews, notes)
    stale_ids = conn.execute(
        f"SELECT id FROM problems WHERE slug NOT IN ({','.join('?' * len(seed_slugs))})",
        list(seed_slugs),
    ).fetchall()

    if stale_ids:
        stale_id_list = [r["id"] for r in stale_ids]
        placeholders = ",".join("?" * len(stale_id_list))
        conn.execute(f"DELETE FROM notes WHERE problem_id IN ({placeholders})", stale_id_list)
        conn.execute(f"DELETE FROM review_log WHERE problem_id IN ({placeholders})", stale_id_list)
        conn.execute(f"DELETE FROM problem_progress WHERE problem_id IN ({placeholders})", stale_id_list)
        conn.execute(f"DELETE FROM problems WHERE id IN ({placeholders})", stale_id_list)
        print(f"Removed {len(stale_id_list)} stale problems")

    conn.commit()
    conn.close()
    print(f"Synced {len(problems)} problems")
