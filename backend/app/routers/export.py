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

    # Solutions
    solution_rows = conn.execute(
        """SELECT p.slug, s.title, s.code, s.time_complexity, s.space_complexity, s.created_at, s.updated_at
           FROM solutions s
           JOIN problems p ON p.id = s.problem_id
           ORDER BY p.slug, s.created_at"""
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
        "solutions": [
            {
                "slug": r["slug"],
                "title": r["title"],
                "code": r["code"],
                "time_complexity": r["time_complexity"],
                "space_complexity": r["space_complexity"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }
            for r in solution_rows
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

    # Import solutions
    imported_solutions = 0
    for s in content.get("solutions", []):
        pid = slug_to_id.get(s["slug"])
        if not pid:
            continue
        # Check for duplicate by title + created_at
        existing = conn.execute(
            "SELECT id FROM solutions WHERE problem_id = ? AND title = ? AND created_at = ?",
            (pid, s["title"], s["created_at"]),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE solutions SET code=?, time_complexity=?, space_complexity=?, updated_at=? WHERE id=?",
                (s["code"], s["time_complexity"], s["space_complexity"], s["updated_at"], existing["id"]),
            )
        else:
            conn.execute(
                """INSERT INTO solutions (problem_id, title, code, time_complexity, space_complexity, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (pid, s["title"], s["code"], s["time_complexity"], s["space_complexity"], s["created_at"], s["updated_at"]),
            )
        imported_solutions += 1

    conn.commit()

    # Auto-fix data integrity after import
    fixes = fix_data_integrity(conn)

    conn.close()

    return {
        "imported_progress": imported_progress,
        "imported_reviews": imported_reviews,
        "imported_notes": imported_notes,
        "imported_solutions": imported_solutions,
        **fixes,
    }


@router.post("/check")
def check_integrity():
    """Run data integrity check and fix any issues."""
    conn = get_connection()
    result = fix_data_integrity(conn)
    conn.close()
    return result


def fix_data_integrity(conn) -> dict:
    """Check and fix data integrity issues between notes, review_log, and progress.

    Rules:
    - Session 0 note should exist iff problem has progress (first solve)
    - Session N (N>0) note should exist iff review_count >= N
    - Orphan notes (session > review_count) should be deleted
    - Missing session 0 notes for solved problems should be created
    - review_log entries without matching progress should be deleted
    """
    now = __import__("datetime").datetime.now().isoformat()
    deleted_notes = 0
    created_notes = 0
    deleted_reviews = 0

    # 1. Delete orphan notes: session > review_count (or no progress at all)
    orphans = conn.execute(
        """SELECT n.id, n.problem_id, n.session FROM notes n
           LEFT JOIN problem_progress pp ON pp.problem_id = n.problem_id
           WHERE pp.problem_id IS NULL
              OR n.session > pp.review_count"""
    ).fetchall()
    for o in orphans:
        conn.execute("DELETE FROM notes WHERE id = ?", (o["id"],))
        deleted_notes += 1

    # 2. Ensure session 0 note exists for all solved problems
    missing_s0 = conn.execute(
        """SELECT pp.problem_id FROM problem_progress pp
           WHERE NOT EXISTS (
             SELECT 1 FROM notes n WHERE n.problem_id = pp.problem_id AND n.session = 0
           )"""
    ).fetchall()
    for m in missing_s0:
        conn.execute(
            "INSERT INTO notes (problem_id, session, content, created_at, updated_at) VALUES (?, 0, '', ?, ?)",
            (m["problem_id"], now, now),
        )
        created_notes += 1

    # 3. Ensure session N notes exist for each review (N = 1..review_count)
    progress_rows = conn.execute(
        "SELECT problem_id, review_count FROM problem_progress WHERE review_count > 0"
    ).fetchall()
    for pr in progress_rows:
        for session in range(1, pr["review_count"] + 1):
            exists = conn.execute(
                "SELECT 1 FROM notes WHERE problem_id = ? AND session = ?",
                (pr["problem_id"], session),
            ).fetchone()
            if not exists:
                conn.execute(
                    "INSERT INTO notes (problem_id, session, content, created_at, updated_at) VALUES (?, ?, '', ?, ?)",
                    (pr["problem_id"], session, now, now),
                )
                created_notes += 1

    # 4. Delete review_log entries for problems without progress
    orphan_reviews = conn.execute(
        """DELETE FROM review_log WHERE problem_id NOT IN (
             SELECT problem_id FROM problem_progress
           )"""
    )
    deleted_reviews = orphan_reviews.rowcount

    conn.commit()

    return {
        "fixes": {
            "deleted_orphan_notes": deleted_notes,
            "created_missing_notes": created_notes,
            "deleted_orphan_reviews": deleted_reviews,
        }
    }
