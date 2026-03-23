import { useCallback, useEffect, useState } from "react";
import { del, get, post, put } from "../api/client";
import type { Solution } from "../types";
import Markdown from "./Markdown";
import NoteTextarea from "./NoteTextarea";

interface Props {
  problemId: number;
}

function SolutionCard({
  sol,
  onUpdate,
  onDelete,
}: {
  sol: Solution;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(!sol.title && !sol.code);
  const [title, setTitle] = useState(sol.title);
  const [code, setCode] = useState(sol.code);
  const [tc, setTc] = useState(sol.time_complexity);
  const [sc, setSc] = useState(sol.space_complexity);

  const handleSave = async () => {
    await put(`/solutions/${sol.id}`, {
      title,
      code,
      time_complexity: tc,
      space_complexity: sc,
    });
    setEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (confirm("Delete this solution?")) {
      await del(`/solutions/${sol.id}`);
      onDelete();
    }
  };

  return (
    <div className="solution-card">
      <div className="solution-header">
        {editing ? (
          <input
            className="solution-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Solution title (e.g. Two Pointer, DP)"
          />
        ) : (
          <span className="solution-title" onClick={() => setEditing(true)}>
            {sol.title || "Untitled"}
          </span>
        )}
        <div className="solution-complexity">
          {editing ? (
            <>
              <input
                className="complexity-input"
                value={tc}
                onChange={(e) => setTc(e.target.value)}
                placeholder="Time: n, nlogn..."
              />
              <input
                className="complexity-input"
                value={sc}
                onChange={(e) => setSc(e.target.value)}
                placeholder="Space: 1, n..."
              />
            </>
          ) : (
            <>
              {sol.time_complexity && (
                <span className="complexity-tag time-tag">T: O({sol.time_complexity})</span>
              )}
              {sol.space_complexity && (
                <span className="complexity-tag space-tag">S: O({sol.space_complexity})</span>
              )}
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="note-editor">
          <NoteTextarea value={code} onChange={setCode} rows={8} placeholder="Write your solution in Markdown..." />
          <div className="note-editor-actions">
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-sm solution-delete-btn" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      ) : sol.code ? (
        <div className="note-content markdown-body clickable-note" onClick={() => setEditing(true)}>
          <Markdown>{sol.code}</Markdown>
        </div>
      ) : (
        <div className="notes-empty clickable-note" onClick={() => setEditing(true)}>
          Click to add solution...
        </div>
      )}
    </div>
  );
}

export default function SolutionsPanel({ problemId }: Props) {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSolutions = useCallback(async () => {
    const data = await get<Solution[]>(`/solutions/${problemId}`);
    setSolutions(data);
    setLoading(false);
  }, [problemId]);

  useEffect(() => {
    fetchSolutions();
  }, [fetchSolutions]);

  const handleAdd = async () => {
    await post(`/solutions/${problemId}`, { title: "", code: "", time_complexity: "", space_complexity: "" });
    fetchSolutions();
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="solutions-panel">
      <div className="solutions-header">
        <h4>Solutions ({solutions.length})</h4>
        <button className="btn btn-secondary btn-sm" onClick={handleAdd}>
          + Add Solution
        </button>
      </div>
      {solutions.length === 0 ? (
        <p className="notes-empty">No solutions yet.</p>
      ) : (
        solutions.map((sol) => (
          <SolutionCard
            key={sol.id}
            sol={sol}
            onUpdate={fetchSolutions}
            onDelete={fetchSolutions}
          />
        ))
      )}
    </div>
  );
}
