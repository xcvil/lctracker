import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { get, post } from "../api/client";

export default function Layout() {
  const [dueCount, setDueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get<{ count: number }>("/reviews/due/count").then((d) =>
      setDueCount(d.count)
    );
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    const result = await post<{ added: number; total: number }>(
      "/problems/sync"
    );
    setSyncing(false);
    alert(
      result.added > 0
        ? `Synced! Added ${result.added} new problems. Total: ${result.total}`
        : `Already up to date. Total: ${result.total} problems.`
    );
  };

  const handleExport = () => {
    // Trigger file download via the API
    const link = document.createElement("a");
    link.href = "/api/export";
    link.download = `lctracker-backup-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/export/import", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert("Import failed.");
      return;
    }

    const result = await res.json();
    alert(
      `Imported: ${result.imported_progress} progress, ${result.imported_reviews} reviews, ${result.imported_notes} notes`
    );
    window.location.reload();
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">LCTracker</div>
        <div className="nav-links">
          <NavLink to="/" end>
            Reviews{" "}
            {dueCount > 0 && <span className="badge">{dueCount}</span>}
          </NavLink>
          <NavLink to="/problems">Problems</NavLink>
          <NavLink to="/notes">Notes</NavLink>
          <NavLink to="/activity">Activity</NavLink>
        </div>
        <div className="nav-actions">
          <button className="btn btn-sync" onClick={handleExport} title="Export data">
            ↓ Export
          </button>
          <button
            className="btn btn-sync"
            onClick={() => fileInputRef.current?.click()}
            title="Import data"
          >
            ↑ Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleImport}
          />
          <button
            className="btn btn-sync"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "↻ Sync"}
          </button>
        </div>
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
