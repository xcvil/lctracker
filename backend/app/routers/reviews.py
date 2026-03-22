from datetime import date, datetime

from fastapi import APIRouter, HTTPException

import json as json_mod

from ..database import get_connection
from ..models import ProblemOut, ProblemProgress, ReviewLogEntry, ReviewRequest, ReviewResponse
from ..srs import compute_first_review, compute_next_review, compute_retention

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


def _row_to_problem(r) -> ProblemOut:
    today = date.today()
    days_since = (today - date.fromisoformat(r["last_reviewed"])).days
    retention = compute_retention(r["stage"], days_since, r["self_rating"] or 0)
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
        progress=ProblemProgress(
            first_solved=r["first_solved"],
            last_reviewed=r["last_reviewed"],
            review_count=r["review_count"],
            stage=r["stage"],
            next_due=r["next_due"],
            retention=retention,
            self_rating=r["self_rating"] or 0,
            tags=json_mod.loads(r["tags"]) if r["tags"] else [],
        ),
    )


@router.post("/{problem_id}", response_model=ReviewResponse)
def record_review(problem_id: int, body: ReviewRequest | None = None):
    confidence = body.confidence if body else 4
    if confidence < 1 or confidence > 5:
        raise HTTPException(status_code=400, detail="Confidence must be 1-5")

    conn = get_connection()
    today = date.today()
    now = datetime.now().isoformat()

    problem = conn.execute("SELECT id FROM problems WHERE id = ?", (problem_id,)).fetchone()
    if not problem:
        conn.close()
        raise HTTPException(status_code=404, detail="Problem not found")

    progress = conn.execute(
        "SELECT * FROM problem_progress WHERE problem_id = ?", (problem_id,)
    ).fetchone()

    if progress is None:
        # First solve — create progress, NO review_log entry
        next_due, stage = compute_first_review(today)
        conn.execute(
            """INSERT INTO problem_progress (problem_id, first_solved, last_reviewed, review_count, stage, next_due)
               VALUES (?, ?, ?, 0, ?, ?)""",
            (problem_id, today.isoformat(), today.isoformat(), stage, next_due.isoformat()),
        )
        review_count = 0

        # Create note stub for first solve (session 0)
        conn.execute(
            "INSERT INTO notes (problem_id, session, content, created_at, updated_at) VALUES (?, 0, '', ?, ?)",
            (problem_id, now, now),
        )
        conn.commit()
    else:
        review_count = progress["review_count"] + 1
        due_date = date.fromisoformat(progress["next_due"])

        if today >= due_date:
            # On or after due date — update stage based on confidence
            self_rating = progress["self_rating"] or 0
            next_due, stage = compute_next_review(progress["stage"], confidence, self_rating, today)
            conn.execute(
                """UPDATE problem_progress
                   SET last_reviewed = ?, review_count = ?, stage = ?, next_due = ?
                   WHERE problem_id = ?""",
                (today.isoformat(), review_count, stage, next_due.isoformat(), problem_id),
            )
        else:
            # Early review — record it but don't change stage/next_due
            stage = progress["stage"]
            next_due = due_date
            conn.execute(
                """UPDATE problem_progress
                   SET last_reviewed = ?, review_count = ?
                   WHERE problem_id = ?""",
                (today.isoformat(), review_count, problem_id),
            )

        conn.execute(
            "INSERT INTO review_log (problem_id, reviewed_at, date, confidence) VALUES (?, ?, ?, ?)",
            (problem_id, now, today.isoformat(), confidence),
        )

        # Create note stub for this review session
        existing_note = conn.execute(
            "SELECT id FROM notes WHERE problem_id = ? AND session = ?",
            (problem_id, review_count),
        ).fetchone()
        if not existing_note:
            conn.execute(
                "INSERT INTO notes (problem_id, session, content, created_at, updated_at) VALUES (?, ?, '', ?, ?)",
                (problem_id, review_count, now, now),
            )
        conn.commit()

    conn.close()

    return ReviewResponse(
        problem_id=problem_id,
        review_count=review_count,
        stage=stage,
        next_due=next_due.isoformat(),
        confidence=confidence,
    )


