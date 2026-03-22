from pydantic import BaseModel


class ProblemProgress(BaseModel):
    first_solved: str
    last_reviewed: str
    review_count: int
    stage: int
    next_due: str
    retention: float = 100.0
    self_rating: int = 0  # 0=unset, 1=easy, 2=medium, 3=hard


class ProblemOut(BaseModel):
    id: int
    title: str
    slug: str
    url: str
    difficulty: str
    topic: str
    neetcode_75: bool
    neetcode_150: bool
    neetcode_250: bool
    neetcode_all: bool
    progress: ProblemProgress | None = None


class ReviewRequest(BaseModel):
    confidence: int = 4  # 1-5


class ReviewResponse(BaseModel):
    problem_id: int
    review_count: int
    stage: int
    next_due: str
    confidence: int


class ReviewLogEntry(BaseModel):
    id: int
    reviewed_at: str
    date: str
    confidence: int


class NoteOut(BaseModel):
    id: int
    problem_id: int
    session: int
    content: str
    created_at: str
    updated_at: str


class NoteCreate(BaseModel):
    content: str


class NoteUpdate(BaseModel):
    content: str


class ActivityDay(BaseModel):
    date: str
    count: int


class SyncResult(BaseModel):
    added: int
    total: int
