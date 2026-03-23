import { useState } from "react";
import Markdown from "./Markdown";
import { get } from "../api/client";
import type { Note, Problem } from "../types";
import { formatDate } from "../utils";

export default function NotesSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(Note & { problem_title?: string })[]>(
    []
  );
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    const notes = await get<Note[]>(
      `/notes/search/${encodeURIComponent(query)}`
    );
    // Fetch problem titles for each note
    const problems = await get<Problem[]>("/problems");
    const titleMap = new Map(problems.map((p) => [p.id, p.title]));

    setResults(
      notes.map((n) => ({ ...n, problem_title: titleMap.get(n.problem_id) }))
    );
    setSearched(true);
  };

  return (
    <div>
      <h2>Search Notes</h2>
      <div className="search-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search your notes..."
        />
        <button className="btn btn-primary" onClick={handleSearch}>
          Search
        </button>
      </div>

      {searched && results.length === 0 && (
        <div className="empty-state">
          <p>No notes found for "{query}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((note) => (
            <div key={note.id} className="search-result-card">
              <div className="search-result-header">
                <strong>{note.problem_title}</strong>
                <span className="note-session">Session #{note.session}</span>
                <span className="note-date">
                  {formatDate(note.updated_at)}
                </span>
              </div>
              <div className="note-content markdown-body">
                <Markdown>{note.content}</Markdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
