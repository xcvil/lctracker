import { useState } from "react";
import { post } from "../api/client";
import { useProblems } from "../hooks/useProblems";
import type { ReviewResponse } from "../types";
import FilterBar from "./FilterBar";
import ProblemRow from "./ProblemRow";

export default function ProblemTable() {
  const [filters, setFilters] = useState({
    topic: "",
    difficulty: "",
    list: "",
    status: "",
  });
  const [sort, setSort] = useState("");
  const { problems, loading, refetch } = useProblems({ ...filters, sort });

  const handleSolve = async (id: number, confidence: number) => {
    await post<ReviewResponse>(`/reviews/${id}`, { confidence });
    refetch();
  };

  const solved = problems.filter((p) => p.progress !== null).length;

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h2>
        Problems ({solved}/{problems.length} solved)
      </h2>
      <FilterBar filters={filters} onChange={setFilters} />
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
                setSort(sort === "retention" ? "retention_desc" : "retention")
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
    </div>
  );
}
