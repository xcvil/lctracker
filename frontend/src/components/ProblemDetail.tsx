import { useCallback, useEffect, useState } from "react";
import Markdown from "./Markdown";
import NoteTextarea from "./NoteTextarea";
import { get, put } from "../api/client";
import type { Note, Problem, ReviewLogEntry } from "../types";
import { daysUntil, dueText, formatDate } from "../utils";
import ConfidenceButtons from "./ConfidenceButtons";

const STAGE_INTERVALS = [1, 2, 4, 7, 15, 30];
const CONF_LABELS = ["", "完全忘了", "很模糊", "勉强记得", "比较清晰", "非常熟练"];

interface Props {
  problem: Problem;
  onReview?: (id: number, confidence: number) => void;
  onClose: () => void;
  showReviewAction?: boolean;
}

function ConfidenceStars({ confidence }: { confidence: number }) {
  return (
    <span className="confidence-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= confidence ? "star-filled" : "star-empty"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ProblemDetail({ problem, onReview, onClose, showReviewAction = true }: Props) {
  const [history, setHistory] = useState<ReviewLogEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [selectedDot, setSelectedDot] = useState<number | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [editContent, setEditContent] = useState("");

  const fetchData = useCallback(async () => {
    const [h, n] = await Promise.all([
      get<ReviewLogEntry[]>(`/reviews/history/${problem.id}`),
      get<Note[]>(`/notes/${problem.id}`),
    ]);
    setHistory(h);
    setNotes(n);
  }, [problem.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfidence = async (confidence: number) => {
    if (onReview) {
      await onReview(problem.id, confidence);
      setReviewed(true);
      fetchData();
    }
  };

  const handleSaveNote = async (noteId: number) => {
    await put(`/notes/${noteId}`, { content: editContent });
    setEditingNote(false);
    fetchData();
  };

  const diffClass = `diff-${problem.difficulty.toLowerCase()}`;
  const p = problem.progress;
  const daysUntilDue = p ? daysUntil(p.next_due) : 0;

  // Map dot index to review history entry
  const getReviewEntry = (dotIndex: number): ReviewLogEntry | undefined => {
    if (dotIndex === 0) return undefined;
    const reversed = [...history].reverse();
    return reversed[dotIndex - 1];
  };

  const getSessionNote = (dotIndex: number): Note | undefined => {
    return notes.find((n) => n.session === dotIndex);
  };

  const handleDotClick = (i: number) => {
    if (p && i > p.stage) return;
    setSelectedDot(selectedDot === i ? null : i);
    setEditingNote(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="detail-header">
          <span className={`difficulty-badge ${diffClass}`}>{problem.difficulty}</span>
          <h2 className="detail-title">
            <a href={problem.url} target="_blank" rel="noopener noreferrer">
              {problem.title}
            </a>
          </h2>
          <span className="detail-topic">{problem.topic}</span>
        </div>

        {/* Stats cards */}
        {p && (
          <div className="detail-stats">
            <div className="detail-stat-item">
              <span className="detail-stat-value">{formatDate(p.first_solved)}</span>
              <span className="detail-stat-label">首次解题</span>
            </div>
            <div className="detail-stat-item">
              <span className="detail-stat-value">{p.review_count}</span>
              <span className="detail-stat-label">复习次数</span>
            </div>
            <div className="detail-stat-item">
              <span className={`detail-stat-value retention-text ${
                p.retention >= 70 ? "ret-good" : p.retention >= 40 ? "ret-warn" : "ret-bad"
              }`}>
                {p.retention}%
              </span>
              <span className="detail-stat-label">记忆保持</span>
            </div>
            <div className="detail-stat-item">
              <span className="detail-stat-value">
                {dueText(p.next_due)}
              </span>
              <span className="detail-stat-label">下次复习</span>
            </div>
          </div>
        )}

        {/* Interactive stage progress */}
        {p && (
          <>
            <div className="detail-stage">
              {STAGE_INTERVALS.map((interval, i) => (
                <div
                  key={i}
                  className={`detail-stage-step ${i <= Math.min(p.stage, STAGE_INTERVALS.length - 1) ? "detail-stage-done detail-stage-clickable" : ""} ${i === Math.min(p.stage, STAGE_INTERVALS.length - 1) ? "detail-stage-current" : ""} ${i === selectedDot ? "detail-stage-selected" : ""}`}
                  onClick={() => handleDotClick(i)}
                >
                  <span className="detail-stage-dot" />
                  <span className="detail-stage-label">{interval}d</span>
                </div>
              ))}
              {p.stage > STAGE_INTERVALS.length - 1 && (
                <span className="stage-extra">+{p.stage - STAGE_INTERVALS.length + 1}</span>
              )}
            </div>

            {/* Selected dot detail */}
            {selectedDot !== null && (
              <div className="detail-dot-info">
                <div className="detail-dot-title">
                  {selectedDot === 0 ? "首次解题" : `第 ${selectedDot} 次复习`}
                </div>
                {selectedDot === 0 ? (
                  <div className="stage-popover-row">
                    <span className="stage-popover-label">日期</span>
                    <span>{formatDate(p.first_solved)}</span>
                  </div>
                ) : (
                  (() => {
                    const entry = getReviewEntry(selectedDot);
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
                  const note = getSessionNote(selectedDot);
                  if (!note) return null;
                  return (
                    <div className="detail-dot-note">
                      {editingNote ? (
                        <div className="note-editor">
                          <NoteTextarea value={editContent} onChange={setEditContent} rows={4} />
                          <div className="note-editor-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveNote(note.id)}>Save</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingNote(false)}>Cancel</button>
                          </div>
                        </div>
                      ) : note.content ? (
                        <div className="note-content markdown-body clickable-note" onClick={() => { setEditingNote(true); setEditContent(note.content); }}>
                          <Markdown>{note.content}</Markdown>
                        </div>
                      ) : (
                        <div className="notes-empty clickable-note" onClick={() => { setEditingNote(true); setEditContent(""); }}>
                          Click to add notes...
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {/* Review action */}
        {showReviewAction && p && (
          <div className="detail-section">
            {daysUntilDue > 0 && !reviewed && (
              <p className="early-review-hint">
                注意: 提前复习，进度不会更新，到期后复习才会推进
              </p>
            )}
            {!reviewed ? (
              <>
                <p className="feedback-prompt">完成后，请评估你的掌握程度：</p>
                <ConfidenceButtons onSelect={handleConfidence} />
              </>
            ) : (
              <div className="reviewed-msg">
                {daysUntilDue > 0
                  ? "已记录练习！Stage 保持不变。"
                  : "已记录复习！Stage 已更新。"}
              </div>
            )}
          </div>
        )}

        {/* Review history */}
        <div className="detail-section">
          <h3 className="section-title">复习历史 ({history.length})</h3>
          {history.length === 0 ? (
            <p className="notes-empty">尚未复习</p>
          ) : (
            <div className="history-list">
              {history.map((entry) => (
                <div key={entry.id} className="history-row">
                  <span className="history-date">{formatDate(entry.date)}</span>
                  <ConfidenceStars confidence={entry.confidence} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close */}
        <button className="modal-close-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
