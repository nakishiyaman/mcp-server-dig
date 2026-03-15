/**
 * Analyze repository metrics at a specific git ref point.
 * Used by git_release_comparison to compare snapshots at two different refs.
 */

import { execGit } from "../git/executor.js";
import { analyzeHotspotsAndChurn, type CombinedAnalysisOptions } from "./combined-log-analysis.js";
import { analyzeContributors, type ContributorsOptions } from "./contributors.js";
import { analyzeKnowledgeMap, type KnowledgeMapOptions } from "./knowledge-map.js";
import type { FileHotspot } from "../git/types.js";

export interface RefMetrics {
  hotspotCount: number;
  totalChurn: number;
  activeContributors: number;
  avgBusFactor: number;
  topHotspots: FileHotspot[];
}

export interface RefAnalysisOptions {
  maxCommits?: number;
  pathPattern?: string;
  timeoutMs?: number;
}

/**
 * Measure repository metrics as of a specific ref (tag/branch/commit).
 *
 * Uses `--until=<ref-date>` to scope analysis to everything up to that ref's timestamp.
 */
export async function analyzeAtRef(
  repoPath: string,
  ref: string,
  options: RefAnalysisOptions = {},
): Promise<RefMetrics> {
  const { maxCommits = 500, pathPattern, timeoutMs } = options;

  // Resolve the ref's author date to use as the --until boundary
  const dateOutput = await execGit(
    ["log", "--format=%aI", "--max-count=1", ref],
    repoPath,
    timeoutMs,
  );
  const refDate = dateOutput.trim();

  if (!refDate) {
    return {
      hotspotCount: 0,
      totalChurn: 0,
      activeContributors: 0,
      avgBusFactor: 0,
      topHotspots: [],
    };
  }

  const hotspotsChurnOpts: CombinedAnalysisOptions = {
    until: refDate,
    maxCommits,
    hotspotsTopN: 20,
    churnTopN: 100,
    timeoutMs,
    pathPattern,
  };

  const contributorOpts: ContributorsOptions = {
    until: refDate,
    maxCommits,
    timeoutMs,
    pathPattern,
  };

  const knowledgeOpts: KnowledgeMapOptions = {
    until: refDate,
    maxCommits,
    timeoutMs,
    pathPattern,
  };

  const [combined, contributorData, knowledgeData] = await Promise.all([
    analyzeHotspotsAndChurn(repoPath, hotspotsChurnOpts),
    analyzeContributors(repoPath, contributorOpts),
    analyzeKnowledgeMap(repoPath, knowledgeOpts),
  ]);

  const totalChurn = combined.churn.reduce((sum, f) => sum + f.totalChurn, 0);

  const busFactors = knowledgeData.map((d) => d.busFactor);
  const avgBusFactor =
    busFactors.length > 0
      ? Math.round((busFactors.reduce((a, b) => a + b, 0) / busFactors.length) * 10) / 10
      : 0;

  return {
    hotspotCount: combined.hotspots.length,
    totalChurn,
    activeContributors: contributorData.stats.length,
    avgBusFactor,
    topHotspots: combined.hotspots.slice(0, 10),
  };
}
