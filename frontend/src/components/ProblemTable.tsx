import { useState } from "react";
import { post } from "../api/client";
import { useProblems } from "../hooks/useProblems";
import type { ReviewResponse } from "../types";
import FilterBar from "./FilterBar";
import ProblemRow from "./ProblemRow";

const STORAGE_KEY = "lctracker-filters";

function loadFilters() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate structure — only keep known string keys
      return {
        topic: typeof parsed.topic === "string" ? parsed.topic : "",
        difficulty: typeof parsed.difficulty === "string" ? parsed.difficulty : "",
        list: typeof parsed.list === "string" ? parsed.list : "",
        status: typeof parsed.status === "string" ? parsed.status : "",
        sort: typeof parsed.sort === "string" ? parsed.sort : "",
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { topic: "", difficulty: "", list: "", status: "", sort: "" };
}

function saveFilters(f: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
}

export default function ProblemTable() {
  const [filters, setFilters] = useState(loadFilters);
  const sort = filters.sort || "";

  const handleFilterChange = (f: { topic: string; difficulty: string; list: string; status: string }) => {
    const next = { ...f, sort };
    setFilters(next);
    saveFilters(next);
  };

  const handleSortChange = (s: string) => {
    const next = { ...filters, sort: s };
    setFilters(next);
    saveFilters(next);
  };

  const { problems, loading, refetch } = useProblems({ ...filters, sort });

  const handleSolve = async (id: number, confidence: number) => {
    await post<ReviewResponse>(`/reviews/${id}`, { confidence });
    refetch();
  };

  const solved = problems.filter((p) => p.progress !== null).length;

  if (loading) return <div className="loading">Loading...</div>;

  // If saved filters return 0 results but filters are active, show a reset hint
  const hasActiveFilters = filters.topic || filters.difficulty || filters.list || filters.status;

  return (
    <div>
      <h2>
        Problems ({solved}/{problems.length} solved)
      </h2>
      <FilterBar filters={filters} onChange={handleFilterChange} />
      {problems.length === 0 && hasActiveFilters ? (
        <div className="empty-state">
          <p>No problems match current filters.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              const reset = { topic: "", difficulty: "", list: "", status: "", sort: "" };
              setFilters(reset);
              saveFilters(reset);
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <table className="problem-table">
          <thead>
            <tr>
              <th>Problem</th>
              <th>Difficulty</th>
              <th>Topic</th>
              <th>Reviews</th>
              <th>Stage</th>
              <th
                className="sortable-header"
                onClick={() =>
                  handleSortChange(sort === "retention" ? "retention_desc" : "retention")
                }
              >
                Retention{" "}
                {sort === "retention" ? "▲" : sort === "retention_desc" ? "▼" : "⇅"}
              </th>
              <th>Next Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p) => (
              <ProblemRow key={p.id} problem={p} onAction={handleSolve} onRefresh={refetch} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
