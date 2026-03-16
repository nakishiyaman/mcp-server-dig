/**
 * Shared period key formatting for time-bucketed analysis tools.
 */
export function formatPeriodKey(dateStr: string, granularity: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  switch (granularity) {
    case "daily":
      return `${year}-${month}-${day}`;
    case "monthly":
      return `${year}-${month}`;
    case "weekly": {
      // ISO week: find the Monday of the week
      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      d.setDate(diff);
      const wy = d.getFullYear();
      const wm = String(d.getMonth() + 1).padStart(2, "0");
      const wd = String(d.getDate()).padStart(2, "0");
      return `${wy}-${wm}-${wd}`;
    }
    default:
      return `${year}-${month}-${day}`;
  }
}
