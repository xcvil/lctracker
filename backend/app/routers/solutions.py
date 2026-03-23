from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..database import get_connection
from ..models import SolutionCreate, SolutionOut, SolutionUpdate

router = APIRouter(prefix="/api/solutions", tags=["solutions"])


@router.get("/{problem_id}", response_model=list[SolutionOut])
def get_solutions(problem_id: int):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM solutions WHERE problem_id = ? ORDER BY created_at",
        (problem_id,),
    ).fetchall()
    conn.close()
    return [
        SolutionOut(
            id=r["id"], problem_id=r["problem_id"], title=r["title"],
            code=r["code"], time_complexity=r["time_complexity"],
            space_complexity=r["space_complexity"],
            created_at=r["created_at"], updated_at=r["updated_at"],
        )
        for r in rows
    ]


@router.post("/{problem_id}", response_model=SolutionOut)
def create_solution(problem_id: int, body: SolutionCreate):
    conn = get_connection()
    now = datetime.now().isoformat()
    cursor = conn.execute(
        """INSERT INTO solutions (problem_id, title, code, time_complexity, space_complexity, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (problem_id, body.title, body.code, body.time_complexity, body.space_complexity, now, now),
    )
    conn.commit()
    sol_id = cursor.lastrowid
    conn.close()
    return SolutionOut(
        id=sol_id, problem_id=problem_id, title=body.title,
        code=body.code, time_complexity=body.time_complexity,
        space_complexity=body.space_complexity,
        created_at=now, updated_at=now,
    )


@router.put("/{solution_id}", response_model=SolutionOut)
def update_solution(solution_id: int, body: SolutionUpdate):
    conn = get_connection()
    now = datetime.now().isoformat()
    sol = conn.execute("SELECT * FROM solutions WHERE id = ?", (solution_id,)).fetchone()
    if not sol:
        conn.close()
        raise HTTPException(status_code=404, detail="Solution not found")

    title = body.title if body.title is not None else sol["title"]
    code = body.code if body.code is not None else sol["code"]
    tc = body.time_complexity if body.time_complexity is not None else sol["time_complexity"]
    sc = body.space_complexity if body.space_complexity is not None else sol["space_complexity"]

    conn.execute(
        "UPDATE solutions SET title=?, code=?, time_complexity=?, space_complexity=?, updated_at=? WHERE id=?",
        (title, code, tc, sc, now, solution_id),
    )
    conn.commit()
    conn.close()
    return SolutionOut(
        id=solution_id, problem_id=sol["problem_id"], title=title,
        code=code, time_complexity=tc, space_complexity=sc,
        created_at=sol["created_at"], updated_at=now,
    )


@router.delete("/{solution_id}")
def delete_solution(solution_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM solutions WHERE id = ?", (solution_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
