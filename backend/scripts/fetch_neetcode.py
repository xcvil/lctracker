"""Fetch the complete NeetCode problem list and update seed JSON.

Usage:
    cd backend
    uv run python scripts/fetch_neetcode.py

Data source: https://github.com/neetcode-gh/leetcode/.problemSiteData.json
This is the authoritative NeetCode problem database with 450 problems,
including difficulty, topic, and neetcode_150/blind_75 flags.

The script:
1. Fetches .problemSiteData.json from NeetCode's GitHub repo
2. Merges with existing seed data (preserves any manually added problems)
3. Correctly sets neetcode_75/150/250/all flags from the source data
4. Writes the updated seed JSON

After running, restart the backend or click "Sync" in the UI to load new problems.
"""

import json
import urllib.request
from pathlib import Path

NEETCODE_DATA_URL = (
    "https://raw.githubusercontent.com/neetcode-gh/leetcode/main/.problemSiteData.json"
)
SEED_FILE = Path(__file__).parent.parent / "seed_data" / "neetcode_problems.json"

# NeetCode 250 = NeetCode 150 + ~100 more problems
# The .problemSiteData.json has neetcode150 and blind75 flags but not neetcode250.
# We mark all NeetCode problems as neetcode_250 since they are all in the "practice" course.
# The "JavaScript" category problems are JS-specific and separate from algorithm problems.

ALGORITHM_TOPICS = {
    "Arrays & Hashing",
    "Two Pointers",
    "Sliding Window",
    "Stack",
    "Binary Search",
    "Linked List",
    "Trees",
    "Tries",
    "Heap / Priority Queue",
    "Backtracking",
    "Graphs",
    "Advanced Graphs",
    "1-D DP",
    "1-D Dynamic Programming",
    "2-D DP",
    "2-D Dynamic Programming",
    "Greedy",
    "Intervals",
    "Math & Geometry",
    "Bit Manipulation",
}

# Normalize topic names
TOPIC_MAP = {
    "1-D DP": "1-D Dynamic Programming",
    "2-D DP": "2-D Dynamic Programming",
}


def fetch_neetcode_data() -> list[dict]:
    """Fetch problem data from NeetCode's GitHub."""
    print(f"Fetching from {NEETCODE_DATA_URL}...")
    req = urllib.request.Request(
        NEETCODE_DATA_URL, headers={"User-Agent": "Mozilla/5.0"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    print(f"  Fetched {len(data)} problems from NeetCode")
    return data


def load_existing_seed() -> tuple[list[dict], dict[str, dict]]:
    """Load existing seed data."""
    if not SEED_FILE.exists():
        return [], {}
    with open(SEED_FILE) as f:
        data = json.load(f)
    slug_map = {p["slug"]: p for p in data}
    return data, slug_map


def main():
    # 1. Fetch NeetCode data
    neetcode_data = fetch_neetcode_data()

    # 2. Load existing seed
    existing_list, existing_map = load_existing_seed()
    print(f"Existing seed: {len(existing_list)} problems")

    # 3. Process NeetCode data
    added = 0
    updated = 0
    topic_counts: dict[str, int] = {}

    for nc in neetcode_data:
        slug = nc["link"].rstrip("/")
        topic = nc.get("pattern", "Uncategorized")
        topic = TOPIC_MAP.get(topic, topic)
        difficulty = nc.get("difficulty", "Medium")
        is_75 = bool(nc.get("blind75", False))
        is_150 = bool(nc.get("neetcode150", False))
        is_algo = topic in ALGORITHM_TOPICS

        topic_counts[topic] = topic_counts.get(topic, 0) + 1

        entry = {
            "title": nc["problem"],
            "slug": slug,
            "url": f"https://leetcode.com/problems/{slug}/",
            "difficulty": difficulty,
            "topic": topic,
            "neetcode_75": is_75,
            "neetcode_150": is_150,
            "neetcode_250": is_algo,  # all algo problems are in 250 scope
            "neetcode_all": True,
        }

        if slug in existing_map:
            # Update flags from authoritative source (but keep existing data)
            old = existing_map[slug]
            changed = False
            for key in ["neetcode_75", "neetcode_150", "neetcode_250", "neetcode_all", "difficulty", "topic"]:
                if old.get(key) != entry[key]:
                    old[key] = entry[key]
                    changed = True
            if changed:
                updated += 1
        else:
            existing_list.append(entry)
            existing_map[slug] = entry
            added += 1

    # 4. Print summary
    print(f"\nNeetCode topics ({len(topic_counts)}):")
    for topic, count in sorted(topic_counts.items()):
        print(f"  {topic}: {count}")

    n75 = sum(1 for p in existing_list if p.get("neetcode_75"))
    n150 = sum(1 for p in existing_list if p.get("neetcode_150"))
    n250 = sum(1 for p in existing_list if p.get("neetcode_250"))

    print(f"\nChanges:")
    print(f"  Added: {added}")
    print(f"  Updated: {updated}")
    print(f"\nTotals:")
    print(f"  NeetCode 75:  {n75}")
    print(f"  NeetCode 150: {n150}")
    print(f"  NeetCode 250: {n250}")
    print(f"  Total:        {len(existing_list)}")

    # 5. Write updated seed
    with open(SEED_FILE, "w") as f:
        json.dump(existing_list, f, indent=2, ensure_ascii=False)

    print(f"\nSeed file written: {SEED_FILE}")
    print("Restart backend or click Sync to load changes.")


if __name__ == "__main__":
    main()
