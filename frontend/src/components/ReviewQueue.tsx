import { useState } from "react";
import { useReviews } from "../hooks/useReviews";
import type { Problem } from "../types";
import ReviewModal from "./ReviewModal";

function ReviewListItem({
  problem,
  onOpenReview,
  onReset,
}: {
  problem: Problem;
  onOpenReview: (p: Problem) => void;
  onReset: (id: number) => void;
}) {
  const p = problem.progress!;
  const diffClass = `diff-${problem.difficulty.toLowerCase()}`;
  const daysUntilDue = Math.ceil(
    (new Date(p.next_due).getTime() - Date.now()) / 86400000
  );

  return (
    <div className="review-list-item">
      <div className="review-item-left">
        <span className={`difficulty-badge-sm ${diffClass}`}>
          {problem.difficulty}
        </span>
        <a
          href={problem.url}
          target="_blank"
          rel="noopener noreferrer"
          className="review-item-title"
        >
          #{problem.id} {problem.title}
        </a>
      </div>
      <div className="review-item-right">
        <span className="review-item-meta">
          已复习{p.review_count}次
        </span>
        <span className="review-item-meta">·</span>
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
        <span className="review-item-meta">·</span>
        <span className="review-item-meta">
          {daysUntilDue > 0
            ? `${daysUntilDue}天后复习`
            : daysUntilDue === 0
            ? "今天复习"
            : `逾期${Math.abs(daysUntilDue)}天`}
        </span>
        <button
          className="btn-reset"
          onClick={() => onReset(problem.id)}
          title="重置进度"
        >
          ↻
        </button>
        <button
          className="btn-review"
          onClick={() => onOpenReview(problem)}
        >
          再练
        </button>
      </div>
    </div>
  );
}

export default function ReviewQueue() {
  const { todayProblems, overdueProblems, loading, markReviewed, resetProgress } =
    useReviews();
  const [showOverdue, setShowOverdue] = useState(false);
  const [modalProblem, setModalProblem] = useState<Problem | null>(null);

  if (loading) return <div className="loading">Loading...</div>;

  const totalDue = todayProblems.length + overdueProblems.length;

  const handleReset = (id: number) => {
    if (confirm("确定要重置这道题的进度吗？所有复习记录和笔记将被清除。")) {
      resetProgress(id);
    }
  };

  return (
    <div>
      {/* Today's reviews */}
      <h2>今日复习 ({todayProblems.length})</h2>
      {todayProblems.length === 0 ? (
        <div className="empty-state">
          <p>今天没有需要复习的题目，很棒！</p>
          <p>
            去 <a href="/problems">题目列表</a> 开始刷题吧。
          </p>
        </div>
      ) : (
        <div className="review-list">
          {todayProblems.map((p) => (
            <ReviewListItem
              key={p.id}
              problem={p}
              onOpenReview={setModalProblem}
              onReset={handleReset}
            />
          ))}
        </div>
      )}

      {/* Overdue section */}
      {overdueProblems.length > 0 && (
        <div className="overdue-section">
          <button
            className="overdue-toggle"
            onClick={() => setShowOverdue(!showOverdue)}
          >
            <h3>
              逾期未复习 ({overdueProblems.length})
              <span className="toggle-icon">
                {showOverdue ? "▼" : "▶"}
              </span>
            </h3>
          </button>
          {showOverdue && (
            <div className="review-list">
              {overdueProblems.map((p) => (
                <ReviewListItem
                  key={p.id}
                  problem={p}
                  onOpenReview={setModalProblem}
                  onReset={handleReset}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {totalDue === 0 && (
        <div className="empty-state" style={{ marginTop: "1rem" }}>
          <p>所有复习都已完成！</p>
        </div>
      )}

      {/* Review modal */}
      {modalProblem && (
        <ReviewModal
          problem={modalProblem}
          onReview={markReviewed}
          onClose={() => setModalProblem(null)}
        />
      )}
    </div>
  );
}
