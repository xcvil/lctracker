import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useActivity } from "../hooks/useActivity";

export default function ActivityChart() {
  const { activity, loading } = useActivity(90);

  if (loading) return <div className="loading">Loading...</div>;

  const total = activity.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <h2>Daily Activity (Last 90 Days)</h2>
      <p className="activity-summary">
        Total distinct problems worked: <strong>{total}</strong> across{" "}
        <strong>{activity.length}</strong> active days
      </p>
      {activity.length === 0 ? (
        <div className="empty-state">
          <p>No activity yet. Start solving problems!</p>
        </div>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={activity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => d.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} />
              <Tooltip
                labelFormatter={(d: string) => `Date: ${d}`}
                formatter={(value: number) => [`${value} problems`, "Distinct Problems"]}
              />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
