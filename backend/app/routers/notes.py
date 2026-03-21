from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..database import get_connection
from ..models import NoteCreate, NoteOut, NoteUpdate

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("/{problem_id}", response_model=list[NoteOut])
def get_notes(problem_id: int):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM notes WHERE problem_id = ? ORDER BY session",
        (problem_id,),
    ).fetchall()
    conn.close()
    return [
        NoteOut(
            id=r["id"],
            problem_id=r["problem_id"],
            session=r["session"],
            content=r["content"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]


@router.post("/{problem_id}", response_model=NoteOut)
def create_note(problem_id: int, body: NoteCreate):
    conn = get_connection()
    now = datetime.now().isoformat()

    # Determine next session number
    row = conn.execute(
        "SELECT COALESCE(MAX(session), 0) as max_session FROM notes WHERE problem_id = ?",
        (problem_id,),
    ).fetchone()
    session = row["max_session"] + 1

    cursor = conn.execute(
        "INSERT INTO notes (problem_id, session, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (problem_id, session, body.content, now, now),
    )
    conn.commit()
    note_id = cursor.lastrowid
    conn.close()

    return NoteOut(
        id=note_id,
        problem_id=problem_id,
        session=session,
        content=body.content,
        created_at=now,
        updated_at=now,
    )


@router.put("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, body: NoteUpdate):
    conn = get_connection()
    now = datetime.now().isoformat()

    note = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    if not note:
        conn.close()
        raise HTTPException(status_code=404, detail="Note not found")

    conn.execute(
        "UPDATE notes SET content = ?, updated_at = ? WHERE id = ?",
        (body.content, now, note_id),
    )
    conn.commit()
    conn.close()

    return NoteOut(
        id=note_id,
        problem_id=note["problem_id"],
        session=note["session"],
        content=body.content,
        created_at=note["created_at"],
        updated_at=now,
    )


@router.get("/search/{query}", response_model=list[NoteOut])
def search_notes(query: str):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM notes WHERE content LIKE ? ORDER BY updated_at DESC",
        (f"%{query}%",),
    ).fetchall()
    conn.close()
    return [
        NoteOut(
            id=r["id"],
            problem_id=r["problem_id"],
            session=r["session"],
            content=r["content"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]
