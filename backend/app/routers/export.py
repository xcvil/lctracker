from datetime import date, datetime

from fastapi import APIRouter, UploadFile
from fastapi.responses import JSONResponse

from ..database import get_connection

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("")
def export_data():
    """Export all user data: progress, review history, notes."""
    conn = get_connection()

    # Problems with progress
    progress_rows = conn.execute(
        """SELECT p.slug, p.title, p.difficulty, p.topic,
                  pp.first_solved, pp.last_reviewed, pp.review_count, pp.stage, pp.next_due
           FROM problem_progress pp
           JOIN problems p ON p.id = pp.problem_id
           ORDER BY p.slug"""
    ).fetchall()

    # Review logs
    review_rows = conn.execute(
        """SELECT p.slug, rl.reviewed_at, rl.date, rl.confidence
           FROM review_log rl
           JOIN problems p ON p.id = rl.problem_id
           ORDER BY rl.reviewed_at"""
    ).fetchall()

    # Notes (only non-empty)
    note_rows = conn.execute(
        """SELECT p.slug, n.session, n.content, n.created_at, n.updated_at
           FROM notes n
           JOIN problems p ON p.id = n.problem_id
           WHERE n.content != ''
           ORDER BY p.slug, n.session"""
    ).fetchall()

    conn.close()

    data = {
        "exported_at": datetime.now().isoformat(),
        "version": 1,
        "progress": [
            {
                "slug": r["slug"],
                "title": r["title"],
                "difficulty": r["difficulty"],
                "topic": r["topic"],
                "first_solved": r["first_solved"],
                "last_reviewed": r["last_reviewed"],
                "review_count": r["review_count"],
                "stage": r["stage"],
                "next_due": r["next_due"],
            }
            for r in progress_rows
        ],
        "reviews": [
            {
                "slug": r["slug"],
                "reviewed_at": r["reviewed_at"],
                "date": r["date"],
                "confidence": r["confidence"],
            }
            for r in review_rows
        ],
        "notes": [
            {
                "slug": r["slug"],
                "session": r["session"],
                "content": r["content"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }
            for r in note_rows
        ],
    }

    return JSONResponse(
        content=data,
        headers={
            "Content-Disposition": f'attachment; filename="lctracker-backup-{date.today().isoformat()}.json"'
        },
    )


@router.post("/import")
def import_data(file: UploadFile):
    """Import user data from a previously exported JSON file."""
    import json

    content = json.loads(file.file.read())
    conn = get_connection()

    # Build slug -> id map
    rows = conn.execute("SELECT id, slug FROM problems").fetchall()
    slug_to_id = {r["slug"]: r["id"] for r in rows}

    imported_progress = 0
    imported_reviews = 0
    imported_notes = 0

    # Import progress
    for p in content.get("progress", []):
        pid = slug_to_id.get(p["slug"])
        if not pid:
            continue
        conn.execute(
            """INSERT INTO problem_progress (problem_id, first_solved, last_reviewed, review_count, stage, next_due)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(problem_id) DO UPDATE SET
                 first_solved = excluded.first_solved,
                 last_reviewed = excluded.last_reviewed,
                 review_count = excluded.review_count,
                 stage = excluded.stage,
                 next_due = excluded.next_due""",
            (pid, p["first_solved"], p["last_reviewed"], p["review_count"], p["stage"], p["next_due"]),
        )
        imported_progress += 1

    # Import review logs (append, skip exact duplicates)
    for r in content.get("reviews", []):
        pid = slug_to_id.get(r["slug"])
        if not pid:
            continue
        existing = conn.execute(
            "SELECT 1 FROM review_log WHERE problem_id = ? AND reviewed_at = ?",
            (pid, r["reviewed_at"]),
        ).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO review_log (problem_id, reviewed_at, date, confidence) VALUES (?, ?, ?, ?)",
                (pid, r["reviewed_at"], r["date"], r["confidence"]),
            )
            imported_reviews += 1

    # Import notes
    for n in content.get("notes", []):
        pid = slug_to_id.get(n["slug"])
        if not pid:
            continue
        existing = conn.execute(
            "SELECT id FROM notes WHERE problem_id = ? AND session = ?",
            (pid, n["session"]),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE notes SET content = ?, updated_at = ? WHERE id = ?",
                (n["content"], n["updated_at"], existing["id"]),
            )
        else:
            conn.execute(
                "INSERT INTO notes (problem_id, session, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (pid, n["session"], n["content"], n["created_at"], n["updated_at"]),
            )
        imported_notes += 1

    conn.commit()
    conn.close()

    return {
        "imported_progress": imported_progress,
        "imported_reviews": imported_reviews,
        "imported_notes": imported_notes,
    }
