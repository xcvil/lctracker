"""Spaced repetition based on Ebbinghaus forgetting curve with confidence feedback.

Ebbinghaus forgetting curve: R = e^(-t/S)
  R = retention (0-1)
  t = time elapsed since last review (days)
  S = memory stability (days) — how long until retention drops to ~37%

Stability is derived from the review stage. Each successful review increases
stability, meaning the memory decays more slowly over time. The intervals
are chosen so that you review roughly when retention drops to ~50%.

Stages 0-5: fixed intervals [1, 2, 4, 7, 15, 30] days
Stage 6+:   interval stays at 30 days, scaled by self_rating:
  rating 1 (✓ easy):    30 days (confident, keep 30-day cycle)
  rating 2 (~ medium):  24 days (30 * 0.8, review more often)
  rating 3 (! hard):    18 days (30 * 0.6, needs frequent practice)
  rating 0 (unset):     30 days (default)
"""

import math
from datetime import date, timedelta

# Intervals in days for stages 0-5
BASE_INTERVALS = [1, 2, 4, 7, 15, 30]
BASE_MAX_STAGE = len(BASE_INTERVALS) - 1

# Scale factors for stage 6+ based on self_rating (applied to 30-day base)
RATING_SCALE = {
    0: 1.0,  # unset — default 30 days
    1: 1.0,  # ✓ easy — 30 days
    2: 0.8,  # ~ medium — 24 days
    3: 0.6,  # ! hard — 18 days
}

# Stability for each base stage: S = interval / ln(2) so R ≈ 50% at review time
BASE_STABILITY = [interval / math.log(2) for interval in BASE_INTERVALS]


def get_interval(stage: int, self_rating: int = 0) -> int:
    """Get the review interval in days for a given stage and self_rating."""
    if stage <= BASE_MAX_STAGE:
        return BASE_INTERVALS[stage]
    # Stage 6+: fixed at 30 days scaled by self_rating
    scale = RATING_SCALE.get(self_rating, 1.0)
    return round(30 * scale)


def compute_retention(stage: int, days_since_review: float, self_rating: int = 0) -> float:
    """Compute current memory retention (0-100%) using Ebbinghaus formula.

    R = e^(-t/S) where S = stability for the given stage.
    """
    if days_since_review <= 0:
        return 100.0
    interval = get_interval(stage, self_rating)
    s = interval / math.log(2)
    r = math.exp(-days_since_review / s)
    return round(r * 100, 1)


def compute_next_review(
    current_stage: int, confidence: int, self_rating: int = 0, today: date | None = None
) -> tuple[date, int]:
    """After a review, compute next due date based on confidence (1-5).

    confidence:
      1 = 完全忘了 -> reset to stage 0
      2 = 很模糊 -> reset to stage 1 (or 0 if currently at 0)
      3 = 勉强记得 -> go back one stage (min 0)
      4 = 比较清晰 -> stay at current stage
      5 = 非常熟练 -> advance one stage (no cap — grows beyond stage 5)
    """
    if today is None:
        today = date.today()

    if confidence <= 1:
        new_stage = 0
    elif confidence == 2:
        new_stage = min(current_stage, 1)
    elif confidence == 3:
        new_stage = max(current_stage - 1, 0)
    elif confidence == 4:
        new_stage = current_stage
    else:  # 5
        new_stage = current_stage + 1  # no cap

    interval = get_interval(new_stage, self_rating)
    return today + timedelta(days=interval), new_stage


def compute_first_review(today: date | None = None) -> tuple[date, int]:
    """After solving a problem for the first time."""
    if today is None:
        today = date.today()
    return today + timedelta(days=BASE_INTERVALS[0]), 0
