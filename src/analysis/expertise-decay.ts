/**
 * Expertise decay analysis — tracks activity freshness of code owners.
 *
 * Unlike knowledge-loss-risk (which focuses on bus factor = 1),
 * this module detects when dominant owners become inactive.
 */

import { execGit } from "../git/executor.js";
import {
  analyzeKnowledgeMap,
  type KnowledgeMapOptions,
  type DirectoryKnowledge,
} from "./knowledge-map.js";
import { classifyExpertiseDecay } from "./risk-classifiers.js";
import type { RiskLevel } from "./risk-classifiers.js";

export type OwnerStatus = "active" | "fading" | "inactive";

export interface ExpertiseDecayOwner {
  email: string;
  commits: number;
  percentage: number;
  lastActivityDate: string | null;
  daysSinceLastActivity: number | null;
  status: OwnerStatus;
}

export interface ExpertiseDecayEntry {
  directory: string;
  busFactor: number;
  owners: ExpertiseDecayOwner[];
  riskLevel: RiskLevel;
}

export interface ExpertiseDecayResult {
  entries: ExpertiseDecayEntry[];
  summary: {
    totalDirectories: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

export interface ExpertiseDecayOptions {
  depth?: number;
  since?: string;
  maxCommits?: number;
  inactivityThresholdDays?: number;
  fadingThresholdDays?: number;
  pathPattern?: string;
  timeoutMs?: number;
}

/**
 * Analyze expertise decay across repository directories.
 *
 * For each directory's dominant contributors, checks how recently
 * they have been active and classifies the decay risk.
 */
export async function analyzeExpertiseDecay(
  repoPath: string,
  options: ExpertiseDecayOptions = {},
): Promise<ExpertiseDecayResult> {
  const {
    depth = 1,
    since,
    maxCommits = 500,
    inactivityThresholdDays = 90,
    fadingThresholdDays = 30,
    pathPattern,
    timeoutMs,
  } = options;

  const kmOptions: KnowledgeMapOptions = {
    depth,
    since,
    maxCommits,
    pathPattern,
    timeoutMs,
  };

  const knowledgeMap = await analyzeKnowledgeMap(repoPath, kmOptions);

  if (knowledgeMap.length === 0) {
    return {
      entries: [],
      summary: { totalDirectories: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
    };
  }

  const entries: ExpertiseDecayEntry[] = [];

  for (const dir of knowledgeMap) {
    const owners = await resolveOwnerStatuses(
      repoPath,
      dir,
      inactivityThresholdDays,
      fadingThresholdDays,
      timeoutMs,
    );

    const activeCount = owners.filter((o) => o.status === "active").length;
    const riskLevel = classifyExpertiseDecay(dir.busFactor, activeCount, owners.length);

    entries.push({
      directory: dir.directory,
      busFactor: dir.busFactor,
      owners,
      riskLevel,
    });
  }

  // Sort by risk level (HIGH first), then by busFactor ascending
  const riskOrder: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  entries.sort((a, b) => {
    const diff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    if (diff !== 0) return diff;
    return a.busFactor - b.busFactor;
  });

  return {
    entries,
    summary: {
      totalDirectories: entries.length,
      highRisk: entries.filter((e) => e.riskLevel === "HIGH").length,
      mediumRisk: entries.filter((e) => e.riskLevel === "MEDIUM").length,
      lowRisk: entries.filter((e) => e.riskLevel === "LOW").length,
    },
  };
}

async function resolveOwnerStatuses(
  repoPath: string,
  dir: DirectoryKnowledge,
  inactivityThresholdDays: number,
  fadingThresholdDays: number,
  timeoutMs?: number,
): Promise<ExpertiseDecayOwner[]> {
  const owners: ExpertiseDecayOwner[] = [];

  for (const contrib of dir.contributors) {
    const lastDate = await getLastActivityDate(
      repoPath,
      contrib.email,
      timeoutMs,
    );

    let daysSince: number | null = null;
    let status: OwnerStatus = "active";

    if (lastDate) {
      daysSince = Math.floor(
        (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      status = classifyOwnerStatus(daysSince, fadingThresholdDays, inactivityThresholdDays);
    }

    owners.push({
      email: contrib.email,
      commits: contrib.commits,
      percentage: contrib.percentage,
      lastActivityDate: lastDate,
      daysSinceLastActivity: daysSince,
      status,
    });
  }

  return owners;
}

function classifyOwnerStatus(
  daysSince: number,
  fadingThreshold: number,
  inactivityThreshold: number,
): OwnerStatus {
  if (daysSince <= fadingThreshold) return "active";
  if (daysSince <= inactivityThreshold) return "fading";
  return "inactive";
}

async function getLastActivityDate(
  repoPath: string,
  email: string,
  timeoutMs?: number,
): Promise<string | null> {
  const args = [
    "log",
    "--format=%aI",
    "--max-count=1",
    `--author=${email}`,
  ];

  const output = await execGit(args, repoPath, timeoutMs);
  const date = output.trim();
  return date || null;
}
