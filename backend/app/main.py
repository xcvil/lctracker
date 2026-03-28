from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import get_connection, init_db
from .routers import activity, custom, export, notes, problems, reviews, solutions
from .routers.export import fix_data_integrity
from .seed import seed_problems


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_problems()
    # Auto-fix any data integrity issues on startup
    conn = get_connection()
    fixes = fix_data_integrity(conn)
    conn.close()
    if any(v > 0 for v in fixes.get("fixes", {}).values()):
        print(f"Data integrity fixes applied: {fixes['fixes']}")
    yield


app = FastAPI(title="LCTracker", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(problems.router)
app.include_router(reviews.router)
app.include_router(activity.router)
app.include_router(notes.router)
app.include_router(export.router)
app.include_router(solutions.router)
app.include_router(custom.router)
