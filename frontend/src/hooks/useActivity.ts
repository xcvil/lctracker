import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { ActivityDay } from "../types";

export function useActivity(days: number = 90) {
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
    get<ActivityDay[]>(`/activity?from=${from}&to=${to}`).then((data) => {
      setActivity(data);
      setLoading(false);
    });
  }, [days]);

  return { activity, loading };
}
