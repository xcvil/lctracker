import { useState } from "react";
import { get } from "../api/client";
import type { ActivityDay, Problem } from "../types";
import { formatDate } from "../utils";
import ProblemDetail from "./ProblemDetail";

interface DayProblem {
  id: number;
  title: string;
  slug: string;
  url: string;
  difficulty: string;
  topic: string;
  confidence: number;
  is_new: boolean;
  review_count: number;
}

interface DayDetail {
  date: string;
  problems: DayProblem[];
}

interface Props {
  activity: ActivityDay[];
}

const CONF_LABELS = ["", "完全忘了", "很模糊", "勉强记得", "比较清晰", "非常熟练"];

export default function CalendarHeatmap({ activity }: Props) {
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [detailProblem, setDetailProblem] = useState<Problem | null>(null);

  const countMap = new Map(activity.map((d) => [d.date, d.count]));

  // Generate all dates for the past year
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  const d = new Date(startDate);

  while (d <= today) {
    currentWeek.push(d.toISOString().split("T")[0]);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    d.setDate(d.getDate() + 1);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const maxCount = Math.max(...activity.map((d) => d.count), 1);
  const colors = ["var(--border)", "#0e3520", "#166534", "#22c55e", "#4ade80"];

  const getColor = (count: number): string => {
    if (count === 0) return colors[0];
    const level = Math.ceil((count / maxCount) * 4);
    return colors[Math.min(level, 4)];
  };

  const cellSize = 14;
  const gap = 3;
  const leftPad = 40;
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthLabels: { label: string; x: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const month = new Date(week[0]).getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      monthLabels.push({
        label: new Date(week[0]).toLocaleString("en", { month: "short" }),
        x: wi * (cellSize + gap),
      });
    }
  });

  const handleCellClick = async (dateStr: string) => {
    const count = countMap.get(dateStr) || 0;
    if (count === 0) {
      setSelectedDay(null);
      return;
    }
    setLoadingDay(true);
    const data = await get<DayDetail>(`/activity/day/${dateStr}`);
    setSelectedDay(data);
    setLoadingDay(false);
  };

  return (
    <div className="calendar-heatmap">
      <div className="heatmap-scroll">
        <svg
          width={weeks.length * (cellSize + gap) + leftPad}
          height={7 * (cellSize + gap) + 25}
        >
          {monthLabels.map((m, i) => (
            <text key={i} x={m.x + leftPad} y={12} className="heatmap-month-label">
              {m.label}
            </text>
          ))}
          {dayLabels.map((label, di) => (
            <text
              key={di} x={leftPad - 4}
              y={22 + di * (cellSize + gap) + cellSize / 2 + 4}
              className="heatmap-day-label" textAnchor="end"
            >
              {label}
            </text>
          ))}
          {weeks.map((week, wi) =>
            week.map((dateStr, di) => {
              const count = countMap.get(dateStr) || 0;
              const isFuture = new Date(dateStr) > today;
              const isSelected = selectedDay?.date === dateStr;
              return (
                <rect
                  key={dateStr}
                  x={leftPad + wi * (cellSize + gap)}
                  y={20 + di * (cellSize + gap)}
                  width={cellSize}
                  height={cellSize}
                  rx={3}
                  fill={isFuture ? "transparent" : getColor(count)}
                  stroke={isSelected ? "white" : "none"}
                  strokeWidth={isSelected ? 2 : 0}
                  className={count > 0 ? "heatmap-cell heatmap-clickable" : "heatmap-cell"}
                  onClick={() => handleCellClick(dateStr)}
                >
                  <title>
                    {dateStr}: {count} problem{count !== 1 ? "s" : ""}
                  </title>
                </rect>
              );
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span>Less</span>
        {[0, 1, 3, 5, 7].map((n) => (
          <span key={n} className="heatmap-legend-cell" style={{ background: getColor(n) }} />
        ))}
        <span>More</span>
      </div>

      {/* Day detail panel */}
      {loadingDay && <div className="loading" style={{ padding: "1rem" }}>Loading...</div>}
      {selectedDay && !loadingDay && (
        <div className="day-detail">
          <div className="day-detail-header">
            <h3>{formatDate(selectedDay.date)}</h3>
            <span className="day-detail-count">
              {selectedDay.problems.length} problem{selectedDay.problems.length !== 1 ? "s" : ""}
            </span>
            <button className="btn btn-link" onClick={() => setSelectedDay(null)}>
              Close
            </button>
          </div>
          <div className="day-detail-list">
            {selectedDay.problems.map((p) => (
              <div
                key={p.id}
                className="day-detail-item day-detail-clickable"
                onClick={() =>
                  setDetailProblem({
                    id: p.id, title: p.title, slug: p.slug, url: p.url,
                    difficulty: p.difficulty as "Easy" | "Medium" | "Hard",
                    topic: p.topic,
                    neetcode_75: false, neetcode_150: false, neetcode_250: false, neetcode_all: true,
                    progress: p.review_count > 0 || p.is_new ? {
                      first_solved: "", last_reviewed: "", review_count: p.review_count,
                      stage: 0, next_due: "", retention: 0,
                    } : null,
                  })
                }
              >
                <span className={`difficulty-badge-sm diff-${p.difficulty.toLowerCase()}`}>
                  {p.difficulty}
                </span>
                <span className="day-detail-title">{p.title}</span>
                <span className="day-detail-topic">{p.topic}</span>
                {p.is_new ? (
                  <span className="today-badge today-badge-green">New</span>
                ) : (
                  <span className="day-detail-conf">
                    {CONF_LABELS[p.confidence] || `${p.confidence}/5`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Problem detail modal */}
      {detailProblem && (
        <ProblemDetail
          problem={detailProblem}
          onClose={() => setDetailProblem(null)}
          showReviewAction={false}
        />
      )}
    </div>
  );
}

