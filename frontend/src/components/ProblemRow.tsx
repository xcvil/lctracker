import { useRef, useState } from "react";
import { del } from "../api/client";
import type { Problem } from "../types";
import NotesPanel from "./NotesPanel";
import ReviewModal from "./ReviewModal";

const STAGE_INTERVALS = [1, 2, 4, 7, 15, 30];
const TOTAL_STAGES = STAGE_INTERVALS.length;

function StageBar({ stage, progress }: { stage: number; progress: Problem["progress"] }) {
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const p = progress!;
  const daysSinceLast = Math.floor(
    (Date.now() - new Date(p.last_reviewed).getTime()) / 86400000
  );

  // Compute popover position from the bar element
  const getPopoverStyle = (): React.CSSProperties => {
    if (!barRef.current) return {};
    const rect = barRef.current.getBoundingClientRect();
    return {
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      zIndex: 1000,
    };
  };

  return (
    <>
      <div
        ref={barRef}
        className="stage-bar"
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer" }}
      >
        {Array.from({ length: TOTAL_STAGES }, (_, i) => (
          <span
            key={i}
            className={`stage-dot ${i <= stage ? "stage-dot-filled" : ""} ${i === stage ? "stage-dot-current" : ""}`}
          />
        ))}
      </div>
      {open && (
        <div className="stage-popover-overlay" onClick={() => setOpen(false)}>
          <div
            className="stage-popover"
            style={getPopoverStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="stage-popover-header">
              Stage {stage}/5
              <span className="stage-popover-interval">{STAGE_INTERVALS[stage]}天间隔</span>
            </div>
            <div className="stage-popover-body">
              <div className="stage-popover-row">
                <span className="stage-popover-label">首次解题</span>
                <span>{p.first_solved}</span>
              </div>
              <div className="stage-popover-row">
                <span className="stage-popover-label">上次复习</span>
                <span>{p.last_reviewed}{daysSinceLast > 0 ? ` (${daysSinceLast}天前)` : " (今天)"}</span>
              </div>
              <div className="stage-popover-row">
                <span className="stage-popover-label">已复习</span>
                <span>{p.review_count} 次</span>
              </div>
              <div className="stage-popover-row">
                <span className="stage-popover-label">下次复习</span>
                <span>{p.next_due}</span>
              </div>
              <div className="stage-popover-progress">
                {STAGE_INTERVALS.map((interval, i) => (
                  <div key={i} className={`stage-step ${i <= stage ? "stage-step-done" : ""} ${i === stage ? "stage-step-current" : ""}`}>
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

interface Props {
  problem: Problem;
  onAction: (id: number, confidence: number) => void;
  onRefresh: () => void;
}

export default function ProblemRow({ problem, onAction, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
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
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            {p.title}
          </a>
        </td>
        <td>
          <span className={`difficulty ${diffClass}`}>{p.difficulty}</span>
        </td>
        <td>{p.topic}</td>
        <td>{p.progress ? p.progress.review_count : "—"}</td>
        <td>
          {p.progress ? (
            <StageBar stage={p.progress.stage} progress={p.progress} />
          ) : (
            "—"
          )}
        </td>
        <td>
          {p.progress ? (
            <span
              className={`retention-text ${
                p.progress.retention >= 70
                  ? "ret-good"
                  : p.progress.retention >= 40
                  ? "ret-warn"
                  : "ret-bad"
              }`}
            >
              {p.progress.retention}%
            </span>
          ) : (
            "—"
          )}
        </td>
        <td>{p.progress ? p.progress.next_due : "—"}</td>
        <td className="action-cell">
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() =>
                p.progress ? setShowModal(true) : onAction(p.id, 4)
              }
            >
              {p.progress ? "Review" : "Mark Solved"}
            </button>
            {p.progress && (
              <>
                <button
                  className="btn-reset-sm"
                  onClick={handleReset}
                  title="重置进度"
                >
                  ↻
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  Notes
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {showNotes && (
        <tr>
          <td colSpan={8}>
            <NotesPanel problemId={p.id} />
          </td>
        </tr>
      )}
      {showModal && (
        <ReviewModal
          problem={p}
          onReview={(id, conf) => {
            onAction(id, conf);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
