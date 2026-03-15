import {
  getDirectoryAtDepth,
  type DirectoryKnowledge,
} from "./knowledge-map.js";
import type { RiskLevel } from "./risk-classifiers.js";
import { classifyCoordinationCost } from "./risk-classifiers.js";
import type { FileHotspot } from "../git/types.js";

export interface CoordinationBottleneckEntry {
  directory: string;
  changeCount: number;
  uniqueAuthors: number;
  dominantAuthorPct: number;
  coordinationScore: number;
  riskLevel: RiskLevel;
}

/**
 * Compute coordination bottleneck scores per directory.
 *
 * Combines knowledge map (contributors per directory) with hotspot data
 * (change frequency) to identify directories where many authors change
 * code frequently — indicating high coordination cost.
 *
 * coordinationScore = changeCount * uniqueAuthors * (1 - dominantAuthorPct/100)
 */
export function computeCoordinationBottlenecks(
  knowledgeMap: DirectoryKnowledge[],
  hotspots: FileHotspot[],
  depth: number,
  topN: number,
): CoordinationBottleneckEntry[] {
  // Aggregate hotspot change counts per directory at the requested depth
  const dirChanges = new Map<string, number>();
  for (const hs of hotspots) {
    const dir = getDirectoryAtDepth(hs.filePath, depth);
    dirChanges.set(dir, (dirChanges.get(dir) ?? 0) + hs.changeCount);
  }

  // Build knowledge lookup by directory
  const knowledgeLookup = new Map<string, DirectoryKnowledge>();
  for (const dk of knowledgeMap) {
    knowledgeLookup.set(dk.directory, dk);
  }

  const entries: CoordinationBottleneckEntry[] = [];

  for (const [directory, changeCount] of dirChanges) {
    const knowledge = knowledgeLookup.get(directory);
    if (!knowledge) continue;

    const uniqueAuthors = knowledge.contributors.length;
    const dominantAuthorPct =
      knowledge.contributors.length > 0
        ? knowledge.contributors[0].percentage
        : 100;

    const coordinationScore =
      changeCount * uniqueAuthors * (1 - dominantAuthorPct / 100);

    entries.push({
      directory,
      changeCount,
      uniqueAuthors,
      dominantAuthorPct,
      coordinationScore,
      riskLevel: "LOW", // placeholder, classified below
    });
  }

  // Classify risk based on relative scores
  const allScores = entries.map((e) => e.coordinationScore);
  for (const entry of entries) {
    entry.riskLevel = classifyCoordinationCost(
      entry.coordinationScore,
      allScores,
    );
  }

  // Sort by coordination score descending
  entries.sort((a, b) => b.coordinationScore - a.coordinationScore);

  return entries.slice(0, topN);
}
