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

// Click cycles: none → asc → desc → none
function nextSort(field: string, current: string): string {
  if (current === field) return `${field}_desc`;
  if (current === `${field}_desc`) return "";
  return field;
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

  const hasActiveFilters = filters.topic || filters.difficulty || filters.list || filters.status;

  const thClass = (field: string) =>
    `sortable-col ${sort === field ? "sort-asc" : sort === `${field}_desc` ? "sort-desc" : ""}`;

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
              <th className={thClass("reviews")} onClick={() => handleSortChange(nextSort("reviews", sort))}>
                Reviews
              </th>
              <th className={thClass("stage")} onClick={() => handleSortChange(nextSort("stage", sort))}>
                Stage
              </th>
              <th className={thClass("retention")} onClick={() => handleSortChange(nextSort("retention", sort))}>
                Retention
              </th>
              <th className={thClass("due")} onClick={() => handleSortChange(nextSort("due", sort))}>
                Next Due
              </th>
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
