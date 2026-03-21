import { useCallback, useEffect, useState } from "react";
import { del, get, post } from "../api/client";
import type { Problem, ReviewResponse } from "../types";

export function useReviews() {
  const [todayProblems, setTodayProblems] = useState<Problem[]>([]);
  const [overdueProblems, setOverdueProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDue = useCallback(async () => {
    setLoading(true);
    const [today, overdue] = await Promise.all([
      get<Problem[]>("/reviews/due/today"),
      get<Problem[]>("/reviews/due/overdue"),
    ]);
    setTodayProblems(today);
    setOverdueProblems(overdue);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDue();
  }, [fetchDue]);

  const markReviewed = useCallback(
    async (problemId: number, confidence: number) => {
      await post<ReviewResponse>(`/reviews/${problemId}`, { confidence });
      await fetchDue();
    },
    [fetchDue]
  );

  const resetProgress = useCallback(
    async (problemId: number) => {
      await del(`/reviews/${problemId}`);
      await fetchDue();
    },
    [fetchDue]
  );

  return { todayProblems, overdueProblems, loading, markReviewed, resetProgress, refetch: fetchDue };
}
