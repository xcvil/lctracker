"""Fetch the complete NeetCode problem list and update seed JSON.

Usage:
    cd backend
    uv run python scripts/fetch_neetcode.py

Data sources:
1. NeetCode's main.js bundle — contains ALL problem data with neetcode250, neetcode150,
   blind75 flags (the JS bundle embeds the full problem database)
2. Fallback: .problemSiteData.json from GitHub (only has neetcode150/blind75)

The script:
1. Downloads neetcode.io's main JS bundle
2. Extracts all problem objects with their flags
3. Merges with existing seed data
4. Writes the updated seed JSON
"""

import json
import re
import urllib.request
from pathlib import Path

NEETCODE_PAGE_URL = "https://neetcode.io/practice/practice/neetcode250"
SEED_FILE = Path(__file__).parent.parent / "seed_data" / "neetcode_problems.json"

TOPIC_MAP = {
    "1-D DP": "1-D Dynamic Programming",
    "2-D DP": "2-D Dynamic Programming",
}


def fetch_main_js() -> str:
    """Download neetcode.io page, find main.js URL, download it."""
    print("Fetching neetcode.io page...")
    req = urllib.request.Request(
        NEETCODE_PAGE_URL,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8")

    # Find main.*.js filename
    match = re.search(r'src="(main\.[a-f0-9]+\.js)"', html)
    if not match:
        raise RuntimeError("Could not find main.js bundle URL in page")

    main_js_filename = match.group(1)
    main_js_url = f"https://neetcode.io/{main_js_filename}"
    print(f"Downloading {main_js_url}...")

    req = urllib.request.Request(
        main_js_url,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        js_content = resp.read().decode("utf-8")

    print(f"  Downloaded {len(js_content)} bytes")
    return js_content


def extract_problems(js_content: str) -> list[dict]:
    """Extract problem objects from the minified JS bundle.

    Problems look like:
    {problem:"Title",pattern:"Topic",link:"slug/",difficulty:"Easy",
     neetcode150:!0,blind75:!0,neetcode250:!0,...}
    """
    # Match problem objects — they all have problem:"..." and link:"..."
    pattern = r'\{[^{}]*problem:"([^"]+)"[^{}]*pattern:"([^"]+)"[^{}]*link:"([^"]+)"[^{}]*difficulty:"([^"]+)"[^{}]*\}'
    matches = re.finditer(pattern, js_content)

    problems = []
    seen_slugs = set()

    for m in matches:
        obj_text = m.group(0)
        title = m.group(1)
        topic = m.group(2)
        slug = m.group(3).rstrip("/")
        difficulty = m.group(4)

        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)

        is_75 = "blind75:!0" in obj_text
        is_150 = "neetcode150:!0" in obj_text
        is_250 = "neetcode250:!0" in obj_text

        topic = TOPIC_MAP.get(topic, topic)

        problems.append({
            "title": title,
            "slug": slug,
            "url": f"https://leetcode.com/problems/{slug}/",
            "difficulty": difficulty,
            "topic": topic,
            "neetcode_75": is_75,
            "neetcode_150": is_150,
            "neetcode_250": is_250,
            "neetcode_all": True,
        })

    # Summary
    n75 = sum(1 for p in problems if p["neetcode_75"])
    n150 = sum(1 for p in problems if p["neetcode_150"])
    n250 = sum(1 for p in problems if p["neetcode_250"])
    topics = set(p["topic"] for p in problems)

    print(f"  Extracted {len(problems)} unique problems across {len(topics)} topics")
    print(f"  NeetCode 75: {n75}, 150: {n150}, 250: {n250}")

    return problems


def load_existing_seed() -> tuple[list[dict], dict[str, dict]]:
    """Load existing seed data."""
    if not SEED_FILE.exists():
        return [], {}
    with open(SEED_FILE) as f:
        data = json.load(f)
    slug_map = {p["slug"]: p for p in data}
    return data, slug_map


def main():
    # 1. Fetch and extract
    js_content = fetch_main_js()
    neetcode_problems = extract_problems(js_content)

    if not neetcode_problems:
        print("ERROR: No problems extracted. NeetCode may have changed their bundle format.")
        return

    # 2. Replace seed with NeetCode data (single source of truth)
    n75 = sum(1 for p in neetcode_problems if p["neetcode_75"])
    n150 = sum(1 for p in neetcode_problems if p["neetcode_150"])
    n250 = sum(1 for p in neetcode_problems if p["neetcode_250"])

    print(f"\nFinal totals:")
    print(f"  NeetCode 75:  {n75}")
    print(f"  NeetCode 150: {n150}")
    print(f"  NeetCode 250: {n250}")
    print(f"  Total:        {len(neetcode_problems)}")

    # 3. Write
    with open(SEED_FILE, "w") as f:
        json.dump(neetcode_problems, f, indent=2, ensure_ascii=False)

    print(f"\nSeed file written: {SEED_FILE}")
    print("Restart backend or click Sync to load changes.")


if __name__ == "__main__":
    main()
