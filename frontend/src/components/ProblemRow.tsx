import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { del, get, put } from "../api/client";
import type { Note, Problem, ReviewLogEntry } from "../types";
import { formatDate } from "../utils";
import NotesPanel from "./NotesPanel";
import ProblemDetail from "./ProblemDetail";

const STAGE_INTERVALS = [1, 2, 4, 7, 15, 30];
const TOTAL_STAGES = STAGE_INTERVALS.length;

const CONF_LABELS = ["", "完全忘了", "很模糊", "勉强记得", "比较清晰", "非常熟练"];

function StageBar({ problemId, stage, progress }: { problemId: number; stage: number; progress: Problem["progress"] }) {
  const [openDot, setOpenDot] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [history, setHistory] = useState<ReviewLogEntry[]>([]);
  const [editContent, setEditContent] = useState("");
  const [editing, setEditing] = useState(false);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const p = progress!;

  const fetchData = useCallback(async () => {
    const [n, h] = await Promise.all([
      get<Note[]>(`/notes/${problemId}`),
      get<ReviewLogEntry[]>(`/reviews/history/${problemId}`),
    ]);
    setNotes(n);
    setHistory(h);
  }, [problemId]);

  useEffect(() => {
    if (openDot !== null) fetchData();
  }, [openDot, fetchData]);

  const handleSaveNote = async (noteId: number) => {
    await put(`/notes/${noteId}`, { content: editContent });
    setEditing(false);
    fetchData();
  };

  const getPopoverStyle = (dotIndex: number): React.CSSProperties => {
    const el = dotRefs.current[dotIndex];
    if (!el) return {};
    const rect = el.getBoundingClientRect();
    return { position: "fixed", top: rect.bottom + 8, left: Math.max(rect.left - 80, 8), zIndex: 1000 };
  };

  const handleDotClick = (i: number) => {
    if (i > stage) return; // can't click future dots
    setOpenDot(openDot === i ? null : i);
    setEditing(false);
  };

  // Map dot index to session: dot 0 = session 0 (first solve), dot 1+ = session 1+ (reviews)
  // But stages can go backwards, so we map: dot 0 = first solve, dot N = review N
  const getSessionNote = (dotIndex: number): Note | undefined => {
    return notes.find((n) => n.session === dotIndex);
  };

  // Get the review log entry for this dot (reviews are 1-indexed, dot 0 = first solve has no review)
  const getReviewEntry = (dotIndex: number): ReviewLogEntry | undefined => {
    if (dotIndex === 0) return undefined;
    // history is ordered desc, review entries correspond to session 1, 2, 3...
    const reversed = [...history].reverse();
    return reversed[dotIndex - 1];
  };

  return (
    <>
      <div className="stage-bar">
        {Array.from({ length: TOTAL_STAGES }, (_, i) => (
          <span
            key={i}
            ref={(el) => { dotRefs.current[i] = el; }}
            className={`stage-dot ${i <= stage ? "stage-dot-filled stage-dot-clickable" : ""} ${i === stage ? "stage-dot-current" : ""}`}
            onClick={() => handleDotClick(i)}
          />
        ))}
      </div>
      {openDot !== null && (
        <div className="stage-popover-overlay" onClick={() => { setOpenDot(null); setEditing(false); }}>
          <div className="stage-popover" style={getPopoverStyle(openDot)} onClick={(e) => e.stopPropagation()}>
            {/* Overview header — always shown */}
            <div className="stage-popover-header">
              Stage {stage}/5
              <span className="stage-popover-interval">
                {(() => {
                  const days = Math.ceil((new Date(p.next_due).getTime() - Date.now()) / 86400000);
                  if (days > 0) return `${days}天后复习`;
                  if (days === 0) return "今天复习";
                  return `逾期${Math.abs(days)}天`;
                })()}
              </span>
            </div>

            <div className="stage-popover-body">
              {/* Overview stats */}
              <div className="stage-popover-row">
                <span className="stage-popover-label">首次解题</span>
                <span>{formatDate(p.first_solved)}</span>
              </div>
              {p.review_count > 0 && (
                <div className="stage-popover-row">
                  <span className="stage-popover-label">已复习</span>
                  <span>{p.review_count} 次</span>
                </div>
              )}
              <div className="stage-popover-row">
                <span className="stage-popover-label">下次复习</span>
                <span>{formatDate(p.next_due)}</span>
              </div>

              {/* Selected dot detail */}
              <div className="stage-popover-divider" />
              <div className="stage-popover-dot-title">
                {openDot === 0 ? "首次解题" : `第 ${openDot} 次复习`}
              </div>
              {openDot === 0 ? (
                <div className="stage-popover-row">
                  <span className="stage-popover-label">日期</span>
                  <span>{formatDate(p.first_solved)}</span>
                </div>
              ) : (
                (() => {
                  const entry = getReviewEntry(openDot);
                  return entry ? (
                    <>
                      <div className="stage-popover-row">
                        <span className="stage-popover-label">日期</span>
                        <span>{formatDate(entry.date)}</span>
                      </div>
                      <div className="stage-popover-row">
                        <span className="stage-popover-label">掌握度</span>
                        <span>{CONF_LABELS[entry.confidence]}</span>
                      </div>
                    </>
                  ) : (
                    <div className="stage-popover-row">
                      <span className="stage-popover-label">状态</span>
                      <span style={{ color: "var(--text-muted)" }}>已到达此阶段</span>
                    </div>
                  );
                })()
              )}

              {/* Note for this session */}
              {(() => {
                const note = getSessionNote(openDot);
                if (!note) return null;
                return (
                  <div className="stage-popover-note">
                    {editing ? (
                      <div className="note-editor">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                          placeholder="Write your notes in Markdown..."
                        />
                        <div className="note-editor-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => handleSaveNote(note.id)}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                      </div>
                    ) : note.content ? (
                      <div className="note-content markdown-body clickable-note" onClick={() => { setEditing(true); setEditContent(note.content); }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="notes-empty clickable-note" onClick={() => { setEditing(true); setEditContent(""); }}>
                        Click to add notes...
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Bottom: clickable stage steps */}
              <div className="stage-popover-progress">
                {STAGE_INTERVALS.map((interval, i) => (
                  <div
                    key={i}
                    className={`stage-step ${i <= stage ? "stage-step-done stage-step-clickable" : ""} ${i === stage ? "stage-step-current" : ""} ${i === openDot ? "stage-step-selected" : ""}`}
                    onClick={() => i <= stage && handleDotClick(i)}
                  >
                    <span className="stage-step-dot" />
                    <span className="stage-step-label">{interval}d</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const RATING_OPTIONS = [
  { value: 1, icon: "✓", label: "有自信", className: "rating-easy" },
  { value: 2, icon: "~", label: "得想想", className: "rating-mid" },
  { value: 3, icon: "!", label: "不确定", className: "rating-hard" },
];

function SelfRating({ problemId, initialRating }: { problemId: number; initialRating: number }) {
  const [rating, setRating] = useState(initialRating);

  const handleClick = async (value: number) => {
    const newVal = rating === value ? 0 : value;
    const oldVal = rating;
    setRating(newVal);
    try {
      await put(`/reviews/${problemId}/rating`, { rating: newVal });
    } catch {
      setRating(oldVal);
    }
  };

  return (
    <div className="self-rating">
      {RATING_OPTIONS.map((opt) => (
        <span
          key={opt.value}
          className={`rating-btn ${opt.className} ${rating === opt.value ? "rating-active" : ""}`}
          onClick={() => handleClick(opt.value)}
          title={opt.label}
        >
          {opt.icon}
        </span>
      ))}
    </div>
  );
}

function TagsEditor({ problemId, initialTags }: { problemId: number; initialTags: string[] }) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [tags, setTags] = useState(initialTags);

  useEffect(() => {
    if (adding) {
      get<string[]>("/problems/tags").then(setAllTags);
    }
  }, [adding]);

  const suggestions = input.trim()
    ? allTags.filter((t) => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t))
    : [];

  const addTag = async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) { setInput(""); return; }
    const newTags = [...tags, trimmed];
    const oldTags = tags;
    setTags(newTags);
    setInput("");
    setAdding(false);
    setSelectedIdx(-1);
    try {
      await put(`/reviews/${problemId}/tags`, { tags: newTags });
    } catch {
      setTags(oldTags); // rollback on failure
    }
  };

  const handleRemove = async (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    const oldTags = tags;
    setTags(newTags);
    try {
      await put(`/reviews/${problemId}/tags`, { tags: newTags });
    } catch {
      setTags(oldTags);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        addTag(suggestions[selectedIdx]);
      } else {
        addTag(input);
      }
    } else if (e.key === "Escape") {
      setAdding(false);
      setInput("");
    }
  };

  return (
    <div className="tags-editor">
      {tags.map((tag) => (
        <span key={tag} className="tag-chip">
          {tag}
          <span className="tag-remove" onClick={() => handleRemove(tag)}>×</span>
        </span>
      ))}
      {adding ? (
        <div className="tag-input-wrapper">
          <input
            className="tag-input"
            value={input}
            onChange={(e) => { setInput(e.target.value); setSelectedIdx(-1); }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => { if (!input.trim()) setAdding(false); }, 150)}
            autoFocus
            placeholder="tag..."
          />
          {suggestions.length > 0 && (
            <div className="tag-suggestions">
              {suggestions.map((s, i) => (
                <div
                  key={s}
                  className={`tag-suggestion ${i === selectedIdx ? "tag-suggestion-active" : ""}`}
                  onMouseDown={() => addTag(s)}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <span className="tag-add" onClick={() => setAdding(true)}>+</span>
      )}
    </div>
  );
}

interface Props {
  problem: Problem;
  onAction: (id: number, confidence: number) => void;
  onRefresh: () => void;
}

export default function ProblemRow({ problem, onAction, onRefresh }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const p = problem;
  const diffClass = `diff-${p.difficulty.toLowerCase()}`;

  const handleReset = async () => {
    if (confirm("确定要重置这道题的进度吗？所有复习记录和笔记将被清除。")) {
      await del(`/reviews/${p.id}`);
      onRefresh();
    }
  };

  return (
    <>
      <tr>
        <td>
          <div className="problem-title-cell">
            <a href={p.url} target="_blank" rel="noopener noreferrer">
              {p.title}
            </a>
            {p.progress && (
              <TagsEditor problemId={p.id} initialTags={p.progress.tags} />
            )}
          </div>
        </td>
        <td>
          <span className={`difficulty ${diffClass}`}>{p.difficulty}</span>
        </td>
        <td>{p.topic}</td>
        <td>{p.progress ? p.progress.review_count : "—"}</td>
        <td>
          {p.progress ? (
            <StageBar problemId={p.id} stage={p.progress.stage} progress={p.progress} />
          ) : (
            "—"
          )}
        </td>
        <td>
          {p.progress ? (
            <span
              className={`retention-text ${
                p.progress.retention >= 70 ? "ret-good" : p.progress.retention >= 40 ? "ret-warn" : "ret-bad"
              }`}
            >
              {p.progress.retention}%
            </span>
          ) : (
            "—"
          )}
        </td>
        <td>{p.progress ? formatDate(p.progress.next_due) : "—"}</td>
        <td>
          {p.progress ? (
            <SelfRating problemId={p.id} initialRating={p.progress.self_rating} />
          ) : (
            "—"
          )}
        </td>
        <td className="action-cell">
          <div className="action-buttons">
            {p.progress ? (
              <>
                <button className="btn btn-primary" onClick={() => setShowDetail(true)}>
                  Review
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  Notes
                </button>
                <button className="btn-reset-sm" onClick={handleReset} title="重置进度">
                  ↻
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => onAction(p.id, 4)}>
                Mark Solved
              </button>
            )}
          </div>
        </td>
      </tr>
      {showNotes && (
        <tr>
          <td colSpan={9}>
            <NotesPanel problemId={p.id} />
          </td>
        </tr>
      )}
      {showDetail && (
        <ProblemDetail
          problem={p}
          onReview={async (id, conf) => {
            await onAction(id, conf);
            onRefresh();
          }}
          onClose={() => { setShowDetail(false); onRefresh(); }}
        />
      )}
    </>
  );
}
