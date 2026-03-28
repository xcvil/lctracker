import re
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..database import get_connection

router = APIRouter(prefix="/api/custom", tags=["custom"])


class CustomProblemCreate(BaseModel):
    title: str
    difficulty: str = "Medium"
    topic: str = ""
    company: str = ""
    source: str = ""
    description: str = ""
    url: str = ""


class CustomProblemUpdate(BaseModel):
    title: str | None = None
    difficulty: str | None = None
    topic: str | None = None
    company: str | None = None
    source: str | None = None
    description: str | None = None
    url: str | None = None


def _make_slug(title: str, existing_slugs: set[str]) -> str:
    """Generate a unique slug from title."""
    slug = re.sub(r"[^a-z0-9\s-]", "", title.lower().strip())
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    slug = f"custom-{slug}" if slug else "custom-problem"
    # Ensure uniqueness
    base = slug
    counter = 1
    while slug in existing_slugs:
        slug = f"{base}-{counter}"
        counter += 1
    return slug


@router.get("")
def list_custom_problems():
    """List all custom (面经) problems."""
    conn = get_connection()
    rows = conn.execute(
        """SELECT p.*, pp.first_solved, pp.last_reviewed, pp.review_count, pp.stage, pp.next_due, pp.self_rating, pp.tags
           FROM problems p
           LEFT JOIN problem_progress pp ON p.id = pp.problem_id
           WHERE p.is_custom = 1
           ORDER BY p.id DESC"""
    ).fetchall()
    conn.close()

    from ..srs import compute_retention
    from ..models import ProblemProgress
    from datetime import date
    today = date.today()

    results = []
    for r in rows:
        import json as json_mod
        progress = None
        if r["first_solved"]:
            days_since = (today - date.fromisoformat(r["last_reviewed"])).days
            retention = compute_retention(r["stage"], days_since, r["self_rating"] or 0)
            progress = {
                "first_solved": r["first_solved"],
                "last_reviewed": r["last_reviewed"],
                "review_count": r["review_count"],
                "stage": r["stage"],
                "next_due": r["next_due"],
                "retention": retention,
                "self_rating": r["self_rating"] or 0,
                "tags": json_mod.loads(r["tags"]) if r["tags"] else [],
            }
        results.append({
            "id": r["id"],
            "title": r["title"],
            "slug": r["slug"],
            "url": r["url"],
            "difficulty": r["difficulty"],
            "topic": r["topic"],
            "company": r["company"],
            "source": r["source"],
            "description": r["description"],
            "is_custom": True,
            "progress": progress,
        })
    return results


@router.post("")
def create_custom_problem(body: CustomProblemCreate):
    """Create a new custom (面经) problem."""
    conn = get_connection()

    # Get existing slugs
    rows = conn.execute("SELECT slug FROM problems").fetchall()
    existing_slugs = {r["slug"] for r in rows}

    slug = _make_slug(body.title, existing_slugs)
    url = body.url or f"#custom-{slug}"

    conn.execute(
        """INSERT INTO problems (title, slug, url, difficulty, topic,
           neetcode_75, neetcode_150, neetcode_250, neetcode_all,
           is_custom, company, source, description)
           VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 1, ?, ?, ?)""",
        (body.title, slug, url, body.difficulty, body.topic,
         body.company, body.source, body.description),
    )
    conn.commit()

    problem_id = conn.execute("SELECT id FROM problems WHERE slug = ?", (slug,)).fetchone()["id"]
    conn.close()

    return {"ok": True, "id": problem_id, "slug": slug}


@router.put("/{problem_id}")
def update_custom_problem(problem_id: int, body: CustomProblemUpdate):
    """Update a custom problem."""
    conn = get_connection()
    problem = conn.execute(
        "SELECT * FROM problems WHERE id = ? AND is_custom = 1", (problem_id,)
    ).fetchone()
    if not problem:
        conn.close()
        raise HTTPException(status_code=404, detail="Custom problem not found")

    title = body.title if body.title is not None else problem["title"]
    difficulty = body.difficulty if body.difficulty is not None else problem["difficulty"]
    topic = body.topic if body.topic is not None else problem["topic"]
    company = body.company if body.company is not None else problem["company"]
    source = body.source if body.source is not None else problem["source"]
    description = body.description if body.description is not None else problem["description"]
    url = body.url if body.url is not None else problem["url"]

    conn.execute(
        """UPDATE problems SET title=?, difficulty=?, topic=?, company=?, source=?, description=?, url=?
           WHERE id=?""",
        (title, difficulty, topic, company, source, description, url, problem_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/{problem_id}")
def delete_custom_problem(problem_id: int):
    """Delete a custom problem and all related data."""
    conn = get_connection()
    problem = conn.execute(
        "SELECT id FROM problems WHERE id = ? AND is_custom = 1", (problem_id,)
    ).fetchone()
    if not problem:
        conn.close()
        raise HTTPException(status_code=404, detail="Custom problem not found")

    conn.execute("DELETE FROM solutions WHERE problem_id = ?", (problem_id,))
    conn.execute("DELETE FROM notes WHERE problem_id = ?", (problem_id,))
    conn.execute("DELETE FROM review_log WHERE problem_id = ?", (problem_id,))
    conn.execute("DELETE FROM problem_progress WHERE problem_id = ?", (problem_id,))
    conn.execute("DELETE FROM problems WHERE id = ?", (problem_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
