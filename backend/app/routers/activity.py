from datetime import date, timedelta

from fastapi import APIRouter, Query

from ..database import get_connection
from ..models import ActivityDay, ProblemOut, ProblemProgress
from ..srs import compute_retention

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("", response_model=list[ActivityDay])
def get_activity(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    conn = get_connection()
    today = date.today()

    # Combine first solves (from problem_progress) and reviews (from review_log)
    # into a unified activity view
    query = """
        SELECT date, COUNT(DISTINCT problem_id) as count FROM (
            SELECT first_solved AS date, problem_id FROM problem_progress
            UNION ALL
            SELECT date, problem_id FROM review_log
        )
    """
    params: list = []

    if from_date and to_date:
        query += " WHERE date BETWEEN ? AND ?"
        params = [from_date, to_date]

    query += " GROUP BY date ORDER BY date"
    rows = conn.execute(query, params).fetchall()

    conn.close()
    return [ActivityDay(date=r["date"], count=r["count"]) for r in rows]


@router.get("/stats")
def get_stats():
    """Get overall solving stats: by difficulty, total solved, total reviews."""
    conn = get_connection()

    # Total problems by difficulty
    total_by_diff = conn.execute(
        "SELECT difficulty, COUNT(*) as count FROM problems GROUP BY difficulty"
    ).fetchall()
    total_map = {r["difficulty"]: r["count"] for r in total_by_diff}

    # Solved by difficulty
    solved_by_diff = conn.execute(
        """SELECT p.difficulty, COUNT(*) as count
           FROM problem_progress pp
           JOIN problems p ON p.id = pp.problem_id
           GROUP BY p.difficulty"""
    ).fetchall()
    solved_map = {r["difficulty"]: r["count"] for r in solved_by_diff}

    # Total solved (distinct problems ever solved)
    total_solved = conn.execute(
        "SELECT COUNT(*) as count FROM problem_progress"
    ).fetchone()["count"]

    # Total problems
    total_problems = conn.execute(
        "SELECT COUNT(*) as count FROM problems"
    ).fetchone()["count"]

    # Total reviews — review_log only contains actual reviews (not first solves)
    total_reviews = conn.execute(
        "SELECT COUNT(*) as count FROM review_log"
    ).fetchone()["count"]

    # Today's stats
    today = date.today().isoformat()

    # New solves today (first time ever)
    today_new = conn.execute(
        "SELECT COUNT(*) as count FROM problem_progress WHERE first_solved = ?",
        (today,),
    ).fetchone()["count"]

    # Reviews today
    today_reviews_only = conn.execute(
        "SELECT COUNT(*) as count FROM review_log WHERE date = ?",
        (today,),
    ).fetchone()["count"]

    conn.close()

    return {
        "total_problems": total_problems,
        "total_solved": total_solved,
        "total_reviews": total_reviews,
        "today_new": today_new,
        "today_reviews": today_reviews_only,
        "by_difficulty": {
            "Easy": {"solved": solved_map.get("Easy", 0), "total": total_map.get("Easy", 0)},
            "Medium": {"solved": solved_map.get("Medium", 0), "total": total_map.get("Medium", 0)},
            "Hard": {"solved": solved_map.get("Hard", 0), "total": total_map.get("Hard", 0)},
        },
    }


@router.get("/day/{day}")
def get_day_detail(day: str):
    """Get problems worked on a specific day (first solves + reviews)."""
    conn = get_connection()

    # Reviews on this day
    review_rows = conn.execute(
        """SELECT p.id, p.title, p.slug, p.url, p.difficulty, p.topic,
                  rl.confidence, pp.first_solved, pp.review_count
           FROM review_log rl
           JOIN problems p ON p.id = rl.problem_id
           LEFT JOIN problem_progress pp ON pp.problem_id = rl.problem_id
           WHERE rl.date = ?
           GROUP BY rl.problem_id
           ORDER BY rl.reviewed_at""",
        (day,),
    ).fetchall()

    # First solves on this day (not in review_log)
    solve_rows = conn.execute(
        """SELECT p.id, p.title, p.slug, p.url, p.difficulty, p.topic,
                  pp.first_solved, pp.review_count
           FROM problem_progress pp
           JOIN problems p ON p.id = pp.problem_id
           WHERE pp.first_solved = ?
             AND pp.problem_id NOT IN (
               SELECT problem_id FROM review_log WHERE date = ?
             )""",
        (day, day),
    ).fetchall()

    conn.close()

    results = []
    for r in solve_rows:
        results.append({
            "id": r["id"], "title": r["title"], "slug": r["slug"],
            "url": r["url"], "difficulty": r["difficulty"], "topic": r["topic"],
            "confidence": 0, "is_new": True,
            "review_count": r["review_count"] or 0,
        })
    for r in review_rows:
        results.append({
            "id": r["id"], "title": r["title"], "slug": r["slug"],
            "url": r["url"], "difficulty": r["difficulty"], "topic": r["topic"],
            "confidence": r["confidence"],
            "is_new": r["first_solved"] == day,
            "review_count": r["review_count"] or 0,
        })

    return {"date": day, "problems": results}
