/**
 * Format ISO date string (YYYY-MM-DD) to Swiss format (DD.MM.YYYY)
 */
export function formatDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("T")[0].split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}
