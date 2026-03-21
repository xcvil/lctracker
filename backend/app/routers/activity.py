from datetime import date, timedelta

from fastapi import APIRouter, Query

from ..database import get_connection
from ..models import ActivityDay

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("", response_model=list[ActivityDay])
def get_activity(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    today = date.today()
    if not from_date:
        from_date = (today - timedelta(days=90)).isoformat()
    if not to_date:
        to_date = today.isoformat()

    conn = get_connection()
    rows = conn.execute(
        """SELECT date, COUNT(DISTINCT problem_id) as count
           FROM review_log
           WHERE date BETWEEN ? AND ?
           GROUP BY date
           ORDER BY date""",
        (from_date, to_date),
    ).fetchall()
    conn.close()

    return [ActivityDay(date=r["date"], count=r["count"]) for r in rows]
