import {
  analyzeHotspotsAndChurn,
  type CombinedAnalysisOptions,
} from "./combined-log-analysis.js";
import {
  analyzeContributors,
  type ContributorsOptions,
} from "./contributors.js";

export type TrendMetric = "hotspots" | "churn" | "contributors" | "commit_count";
export type PeriodLength = "week" | "month" | "quarter";

export interface PeriodData {
  label: string;
  since: string;
  until: string;
  value: number;
}

export interface TrendResult {
  metric: TrendMetric;
  periodLength: PeriodLength;
  periods: PeriodData[];
  delta: number;
  deltaPercentage: number | null;
  direction: "improving" | "stable" | "worsening";
}

export interface TrendAnalysisOptions {
  metric: TrendMetric;
  periodLength?: PeriodLength;
  numPeriods?: number;
  pathPattern?: string;
  timeoutMs?: number;
}

/**
 * Analyze trend over time by running the same analysis across multiple time periods.
 * Compares period-over-period changes to detect improvement or deterioration.
 */
export async function analyzeTrend(
  repoPath: string,
  options: TrendAnalysisOptions,
): Promise<TrendResult> {
  const {
    metric,
    periodLength = "month",
    numPeriods = 3,
    pathPattern,
    timeoutMs,
  } = options;

  const periodBoundaries = computePeriodBoundaries(periodLength, numPeriods);
  const periods: PeriodData[] = [];

  for (const boundary of periodBoundaries) {
    const value = await measureMetric(repoPath, metric, boundary.since, boundary.until, {
      pathPattern,
      timeoutMs,
    });
    periods.push({
      label: boundary.label,
      since: boundary.since,
      until: boundary.until,
      value,
    });
  }

  const firstValue = periods[0]?.value ?? 0;
  const lastValue = periods[periods.length - 1]?.value ?? 0;
  const delta = lastValue - firstValue;
  const deltaPercentage = firstValue > 0 ? Math.round((delta / firstValue) * 100) : null;
  const direction = classifyDirection(metric, delta, firstValue);

  return {
    metric,
    periodLength,
    periods,
    delta,
    deltaPercentage,
    direction,
  };
}

interface PeriodBoundary {
  label: string;
  since: string;
  until: string;
}

function computePeriodBoundaries(
  periodLength: PeriodLength,
  numPeriods: number,
): PeriodBoundary[] {
  const now = new Date();
  const boundaries: PeriodBoundary[] = [];

  for (let i = numPeriods - 1; i >= 0; i--) {
    const start = new Date(now);
    const end = new Date(now);

    switch (periodLength) {
      case "week":
        start.setDate(start.getDate() - (i + 1) * 7);
        end.setDate(end.getDate() - i * 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - (i + 1));
        end.setMonth(end.getMonth() - i);
        break;
      case "quarter":
        start.setMonth(start.getMonth() - (i + 1) * 3);
        end.setMonth(end.getMonth() - i * 3);
        break;
    }

    boundaries.push({
      label: formatPeriodLabel(start, periodLength),
      since: start.toISOString().slice(0, 10),
      until: end.toISOString().slice(0, 10),
    });
  }

  return boundaries;
}

function formatPeriodLabel(date: Date, periodLength: PeriodLength): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  switch (periodLength) {
    case "week":
      return `${y}-${m}-${d}`;
    case "month":
      return `${y}-${m}`;
    case "quarter": {
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `${y}-Q${q}`;
    }
  }
}

async function measureMetric(
  repoPath: string,
  metric: TrendMetric,
  since: string,
  until: string,
  opts: { pathPattern?: string; timeoutMs?: number },
): Promise<number> {
  switch (metric) {
    case "hotspots": {
      const combined = await analyzeHotspotsAndChurn(repoPath, {
        since,
        pathPattern: opts.pathPattern,
        timeoutMs: opts.timeoutMs,
        hotspotsTopN: 1000,
        churnTopN: 1,
      } satisfies CombinedAnalysisOptions);
      return combined.hotspots.length;
    }
    case "churn": {
      const combined = await analyzeHotspotsAndChurn(repoPath, {
        since,
        pathPattern: opts.pathPattern,
        timeoutMs: opts.timeoutMs,
        hotspotsTopN: 1,
        churnTopN: 1000,
      } satisfies CombinedAnalysisOptions);
      return combined.churn.reduce((sum, f) => sum + f.totalChurn, 0);
    }
    case "contributors": {
      const result = await analyzeContributors(repoPath, {
        since,
        pathPattern: opts.pathPattern,
        timeoutMs: opts.timeoutMs,
      } satisfies ContributorsOptions);
      return result.stats.length;
    }
    case "commit_count": {
      const result = await analyzeContributors(repoPath, {
        since,
        pathPattern: opts.pathPattern,
        timeoutMs: opts.timeoutMs,
      } satisfies ContributorsOptions);
      return result.totalCommits;
    }
  }
}

/**
 * Classify trend direction based on metric semantics.
 * For hotspots and churn: increase = worsening (more files changing, more churn)
 * For contributors: increase = improving (more people contributing)
 * For commit_count: neutral (just activity, context-dependent)
 */
function classifyDirection(
  metric: TrendMetric,
  delta: number,
  baseValue: number,
): "improving" | "stable" | "worsening" {
  // Threshold: <10% change is stable
  const threshold = baseValue > 0 ? Math.abs(delta / baseValue) : 0;
  if (threshold < 0.1 && baseValue > 0) return "stable";
  if (delta === 0) return "stable";

  switch (metric) {
    case "hotspots":
    case "churn":
      return delta > 0 ? "worsening" : "improving";
    case "contributors":
      return delta > 0 ? "improving" : "worsening";
    case "commit_count":
      // Commit count is neutral — more activity is not inherently good or bad
      return delta > 0 ? "improving" : "stable";
  }
}
