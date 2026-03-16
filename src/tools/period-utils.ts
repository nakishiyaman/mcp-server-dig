/**
 * Shared period key formatting for time-bucketed analysis tools.
 */

/**
 * Generate a complete range of period keys between two dates.
 * Useful for detecting periods with zero activity (droughts).
 */
export function generatePeriodRange(
  startDate: string,
  endDate: string,
  granularity: string,
): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periods: string[] = [];

  if (start > end) return periods;

  const current = new Date(start);

  switch (granularity) {
    case "monthly":
      // Align to first of month
      current.setDate(1);
      while (current <= end) {
        periods.push(formatPeriodKey(current.toISOString(), "monthly"));
        current.setMonth(current.getMonth() + 1);
      }
      break;
    case "weekly": {
      // Align to Monday
      const day = current.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      current.setDate(current.getDate() + diff);
      while (current <= end) {
        periods.push(formatPeriodKey(current.toISOString(), "weekly"));
        current.setDate(current.getDate() + 7);
      }
      break;
    }
    default: // daily
      while (current <= end) {
        periods.push(formatPeriodKey(current.toISOString(), "daily"));
        current.setDate(current.getDate() + 1);
      }
      break;
  }

  return periods;
}

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
