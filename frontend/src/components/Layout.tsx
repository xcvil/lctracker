import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { get, post } from "../api/client";

export default function Layout() {
  const [dueCount, setDueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

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
