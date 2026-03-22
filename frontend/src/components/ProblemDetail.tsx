import { useCallback, useEffect, useState } from "react";
import { get } from "../api/client";
import type { Problem, ReviewLogEntry } from "../types";
import { formatDate } from "../utils";
import ConfidenceButtons from "./ConfidenceButtons";

const STAGE_INTERVALS = [1, 2, 4, 7, 15, 30];

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
  const [reviewed, setReviewed] = useState(false);

  const fetchHistory = useCallback(async () => {
    const data = await get<ReviewLogEntry[]>(`/reviews/history/${problem.id}`);
    setHistory(data);
  }, [problem.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleConfidence = async (confidence: number) => {
    if (onReview) {
      await onReview(problem.id, confidence);
      setReviewed(true);
      fetchHistory();
    }
  };

  const diffClass = `diff-${problem.difficulty.toLowerCase()}`;
  const p = problem.progress;
  const daysUntilDue = p
    ? Math.ceil((new Date(p.next_due).getTime() - Date.now()) / 86400000)
    : 0;

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
                {daysUntilDue > 0 ? `${daysUntilDue}天后` : daysUntilDue === 0 ? "今天" : `逾期${Math.abs(daysUntilDue)}天`}
              </span>
              <span className="detail-stat-label">下次复习</span>
            </div>
          </div>
        )}

        {/* Stage progress */}
        {p && (
          <div className="detail-stage">
            {STAGE_INTERVALS.map((interval, i) => (
              <div key={i} className={`detail-stage-step ${i <= p.stage ? "detail-stage-done" : ""} ${i === p.stage ? "detail-stage-current" : ""}`}>
                <span className="detail-stage-dot" />
                <span className="detail-stage-label">{interval}d</span>
              </div>
            ))}
          </div>
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
