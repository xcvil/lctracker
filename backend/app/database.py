import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "lctracker.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS problems (
            id            INTEGER PRIMARY KEY,
            title         TEXT NOT NULL,
            slug          TEXT NOT NULL UNIQUE,
            url           TEXT NOT NULL,
            difficulty    TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
            topic         TEXT NOT NULL,
            neetcode_75   BOOLEAN NOT NULL DEFAULT 0,
            neetcode_150  BOOLEAN NOT NULL DEFAULT 0,
            neetcode_250  BOOLEAN NOT NULL DEFAULT 0,
            neetcode_all  BOOLEAN NOT NULL DEFAULT 1,
            is_custom     BOOLEAN NOT NULL DEFAULT 0,
            company       TEXT NOT NULL DEFAULT '',
            source        TEXT NOT NULL DEFAULT '',
            description   TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS problem_progress (
            problem_id    INTEGER PRIMARY KEY REFERENCES problems(id),
            first_solved  TEXT NOT NULL,
            last_reviewed TEXT NOT NULL,
            self_rating   INTEGER NOT NULL DEFAULT 0,
            tags          TEXT NOT NULL DEFAULT '[]',
            review_count  INTEGER NOT NULL DEFAULT 0,
            stage         INTEGER NOT NULL DEFAULT 0,
            next_due      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS review_log (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            problem_id    INTEGER NOT NULL REFERENCES problems(id),
            reviewed_at   TEXT NOT NULL,
            date          TEXT NOT NULL,
            confidence    INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS notes (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            problem_id    INTEGER NOT NULL REFERENCES problems(id),
            session       INTEGER NOT NULL DEFAULT 1,
            content       TEXT NOT NULL DEFAULT '',
            created_at    TEXT NOT NULL,
            updated_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS solutions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            problem_id    INTEGER NOT NULL REFERENCES problems(id),
            title         TEXT NOT NULL DEFAULT '',
            code          TEXT NOT NULL DEFAULT '',
            time_complexity  TEXT NOT NULL DEFAULT '',
            space_complexity TEXT NOT NULL DEFAULT '',
            created_at    TEXT NOT NULL,
            updated_at    TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_solutions_problem ON solutions(problem_id);
        CREATE INDEX IF NOT EXISTS idx_progress_next_due ON problem_progress(next_due);
        CREATE INDEX IF NOT EXISTS idx_review_log_date ON review_log(date);
        CREATE INDEX IF NOT EXISTS idx_notes_problem ON notes(problem_id);
    """)

    # Migrations for existing databases
    migrations = [
        "ALTER TABLE problem_progress ADD COLUMN self_rating INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE problem_progress ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'",
        "ALTER TABLE problems ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE problems ADD COLUMN company TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE problems ADD COLUMN source TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE problems ADD COLUMN description TEXT NOT NULL DEFAULT ''",
    ]
    for sql in migrations:
        try:
            conn.execute(sql)
        except Exception:
            pass

    conn.close()
