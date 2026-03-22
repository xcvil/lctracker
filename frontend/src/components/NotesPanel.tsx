import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { get, put } from "../api/client";
import type { Note } from "../types";
import { formatDate } from "../utils";

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

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  if (loading) return <div className="loading">Loading notes...</div>;

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <h4>Notes</h4>
      </div>
      {notes.length === 0 ? (
        <p className="notes-empty">No notes yet. Solve or review this problem to create a note.</p>
      ) : (
        notes.map((note) => (
          <div key={note.id} className="note-card">
            <div className="note-meta">
              <span className="note-session">
                {note.session === 0 ? "首次解题" : `第 ${note.session} 次复习`}
              </span>
              <span className="note-date">
                {formatDate(note.updated_at)}
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
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
