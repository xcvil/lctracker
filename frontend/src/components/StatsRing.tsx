import { useEffect, useState } from "react";
import { get } from "../api/client";

interface Stats {
  total_problems: number;
  total_solved: number;
  total_reviews: number;
  today_new: number;
  today_reviews: number;
  by_difficulty: {
    Easy: { solved: number; total: number };
    Medium: { solved: number; total: number };
    Hard: { solved: number; total: number };
  };
}

export default function StatsRing() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    get<Stats>("/activity/stats").then(setStats);
  }, []);

  if (!stats) return null;

  const { total_solved, total_problems, total_reviews, today_new, today_reviews, by_difficulty } = stats;

  // SVG arc — open at the bottom like the LeetCode/NeetCode design
  // Arc spans 240° (from 150° to 30°, i.e. bottom-left → top → bottom-right)
  // Bottom 120° is the gap (open)
  // Order: Easy (left) → Med (top) → Hard (right)
  const size = 160;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const arcDeg = 240; // total arc degrees
  const gapDeg = 5; // gap between segments
  const arcLen = (arcDeg / 360) * circumference;
  const gapLen = (gapDeg / 360) * circumference;
  const usableLen = arcLen - gapLen * 2; // 3 segments, 2 gaps between them

  // Segment sizes proportional to each difficulty's count
  const easyRatio = total_problems > 0 ? by_difficulty.Easy.total / total_problems : 1 / 3;
  const medRatio = total_problems > 0 ? by_difficulty.Medium.total / total_problems : 1 / 3;
  const hardRatio = total_problems > 0 ? by_difficulty.Hard.total / total_problems : 1 / 3;

  const easyTrack = easyRatio * usableLen;
  const medTrack = medRatio * usableLen;
  const hardTrack = hardRatio * usableLen;

  // Fill proportions within each segment
  const easyFill = by_difficulty.Easy.total > 0 ? by_difficulty.Easy.solved / by_difficulty.Easy.total : 0;
  const medFill = by_difficulty.Medium.total > 0 ? by_difficulty.Medium.solved / by_difficulty.Medium.total : 0;
  const hardFill = by_difficulty.Hard.total > 0 ? by_difficulty.Hard.solved / by_difficulty.Hard.total : 0;

  const easyLen = easyFill * easyTrack;
  const medLen = medFill * medTrack;
  const hardLen = hardFill * hardTrack;

  // Starting angles (degrees, 0 = 3 o'clock, clockwise)
  // Arc starts at bottom-left (150°) and goes clockwise to bottom-right (30°)
  const arcStartDeg = 150; // bottom-left
  const easySegDeg = easyRatio * (arcDeg - gapDeg * 2);
  const medSegDeg = medRatio * (arcDeg - gapDeg * 2);

  const easyStartDeg = arcStartDeg;
  const medStartDeg = easyStartDeg + easySegDeg + gapDeg;
  const hardStartDeg = medStartDeg + medSegDeg + gapDeg;

  return (
    <div className="stats-ring-container">
      {/* Left: difficulty breakdown */}
      <div className="stats-ring-left">
        <div className="stats-diff-row">
          <span className="diff-dot easy-dot" />
          <span className="diff-label diff-label-easy">Easy</span>
          <span className="diff-count">
            {by_difficulty.Easy.solved}/{by_difficulty.Easy.total}
          </span>
        </div>
        <div className="stats-diff-row">
          <span className="diff-dot med-dot" />
          <span className="diff-label diff-label-med">Med</span>
          <span className="diff-count">
            {by_difficulty.Medium.solved}/{by_difficulty.Medium.total}
          </span>
        </div>
        <div className="stats-diff-row">
          <span className="diff-dot hard-dot" />
          <span className="diff-label diff-label-hard">Hard</span>
          <span className="diff-count">
            {by_difficulty.Hard.solved}/{by_difficulty.Hard.total}
          </span>
        </div>
      </div>

      {/* Center: donut with 3 fixed segments */}
      <div className="stats-ring-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Easy background track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="var(--easy)" strokeWidth={stroke} opacity={0.15}
            strokeDasharray={`${easyTrack} ${circumference - easyTrack}`}
            strokeDashoffset={0} strokeLinecap="round"
            transform={`rotate(${easyStartDeg} ${size / 2} ${size / 2})`}
          />
          {/* Medium background track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="var(--medium)" strokeWidth={stroke} opacity={0.15}
            strokeDasharray={`${medTrack} ${circumference - medTrack}`}
            strokeDashoffset={0} strokeLinecap="round"
            transform={`rotate(${medStartDeg} ${size / 2} ${size / 2})`}
          />
          {/* Hard background track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="var(--hard)" strokeWidth={stroke} opacity={0.15}
            strokeDasharray={`${hardTrack} ${circumference - hardTrack}`}
            strokeDashoffset={0} strokeLinecap="round"
            transform={`rotate(${hardStartDeg} ${size / 2} ${size / 2})`}
          />

          {/* Easy filled arc */}
          {easyLen > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke="var(--easy)" strokeWidth={stroke}
              strokeDasharray={`${easyLen} ${circumference - easyLen}`}
              strokeDashoffset={0} strokeLinecap="round"
              transform={`rotate(${easyStartDeg} ${size / 2} ${size / 2})`}
            />
          )}
          {/* Medium filled arc */}
          {medLen > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke="var(--medium)" strokeWidth={stroke}
              strokeDasharray={`${medLen} ${circumference - medLen}`}
              strokeDashoffset={0} strokeLinecap="round"
              transform={`rotate(${medStartDeg} ${size / 2} ${size / 2})`}
            />
          )}
          {/* Hard filled arc */}
          {hardLen > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke="var(--hard)" strokeWidth={stroke}
              strokeDasharray={`${hardLen} ${circumference - hardLen}`}
              strokeDashoffset={0} strokeLinecap="round"
              transform={`rotate(${hardStartDeg} ${size / 2} ${size / 2})`}
            />
          )}
        </svg>
        <div className="stats-ring-text">
          <span className="stats-ring-number">{total_solved}</span>
          <span className="stats-ring-sep">/{total_problems}</span>
          <span className="stats-ring-label">Solved</span>
        </div>
      </div>

      {/* Right: totals + today badges */}
      <div className="stats-ring-right">
        <div className="stats-card">
          <div className="stats-card-main">
            <span className="stats-card-number">{total_solved}</span>
            <span className="stats-card-label">Solved</span>
          </div>
          {today_new > 0 && (
            <span className="today-badge today-badge-green">+{today_new} today</span>
          )}
        </div>
        <div className="stats-card">
          <div className="stats-card-main">
            <span className="stats-card-number">{total_reviews}</span>
            <span className="stats-card-label">Reviews</span>
          </div>
          {today_reviews > 0 && (
            <span className="today-badge today-badge-blue">+{today_reviews} today</span>
          )}
        </div>
      </div>
    </div>
  );
}
