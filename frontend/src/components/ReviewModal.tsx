import { useCallback, useEffect, useState } from "react";
import { get } from "../api/client";
import type { Problem, ReviewLogEntry } from "../types";
import { formatDate } from "../utils";
import ConfidenceButtons from "./ConfidenceButtons";

interface Props {
  problem: Problem;
  onReview: (id: number, confidence: number) => void;
  onClose: () => void;
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

export default function ReviewModal({ problem, onReview, onClose }: Props) {
  const [history, setHistory] = useState<ReviewLogEntry[]>([]);
  const [reviewed, setReviewed] = useState(false);

  const fetchHistory = useCallback(async () => {
    const data = await get<ReviewLogEntry[]>(`/reviews/history/${problem.id}`);
    setHistory(data);
  }, [problem.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleConfidence = async (confidence: number) => {
    await onReview(problem.id, confidence);
    setReviewed(true);
    fetchHistory();
  };

  const diffClass = `diff-${problem.difficulty.toLowerCase()}`;
  const p = problem.progress;
  const daysUntilDue = p
    ? Math.ceil(
        (new Date(p.next_due).getTime() - Date.now()) / 86400000
      )
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <span className={`difficulty-badge ${diffClass}`}>
            {problem.difficulty}
          </span>
          <h2 className="modal-title">
            <a href={problem.url} target="_blank" rel="noopener noreferrer">
              #{problem.id} {problem.title}
            </a>
          </h2>
          <p className="modal-topic">{problem.topic}</p>
        </div>

        {/* Stats row */}
        {p && (
          <div className="modal-stats">
            <span>已复习 {p.review_count} 次</span>
            <span className="modal-dot">·</span>
            <span
              className={`retention-text ${
                p.retention >= 70
                  ? "ret-good"
                  : p.retention >= 40
                  ? "ret-warn"
                  : "ret-bad"
              }`}
            >
              记忆保持 {p.retention}%
            </span>
            <span className="modal-dot">·</span>
            <span>
              {daysUntilDue > 0
                ? `${daysUntilDue}天后复习`
                : daysUntilDue === 0
                ? "今天复习"
                : `逾期${Math.abs(daysUntilDue)}天`}
            </span>
          </div>
        )}

        {/* Confidence selection */}
        {!reviewed ? (
          <div className="modal-section">
            <p className="feedback-prompt">完成后，请评估你的掌握程度：</p>
            <ConfidenceButtons onSelect={handleConfidence} />
          </div>
        ) : (
          <div className="modal-section reviewed-msg">
            已记录复习！下次复习日期已更新。
          </div>
        )}

        {/* Review history */}
        {history.length > 0 && (
          <div className="modal-section">
            <h3 className="section-title">
              复习历史 ({history.length} 次)
            </h3>
            <div className="history-list">
              {history.map((entry) => (
                <div key={entry.id} className="history-row">
                  <span className="history-date">
                    {formatDate(entry.date)}
                  </span>
                  <ConfidenceStars confidence={entry.confidence} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        <button className="modal-close-btn" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
}

