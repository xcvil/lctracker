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

    if from_date and to_date:
        rows = conn.execute(
            """SELECT date, COUNT(DISTINCT problem_id) as count
               FROM review_log
               WHERE date BETWEEN ? AND ?
               GROUP BY date
               ORDER BY date""",
            (from_date, to_date),
        ).fetchall()
    else:
        # All time
        rows = conn.execute(
            """SELECT date, COUNT(DISTINCT problem_id) as count
               FROM review_log
               GROUP BY date
               ORDER BY date"""
        ).fetchall()

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

    # Total reviews = only re-reviews (review_count > 1 means reviewed, not first solve)
    # Count all review_log entries EXCEPT the first solve for each problem
    total_reviews = conn.execute(
        """SELECT COUNT(*) as count FROM review_log rl
           WHERE EXISTS (
             SELECT 1 FROM problem_progress pp
             WHERE pp.problem_id = rl.problem_id AND pp.first_solved < rl.date
           )
           OR (
             SELECT COUNT(*) FROM review_log rl2
             WHERE rl2.problem_id = rl.problem_id AND rl2.date = rl.date
           ) > 1"""
    ).fetchone()["count"]
    # Total reviews = total review_log entries minus first-solve entries
    # Every problem's first review_log entry is the first solve, rest are reviews
    total_log_entries = conn.execute(
        "SELECT COUNT(*) as count FROM review_log"
    ).fetchone()["count"]
    total_reviews = max(0, total_log_entries - total_solved)

    # Today's stats
    today = date.today().isoformat()

    # New solves today (first time ever)
    today_new = conn.execute(
        "SELECT COUNT(*) as count FROM problem_progress WHERE first_solved = ?",
        (today,),
    ).fetchone()["count"]

    # Reviews today = total review_log entries today minus new solves today
    today_total_entries = conn.execute(
        "SELECT COUNT(*) as count FROM review_log WHERE date = ?",
        (today,),
    ).fetchone()["count"]
    today_reviews_only = max(0, today_total_entries - today_new)

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
    """Get problems worked on a specific day with their confidence."""
    conn = get_connection()
    rows = conn.execute(
        """SELECT p.id, p.title, p.slug, p.url, p.difficulty, p.topic,
                  p.neetcode_75, p.neetcode_150, p.neetcode_250, p.neetcode_all,
                  rl.confidence, pp.first_solved, pp.review_count
           FROM review_log rl
           JOIN problems p ON p.id = rl.problem_id
           LEFT JOIN problem_progress pp ON pp.problem_id = rl.problem_id
           WHERE rl.date = ?
           GROUP BY rl.problem_id
           ORDER BY rl.reviewed_at""",
        (day,),
    ).fetchall()
    conn.close()

    results = []
    for r in rows:
        is_first = r["first_solved"] == day
        results.append({
            "id": r["id"],
            "title": r["title"],
            "slug": r["slug"],
            "url": r["url"],
            "difficulty": r["difficulty"],
            "topic": r["topic"],
            "confidence": r["confidence"],
            "is_new": is_first,
            "review_count": r["review_count"] or 0,
        })

    return {"date": day, "problems": results}
