import { useActivity } from "../hooks/useActivity";
import CalendarHeatmap from "./CalendarHeatmap";
import StatsRing from "./StatsRing";

export default function ActivityChart() {
  const { activity, loading } = useActivity();

  if (loading) return <div className="loading">Loading...</div>;

  const total = activity.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      {/* Stats donut */}
      <StatsRing />

      {/* Calendar heatmap */}
      <h2 style={{ marginTop: "2rem" }}>Activity Calendar</h2>
      {activity.length === 0 ? (
        <div className="empty-state">
          <p>No activity yet. Start solving problems!</p>
        </div>
      ) : (
        <>
          <p className="activity-summary">
            Total distinct problem reviews: <strong>{total}</strong> across{" "}
            <strong>{activity.length}</strong> active days
          </p>
          <CalendarHeatmap activity={activity} />
        </>
      )}
    </div>
  );
}
