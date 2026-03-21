"""Spaced repetition based on Ebbinghaus forgetting curve with confidence feedback.

Ebbinghaus forgetting curve: R = e^(-t/S)
  R = retention (0-1)
  t = time elapsed since last review (days)
  S = memory stability (days) — how long until retention drops to ~37%

Stability is derived from the review stage. Each successful review increases
stability, meaning the memory decays more slowly over time. The intervals
are chosen so that you review roughly when retention drops to ~50%.

  Stage 0: S ≈ 1.44 days  (review after 1 day,  R ≈ 50%)
  Stage 1: S ≈ 2.88 days  (review after 2 days, R ≈ 50%)
  Stage 2: S ≈ 5.77 days  (review after 4 days, R ≈ 50%)
  Stage 3: S ≈ 10.1 days  (review after 7 days, R ≈ 50%)
  Stage 4: S ≈ 21.6 days  (review after 15 days, R ≈ 50%)
  Stage 5: S ≈ 43.3 days  (review after 30 days, R ≈ 50%)
"""

import math
from datetime import date, timedelta

# Intervals in days, indexed by stage
INTERVALS = [1, 2, 4, 7, 15, 30]
MAX_STAGE = len(INTERVALS) - 1

# Stability for each stage: S = interval / ln(2) so that R ≈ 50% at review time
STABILITY = [interval / math.log(2) for interval in INTERVALS]


def compute_retention(stage: int, days_since_review: float) -> float:
    """Compute current memory retention (0-100%) using Ebbinghaus formula.

    R = e^(-t/S) where S = stability for the given stage.
    """
    if days_since_review <= 0:
        return 100.0
    s = STABILITY[min(stage, MAX_STAGE)]
    r = math.exp(-days_since_review / s)
    return round(r * 100, 1)


def compute_next_review(
    current_stage: int, confidence: int, today: date | None = None
) -> tuple[date, int]:
    """After a review, compute next due date based on confidence (1-5).

    confidence:
      1 = 完全忘了 -> reset to stage 0
      2 = 很模糊 -> reset to stage 1 (or 0 if currently at 0)
      3 = 勉强记得 -> go back one stage (min 0)
      4 = 比较清晰 -> stay at current stage
      5 = 非常熟练 -> advance one stage
    """
    if today is None:
        today = date.today()

    if confidence <= 1:
        new_stage = 0
    elif confidence == 2:
        new_stage = min(current_stage, 1)  # go to stage 1, or stay at 0 if already there
    elif confidence == 3:
        new_stage = max(current_stage - 1, 0)
    elif confidence == 4:
        new_stage = current_stage
    else:  # 5
        new_stage = min(current_stage + 1, MAX_STAGE)

    interval = INTERVALS[new_stage]
    return today + timedelta(days=interval), new_stage


def compute_first_review(today: date | None = None) -> tuple[date, int]:
    """After solving a problem for the first time."""
    if today is None:
        today = date.today()
    return today + timedelta(days=INTERVALS[0]), 0
