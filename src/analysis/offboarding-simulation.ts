import {
  computeBusFactor,
  type DirectoryKnowledge,
} from "./knowledge-map.js";
import type { RiskLevel } from "./risk-classifiers.js";

export interface OffboardingOptions {
  author: string;
}

export interface DirectoryImpact {
  directory: string;
  beforeBusFactor: number;
  afterBusFactor: number;
  beforeContributors: number;
  afterContributors: number;
  ownershipPct: number;
  riskLevel: RiskLevel;
}

export interface OffboardingResult {
  targetAuthor: string;
  matchedEmails: string[];
  totalDirectories: number;
  impactedDirectories: number;
  newSinglePointOfFailure: number;
  directories: DirectoryImpact[];
  overallRisk: RiskLevel;
}

/**
 * Simulate the impact of a contributor leaving the project.
 *
 * Takes a knowledge map and removes the specified author's contributions,
 * then recomputes bus factor for each directory to show before/after impact.
 */
export function simulateOffboarding(
  knowledgeMap: DirectoryKnowledge[],
  options: OffboardingOptions,
): OffboardingResult {
  const target = options.author.toLowerCase();

  // Find all matching emails across all directories
  const matchedEmails = new Set<string>();
  for (const dir of knowledgeMap) {
    for (const c of dir.contributors) {
      if (c.email.toLowerCase().includes(target)) {
        matchedEmails.add(c.email);
      }
    }
  }

  const directories: DirectoryImpact[] = [];

  for (const dir of knowledgeMap) {
    // Find this author's contribution in this directory
    const authorContrib = dir.contributors.find((c) =>
      matchedEmails.has(c.email),
    );
    if (!authorContrib) continue;

    const beforeBusFactor = dir.busFactor;
    const beforeContributors = dir.contributors.length;

    // Remove author and recompute
    const remaining = dir.contributors.filter(
      (c) => !matchedEmails.has(c.email),
    );
    const afterContributors = remaining.length;

    const afterTotal = remaining.reduce((sum, c) => sum + c.commits, 0);
    const afterSorted = remaining
      .sort((a, b) => b.commits - a.commits)
      .map((c) => c.commits);
    const afterBusFactor = computeBusFactor(afterSorted, afterTotal);

    const ownershipPct = authorContrib.percentage;

    const riskLevel = classifyDirectoryImpact(
      afterBusFactor,
      ownershipPct,
    );

    directories.push({
      directory: dir.directory,
      beforeBusFactor,
      afterBusFactor,
      beforeContributors,
      afterContributors,
      ownershipPct,
      riskLevel,
    });
  }

  // Sort by risk: HIGH first, then by ownership descending
  const riskOrder: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  directories.sort((a, b) => {
    const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    if (riskDiff !== 0) return riskDiff;
    return b.ownershipPct - a.ownershipPct;
  });

  const newSinglePointOfFailure = directories.filter(
    (d) => d.afterBusFactor === 1 && d.beforeBusFactor > 1,
  ).length;

  const overallRisk = classifyOverallOffboardingRisk(
    newSinglePointOfFailure,
    directories,
  );

  return {
    targetAuthor: options.author,
    matchedEmails: [...matchedEmails],
    totalDirectories: knowledgeMap.length,
    impactedDirectories: directories.length,
    newSinglePointOfFailure,
    directories,
    overallRisk,
  };
}

function classifyDirectoryImpact(
  afterBusFactor: number,
  ownershipPct: number,
): RiskLevel {
  if (afterBusFactor <= 1 && ownershipPct >= 30) return "HIGH";
  if (afterBusFactor <= 2 || ownershipPct >= 20) return "MEDIUM";
  return "LOW";
}

function classifyOverallOffboardingRisk(
  newSpof: number,
  directories: DirectoryImpact[],
): RiskLevel {
  const highCount = directories.filter((d) => d.riskLevel === "HIGH").length;

  if (newSpof >= 3 || highCount >= 3) return "HIGH";
  if (newSpof >= 1 || highCount >= 1) return "MEDIUM";
  return "LOW";
}
