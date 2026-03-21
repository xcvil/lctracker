import { useCallback, useEffect, useState } from "react";
import { get } from "../api/client";
import type { Problem } from "../types";

interface Filters {
  topic?: string;
  difficulty?: string;
  list?: string;
  status?: string;
  sort?: string;
}

export function useProblems(filters: Filters = {}) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.topic) params.set("topic", filters.topic);
    if (filters.difficulty) params.set("difficulty", filters.difficulty);
    if (filters.list) params.set("list", filters.list);
    if (filters.status) params.set("status", filters.status);
    if (filters.sort) params.set("sort", filters.sort);
    const qs = params.toString();
    const data = await get<Problem[]>(`/problems${qs ? `?${qs}` : ""}`);
    setProblems(data);
    setLoading(false);
  }, [filters.topic, filters.difficulty, filters.list, filters.status, filters.sort]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  return { problems, loading, refetch: fetchProblems };
}
