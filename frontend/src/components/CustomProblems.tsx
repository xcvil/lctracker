import { useCallback, useEffect, useState } from "react";
import { del, get, post, put } from "../api/client";
import { formatDate } from "../utils";
import Markdown from "./Markdown";
import NoteTextarea from "./NoteTextarea";

interface CustomProblem {
  id: number;
  title: string;
  slug: string;
  url: string;
  difficulty: string;
  topic: string;
  company: string;
  source: string;
  description: string;
  is_custom: boolean;
  progress: {
    first_solved: string;
    review_count: number;
    retention: number;
    next_due: string;
  } | null;
}

function AddProblemForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [topic, setTopic] = useState("");
  const [topics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    if (open) get<string[]>("/problems/topics").then(setTopics);
  }, [open]);
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await post("/custom", { title, difficulty, topic, company, source, description, url });
    setTitle(""); setCompany(""); setSource(""); setDescription(""); setUrl("");
    setOpen(false);
    onAdded();
  };

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + 添加面经题
      </button>
    );
  }

  return (
    <div className="custom-form">
      <div className="custom-form-row">
        <input className="custom-input custom-input-wide" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="题目标题" />
        <select className="custom-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>
      <div className="custom-form-row">
        <input className="custom-input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="公司 (e.g. Google)" />
        <input className="custom-input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="来源 (e.g. Reddit, Blind)" />
        <select className="custom-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">选择分类</option>
          {topics.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="custom-form-row">
        <input className="custom-input custom-input-wide" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="LeetCode 链接 (可选)" />
      </div>
      <NoteTextarea value={description} onChange={setDescription} rows={4} placeholder="题干描述 (Markdown)..." />
      <div className="custom-form-actions">
        <button className="btn btn-primary btn-sm" onClick={handleSubmit}>保存</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>取消</button>
      </div>
    </div>
  );
}

function CustomProblemCard({ problem, onUpdate }: { problem: CustomProblem; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(problem.title);
  const [company, setCompany] = useState(problem.company);
  const [source, setSource] = useState(problem.source);
  const [description, setDescription] = useState(problem.description);
  const [difficulty, setDifficulty] = useState(problem.difficulty);
  const [topic, setTopic] = useState(problem.topic);
  const [topics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    if (editing) get<string[]>("/problems/topics").then(setTopics);
  }, [editing]);

  const diffClass = `diff-${problem.difficulty.toLowerCase()}`;

  const handleSave = async () => {
    await put(`/custom/${problem.id}`, { title, company, source, description, difficulty, topic });
    setEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (confirm("确定删除这道面经题？所有相关数据将被清除。")) {
      await del(`/custom/${problem.id}`);
      onUpdate();
    }
  };

  const handleMarkSolved = async () => {
    await post(`/reviews/${problem.id}`, { confidence: 4 });
    onUpdate();
  };

  return (
    <div className="custom-card">
      <div className="custom-card-header">
        <span className={`difficulty-badge-sm ${diffClass}`}>{problem.difficulty}</span>
        {editing ? (
          <input className="custom-input custom-input-wide" value={title} onChange={(e) => setTitle(e.target.value)} />
        ) : (
          <span className="custom-card-title">
            {problem.url && problem.url !== `#custom-${problem.slug}` ? (
              <a href={problem.url} target="_blank" rel="noopener noreferrer">{problem.title}</a>
            ) : problem.title}
          </span>
        )}
        {problem.company && <span className="custom-company-tag">{problem.company}</span>}
      </div>

      <div className="custom-card-meta">
        {problem.topic && <span className="custom-meta-item">{problem.topic}</span>}
        {problem.source && <span className="custom-meta-item">来源: {problem.source}</span>}
        {problem.progress && (
          <>
            <span className="custom-meta-item">已复习 {problem.progress.review_count} 次</span>
            <span className={`retention-text ${
              problem.progress.retention >= 70 ? "ret-good" : problem.progress.retention >= 40 ? "ret-warn" : "ret-bad"
            }`}>
              {problem.progress.retention}%
            </span>
          </>
        )}
      </div>

      {editing ? (
        <div className="custom-edit-body">
          <div className="custom-form-row">
            <input className="custom-input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="公司" />
            <input className="custom-input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="来源" />
            <select className="custom-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <select className="custom-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">选择分类</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <NoteTextarea value={description} onChange={setDescription} rows={4} placeholder="题干描述..." />
          <div className="custom-form-actions">
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-sm solution-delete-btn" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      ) : (
        <>
          {problem.description && (
            <div className="note-content markdown-body" style={{ marginTop: "0.5rem" }}>
              <Markdown>{problem.description}</Markdown>
            </div>
          )}
          <div className="custom-card-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
            {!problem.progress && (
              <button className="btn btn-primary btn-sm" onClick={handleMarkSolved}>Mark Solved</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function CustomProblems() {
  const [problems, setProblems] = useState<CustomProblem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProblems = useCallback(async () => {
    const data = await get<CustomProblem[]>("/custom");
    setProblems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  if (loading) return <div className="loading">Loading...</div>;

  const solved = problems.filter((p) => p.progress).length;

  return (
    <div>
      <h2>面经 ({solved}/{problems.length})</h2>
      <AddProblemForm onAdded={fetchProblems} />
      <div className="custom-list">
        {problems.length === 0 ? (
          <div className="empty-state" style={{ marginTop: "1rem" }}>
            <p>还没有面经题。点击上方按钮添加。</p>
          </div>
        ) : (
          problems.map((p) => (
            <CustomProblemCard key={p.id} problem={p} onUpdate={fetchProblems} />
          ))
        )}
      </div>
    </div>
  );
}
