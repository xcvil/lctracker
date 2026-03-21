import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { get, post, put } from "../api/client";
import type { Note } from "../types";

interface Props {
  problemId: number;
}

export default function NotesPanel({ problemId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    const data = await get<Note[]>(`/notes/${problemId}`);
    setNotes(data);
    setLoading(false);
  }, [problemId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSave = async (noteId: number) => {
    await put(`/notes/${noteId}`, { content: editContent });
    setEditingId(null);
    fetchNotes();
  };

  const handleAdd = async () => {
    await post(`/notes/${problemId}`, { content: "" });
    fetchNotes();
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  if (loading) return <div className="loading">Loading notes...</div>;

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <h4>Notes</h4>
        <button className="btn btn-secondary btn-sm" onClick={handleAdd}>
          + Add Note
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="notes-empty">No notes yet.</p>
      ) : (
        notes.map((note) => (
          <div key={note.id} className="note-card">
            <div className="note-meta">
              <span className="note-session">Session #{note.session}</span>
              <span className="note-date">
                {note.updated_at.split("T")[0]}
              </span>
            </div>
            {editingId === note.id ? (
              <div className="note-editor">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  placeholder="Write your notes in Markdown..."
                />
                <div className="note-editor-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSave(note.id)}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : note.content ? (
              <div
                className="note-content markdown-body clickable-note"
                onClick={() => startEdit(note)}
              >
                <ReactMarkdown>{note.content}</ReactMarkdown>
              </div>
            ) : (
              <div
                className="notes-empty clickable-note"
                onClick={() => startEdit(note)}
              >
                Click to add notes...
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
