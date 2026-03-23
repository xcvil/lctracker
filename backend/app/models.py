from pydantic import BaseModel


class ProblemProgress(BaseModel):
    first_solved: str
    last_reviewed: str
    review_count: int
    stage: int
    next_due: str
    retention: float = 100.0
    self_rating: int = 0
    tags: list[str] = []


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


class SolutionOut(BaseModel):
    id: int
    problem_id: int
    title: str
    code: str
    time_complexity: str
    space_complexity: str
    created_at: str
    updated_at: str


class SolutionCreate(BaseModel):
    title: str = ""
    code: str = ""
    time_complexity: str = ""
    space_complexity: str = ""


class SolutionUpdate(BaseModel):
    title: str | None = None
    code: str | None = None
    time_complexity: str | None = None
    space_complexity: str | None = None


class ActivityDay(BaseModel):
    date: str
    count: int


class SyncResult(BaseModel):
    added: int
    total: int
