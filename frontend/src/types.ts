export interface ProblemProgress {
  first_solved: string;
  last_reviewed: string;
  review_count: number;
  stage: number;
  next_due: string;
  retention: number;
  self_rating: number;
  tags: string[];
}

export interface Problem {
  id: number;
  title: string;
  slug: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  neetcode_75: boolean;
  neetcode_150: boolean;
  neetcode_250: boolean;
  neetcode_all: boolean;
  progress: ProblemProgress | null;
}

export interface ReviewResponse {
  problem_id: number;
  review_count: number;
  stage: number;
  next_due: string;
  confidence: number;
}

export interface ReviewLogEntry {
  id: number;
  reviewed_at: string;
  date: string;
  confidence: number;
}

export interface Note {
  id: number;
  problem_id: number;
  session: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Solution {
  id: number;
  problem_id: number;
  title: string;
  code: string;
  time_complexity: string;
  space_complexity: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityDay {
  date: string;
  count: number;
}
