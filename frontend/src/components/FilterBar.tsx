import { useEffect, useState } from "react";
import { get } from "../api/client";

interface Filters {
  topic: string;
  difficulty: string;
  list: string;
  status: string;
  tag?: string;
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function FilterBar({ filters, onChange }: Props) {
  const [topics, setTopics] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    get<string[]>("/problems/topics").then(setTopics);
    get<string[]>("/problems/tags").then(setTags);
  }, []);

  const update = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="filter-bar">
      <select value={filters.list} onChange={(e) => update("list", e.target.value)}>
        <option value="">All Lists</option>
        <option value="neetcode_75">NeetCode 75</option>
        <option value="neetcode_150">NeetCode 150</option>
        <option value="neetcode_250">NeetCode 250</option>
        <option value="custom">面经</option>
      </select>

      <select value={filters.topic} onChange={(e) => update("topic", e.target.value)}>
        <option value="">All Topics</option>
        {topics.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select value={filters.difficulty} onChange={(e) => update("difficulty", e.target.value)}>
        <option value="">All Difficulties</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
      </select>

      <select value={filters.status} onChange={(e) => update("status", e.target.value)}>
        <option value="">All Status</option>
        <option value="solved">Solved</option>
        <option value="unsolved">Unsolved</option>
        <option value="due">Due for Review</option>
      </select>

      {tags.length > 0 && (
        <select value={filters.tag || ""} onChange={(e) => update("tag", e.target.value)}>
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
