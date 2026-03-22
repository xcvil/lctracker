/**
 * Format ISO date string (YYYY-MM-DD) to Swiss format (DD.MM.YYYY)
 */
export function formatDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("T")[0].split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/**
 * Calculate days until a due date using pure date comparison (no timezone issues).
 * Positive = future, 0 = today, negative = overdue.
 */
export function daysUntil(dueDateIso: string): number {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dueStr = dueDateIso.split("T")[0];

  const todayMs = new Date(todayStr + "T00:00:00").getTime();
  const dueMs = new Date(dueStr + "T00:00:00").getTime();

  return Math.round((dueMs - todayMs) / 86400000);
}

/**
 * Format days until due as a human-readable string.
 */
export function dueText(dueDateIso: string): string {
  const days = daysUntil(dueDateIso);
  if (days > 0) return `${days}天后复习`;
  if (days === 0) return "今天复习";
  return `逾期${Math.abs(days)}天`;
}
