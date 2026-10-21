/**
 * Format timestamp into human-readable relative string matching Nage design.
 * e.g. "Just now", "5m ago", "2h ago", "3d ago"
 */
export function formatRelativeTime(dateInput: string | number | Date): string {
  const timestamp =
    typeof dateInput === "number"
      ? dateInput
      : new Date(dateInput).getTime();

  const now = Date.now();
  const diffMinutes = Math.round((now - timestamp) / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
  return `${Math.round(diffMinutes / 1440)}d ago`;
}
