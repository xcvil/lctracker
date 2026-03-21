from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import activity, notes, problems, reviews
from .seed import seed_problems


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_problems()
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