@router.put("/{problem_id}/tags")
def update_tags(problem_id: int, body: dict):
    """Update tags for a problem. Body: {"tags": ["tag1", "tag2"]}"""
    import json
    tags = body.get("tags", [])
    if not isinstance(tags, list):
        raise HTTPException(status_code=400, detail="Tags must be an array")

    conn = get_connection()
    progress = conn.execute(
        "SELECT problem_id FROM problem_progress WHERE problem_id = ?", (problem_id,)
    ).fetchone()
    if not progress:
        conn.close()
        raise HTTPException(status_code=404, detail="Problem not solved yet")

    conn.execute(
        "UPDATE problem_progress SET tags = ? WHERE problem_id = ?",
        (json.dumps(tags), problem_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True, "problem_id": problem_id, "tags": tags}


@router.put("/{problem_id}/rating")
def update_self_rating(problem_id: int, body: dict):
    """Update self-rating for a problem (1=easy, 2=medium, 3=hard, 0=unset)."""
    rating = body.get("rating", 0)
    if rating not in (0, 1, 2, 3):
        raise HTTPException(status_code=400, detail="Rating must be 0-3")

    conn = get_connection()
    progress = conn.execute(
        "SELECT problem_id FROM problem_progress WHERE problem_id = ?", (problem_id,)
    ).fetchone()
    if not progress:
        conn.close()
        raise HTTPException(status_code=404, detail="Problem not solved yet")

    conn.execute(
        "UPDATE problem_progress SET self_rating = ? WHERE problem_id = ?",
        (rating, problem_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True, "problem_id": problem_id, "rating": rating}


@router.delete("/{problem_id}")
def reset_progress(problem_id: int):
    """Reset a problem's progress — start from scratch."""
    conn = get_connection()
    problem = conn.execute("SELECT id FROM problems WHERE id = ?", (problem_id,)).fetchone()
    if not problem:
        conn.close()
        raise HTTPException(status_code=404, detail="Problem not found")

    conn.execute("DELETE FROM problem_progress WHERE problem_id = ?", (problem_id,))
    conn.execute("DELETE FROM review_log WHERE problem_id = ?", (problem_id,))
    conn.execute("DELETE FROM notes WHERE problem_id = ?", (problem_id,))
    conn.commit()
    conn.close()
    return {"ok": True, "problem_id": problem_id}


@router.get("/history/{problem_id}", response_model=list[ReviewLogEntry])
def get_review_history(problem_id: int):
    """Get all review log entries for a problem."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM review_log WHERE problem_id = ? ORDER BY reviewed_at DESC",
        (problem_id,),
    ).fetchall()
    conn.close()
    return [
        ReviewLogEntry(
            id=r["id"],
            reviewed_at=r["reviewed_at"],
            date=r["date"],
            confidence=r["confidence"],
        )
        for r in rows
    ]


@router.get("/due", response_model=list[ProblemOut])
def get_due_reviews():
    """Get all problems that are due (today or overdue)."""
    conn = get_connection()
    today = date.today().isoformat()
    rows = conn.execute(
        """SELECT p.*, pp.first_solved, pp.last_reviewed, pp.review_count, pp.stage, pp.next_due, pp.self_rating, pp.tags
           FROM problems p
           JOIN problem_progress pp ON p.id = pp.problem_id
           WHERE pp.next_due <= ?
           ORDER BY pp.next_due, p.topic""",
        (today,),
    ).fetchall()
    conn.close()
    return [_row_to_problem(r) for r in rows]


@router.get("/due/today", response_model=list[ProblemOut])
def get_due_today():
    """Get only problems due exactly today."""
    conn = get_connection()
    today = date.today().isoformat()
    rows = conn.execute(
        """SELECT p.*, pp.first_solved, pp.last_reviewed, pp.review_count, pp.stage, pp.next_due, pp.self_rating, pp.tags
           FROM problems p
           JOIN problem_progress pp ON p.id = pp.problem_id
           WHERE pp.next_due = ?
           ORDER BY p.topic""",
        (today,),
    ).fetchall()
    conn.close()
    return [_row_to_problem(r) for r in rows]


@router.get("/due/overdue", response_model=list[ProblemOut])
def get_overdue():
    """Get problems that are overdue (due before today)."""
    conn = get_connection()
    today = date.today().isoformat()
    rows = conn.execute(
        """SELECT p.*, pp.first_solved, pp.last_reviewed, pp.review_count, pp.stage, pp.next_due, pp.self_rating, pp.tags
           FROM problems p
           JOIN problem_progress pp ON p.id = pp.problem_id
           WHERE pp.next_due < ?
           ORDER BY pp.next_due, p.topic""",
        (today,),
    ).fetchall()
    conn.close()
    return [_row_to_problem(r) for r in rows]


@router.get("/due/count")
def get_due_count():
    conn = get_connection()
    today = date.today().isoformat()
    row = conn.execute(
        "SELECT COUNT(*) as count FROM problem_progress WHERE next_due <= ?", (today,)
    ).fetchone()
    today_row = conn.execute(
        "SELECT COUNT(*) as count FROM problem_progress WHERE next_due = ?", (today,)
    ).fetchone()
    overdue_row = conn.execute(
        "SELECT COUNT(*) as count FROM problem_progress WHERE next_due < ?", (today,)
    ).fetchone()
    conn.close()
    return {
        "count": row["count"],
        "today": today_row["count"],
        "overdue": overdue_row["count"],
    }
