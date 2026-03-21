import { useEffect, useState } from "react";
import { get } from "../api/client";
import type { ActivityDay } from "../types";

export function useActivity() {
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<ActivityDay[]>("/activity").then((data) => {
      setActivity(data);
      setLoading(false);
    });
  }, []);

  return { activity, loading };
}
