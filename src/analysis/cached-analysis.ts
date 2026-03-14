/**
 * Cache-aware wrappers for expensive analysis functions.
 * Used by composite tools (repo_health, file_risk_profile, review_prep)
 * to avoid redundant git subprocess calls within a session.
 */

import { AnalysisCache, buildCacheKey } from "./cache.js";
import {
  analyzeHotspotsAndChurn,
  type CombinedAnalysisOptions,
} from "./combined-log-analysis.js";
import {
  analyzeContributors,
  type ContributorsOptions,
} from "./contributors.js";
import {
  analyzeKnowledgeLossRisk,
  type KnowledgeLossRiskOptions,
  type KnowledgeLossRiskResult,
} from "./knowledge-loss-risk.js";
import {
  analyzeTrend,
  type TrendAnalysisOptions,
  type TrendResult,
} from "./trend-analysis.js";
import type { CombinedNumstatResult } from "../git/parsers.js";
import type { ContributorStats } from "../git/types.js";

export function cachedAnalyzeHotspotsAndChurn(
  cache: AnalysisCache,
  repoPath: string,
  options: CombinedAnalysisOptions = {},
): Promise<CombinedNumstatResult> {
  const key = buildCacheKey("analyzeHotspotsAndChurn", repoPath, options as Record<string, unknown>);
  const cached = cache.get<CombinedNumstatResult>(key);
  if (cached) return Promise.resolve(cached);

  return analyzeHotspotsAndChurn(repoPath, options).then((result) => {
    cache.set(key, result);
    return result;
  });
}

export function cachedAnalyzeContributors(
  cache: AnalysisCache,
  repoPath: string,
  options: ContributorsOptions = {},
): Promise<{ stats: ContributorStats[]; totalCommits: number }> {
  const key = buildCacheKey("analyzeContributors", repoPath, options as Record<string, unknown>);
  const cached = cache.get<{ stats: ContributorStats[]; totalCommits: number }>(key);
  if (cached) return Promise.resolve(cached);

  return analyzeContributors(repoPath, options).then((result) => {
    cache.set(key, result);
    return result;
  });
}

export function cachedAnalyzeKnowledgeLossRisk(
  cache: AnalysisCache,
  repoPath: string,
  options: KnowledgeLossRiskOptions = {},
): Promise<KnowledgeLossRiskResult[]> {
  const key = buildCacheKey("analyzeKnowledgeLossRisk", repoPath, options as Record<string, unknown>);
  const cached = cache.get<KnowledgeLossRiskResult[]>(key);
  if (cached) return Promise.resolve(cached);

  return analyzeKnowledgeLossRisk(repoPath, options).then((result) => {
    cache.set(key, result);
    return result;
  });
}

export function cachedAnalyzeTrend(
  cache: AnalysisCache,
  repoPath: string,
  options: TrendAnalysisOptions,
): Promise<TrendResult> {
  const key = buildCacheKey("analyzeTrend", repoPath, options as unknown as Record<string, unknown>);
  const cached = cache.get<TrendResult>(key);
  if (cached) return Promise.resolve(cached);

  return analyzeTrend(repoPath, options).then((result) => {
    cache.set(key, result);
    return result;
  });
}
