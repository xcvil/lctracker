import { useState } from "react";
import { del } from "../api/client";
import type { Problem } from "../types";
import NotesPanel from "./NotesPanel";
import ReviewModal from "./ReviewModal";

const STAGE_LABELS = ["1d", "2d", "4d", "7d", "15d", "30d"];

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
            <span className="stage-badge">
              Stage {p.progress.stage} ({STAGE_LABELS[p.progress.stage]})
            </span>
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
