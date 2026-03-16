/**
 * Velocity anomaly detection — pure statistical functions.
 *
 * Given time-bucketed commit counts, detects periods where the count
 * deviates significantly from the mean (spikes / drops).
 */

export interface VelocityBucket {
  period: string;
  count: number;
}

export interface VelocityAnomaly {
  period: string;
  count: number;
  mean: number;
  stddev: number;
  direction: "spike" | "drop";
  /** Deviation magnitude in units of standard deviation (σ). */
  magnitude: number;
}

export interface VelocityAnomalyResult {
  mean: number;
  stddev: number;
  thresholdSigma: number;
  totalBuckets: number;
  anomalies: VelocityAnomaly[];
}

/**
 * Detect anomalous periods in a time series of commit counts.
 *
 * A period is anomalous when `|count - mean| > thresholdSigma * stddev`.
 * When stddev is 0 (all values identical), no anomalies are returned.
 */
export function detectVelocityAnomalies(
  buckets: VelocityBucket[],
  thresholdSigma = 2,
): VelocityAnomalyResult {
  if (buckets.length === 0) {
    return { mean: 0, stddev: 0, thresholdSigma, totalBuckets: 0, anomalies: [] };
  }

  const counts = buckets.map((b) => b.count);
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;

  const variance = counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) {
    return { mean, stddev: 0, thresholdSigma, totalBuckets: buckets.length, anomalies: [] };
  }

  const anomalies: VelocityAnomaly[] = [];

  for (const bucket of buckets) {
    const deviation = Math.abs(bucket.count - mean);
    if (deviation > thresholdSigma * stddev) {
      anomalies.push({
        period: bucket.period,
        count: bucket.count,
        mean: Math.round(mean * 100) / 100,
        stddev: Math.round(stddev * 100) / 100,
        direction: bucket.count > mean ? "spike" : "drop",
        magnitude: Math.round((deviation / stddev) * 100) / 100,
      });
    }
  }

  return {
    mean: Math.round(mean * 100) / 100,
    stddev: Math.round(stddev * 100) / 100,
    thresholdSigma,
    totalBuckets: buckets.length,
    anomalies,
  };
}
