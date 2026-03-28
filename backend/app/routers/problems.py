from datetime import date

from fastapi import APIRouter, Query

import json as json_mod

from ..database import get_connection
from ..models import ProblemOut, ProblemProgress, SyncResult
from ..seed import seed_problems
from ..srs import compute_retention

router = APIRouter(prefix="/api/problems", tags=["problems"])


def _row_to_problem(r, today: date) -> ProblemOut:
    progress = None
    if r["first_solved"]:
        days_since = (today - date.fromisoformat(r["last_reviewed"])).days
        retention = compute_retention(r["stage"], days_since, r["self_rating"] or 0)
        progress = ProblemProgress(
            first_solved=r["first_solved"],
            last_reviewed=r["last_reviewed"],
            review_count=r["review_count"],
            stage=r["stage"],
            next_due=r["next_due"],
            retention=retention,
            self_rating=r["self_rating"] or 0,
            tags=json_mod.loads(r["tags"]) if r["tags"] else [],
        )
    return ProblemOut(
        id=r["id"],
        title=r["title"],
        slug=r["slug"],
        url=r["url"],
        difficulty=r["difficulty"],
        topic=r["topic"],
        neetcode_75=bool(r["neetcode_75"]),
        neetcode_150=bool(r["neetcode_150"]),
        neetcode_250=bool(r["neetcode_250"]),
        neetcode_all=bool(r["neetcode_all"]),
        progress=progress,
    )


@router.get("", response_model=list[ProblemOut])
def list_problems(
    topic: str | None = None,
    difficulty: str | None = None,
    list_name: str | None = Query(None, alias="list"),
    status: str | None = None,
    sort: str | None = None,
    tag: str | None = None,
):
    conn = get_connection()
    today = date.today()
    query = """
        SELECT p.*, pp.first_solved, pp.last_reviewed, pp.review_count, pp.stage, pp.next_due, pp.self_rating, pp.tags
        FROM problems p
        LEFT JOIN problem_progress pp ON p.id = pp.problem_id
        WHERE 1=1
    """
    params: list = []

    # By default exclude custom problems unless specifically requesting them
    if list_name == "custom":
        query += " AND p.is_custom = 1"
    elif list_name:
        pass  # handled below
    else:
        query += " AND p.is_custom = 0"

    if topic:
        query += " AND p.topic = ?"
        params.append(topic)
    if difficulty:
        query += " AND p.difficulty = ?"
        params.append(difficulty)
    if list_name and list_name != "custom":
        query += " AND p.is_custom = 0"
        col_map = {
            "neetcode_75": "p.neetcode_75",
            "neetcode_150": "p.neetcode_150",
            "neetcode_250": "p.neetcode_250",
            "neetcode_all": "p.neetcode_all",
        }
        col = col_map.get(list_name)
        if col:
            query += f" AND {col} = 1"
    if status == "solved":
        query += " AND pp.problem_id IS NOT NULL"
    elif status == "unsolved":
        query += " AND pp.problem_id IS NULL"
    elif status == "due":
        query += " AND pp.next_due <= ?"
        params.append(today.isoformat())
    if tag:
        # SQLite JSON: tags is stored as '["tag1","tag2"]', search with LIKE
        query += " AND pp.tags LIKE ?"
        params.append(f'%"{tag}"%')

    query += " ORDER BY p.topic, p.id"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    results = [_row_to_problem(r, today) for r in rows]

    # Sorting
    if sort == "retention":
        results.sort(key=lambda p: p.progress.retention if p.progress else 999)
    elif sort == "retention_desc":
        results.sort(key=lambda p: p.progress.retention if p.progress else -1, reverse=True)
    elif sort == "reviews":
        results.sort(key=lambda p: p.progress.review_count if p.progress else -1, reverse=True)
    elif sort == "reviews_desc":
        results.sort(key=lambda p: p.progress.review_count if p.progress else 999)
    elif sort == "stage":
        results.sort(key=lambda p: p.progress.stage if p.progress else -1, reverse=True)
    elif sort == "stage_desc":
        results.sort(key=lambda p: p.progress.stage if p.progress else 999)
    elif sort == "due":
        results.sort(key=lambda p: p.progress.next_due if p.progress else "9999")
    elif sort == "due_desc":
        results.sort(key=lambda p: p.progress.next_due if p.progress else "", reverse=True)
    elif sort == "rating":
        results.sort(key=lambda p: p.progress.self_rating if p.progress else -1, reverse=True)
    elif sort == "rating_desc":
        results.sort(key=lambda p: p.progress.self_rating if p.progress else 999)

    return results


@router.get("/tags", response_model=list[str])
def list_tags():
    """Get all unique tags used across problems."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT tags FROM problem_progress WHERE tags != '[]'"
    ).fetchall()
    conn.close()
    all_tags: set[str] = set()
    for r in rows:
        try:
            all_tags.update(json_mod.loads(r["tags"]))
        except Exception:
            pass
    return sorted(all_tags)


@router.get("/topics", response_model=list[str])
def list_topics():
    conn = get_connection()
    rows = conn.execute("SELECT DISTINCT topic FROM problems ORDER BY topic").fetchall()
    conn.close()
    return [r["topic"] for r in rows]


@router.post("/sync", response_model=SyncResult)
def sync_problems():
    """Re-read seed JSON and sync all problems (insert/update/delete)."""
    conn = get_connection()
    before = conn.execute("SELECT COUNT(*) as c FROM problems").fetchone()["c"]
    conn.close()

    seed_problems()

    conn = get_connection()
    after = conn.execute("SELECT COUNT(*) as c FROM problems").fetchone()["c"]
    conn.close()

    diff = after - before
    return SyncResult(added=diff if diff > 0 else 0, total=after)
