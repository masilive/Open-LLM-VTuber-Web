import {
  ConnectionQuality,
  ConnectionState,
  ConnectionStatusModel,
  LatencySample,
  LatencyStats,
} from "./connection.abstractions";

export const MAX_LATENCY_SAMPLES = 24;

/**
 * Classify a round-trip latency measurement into user-meaningful quality bands.
 */
export function classifyLatency(
  latencyMs: number | null,
): Exclude<ConnectionQuality, "offline"> {
  if (latencyMs === null) return "unknown";
  if (latencyMs < 80) return "excellent";
  if (latencyMs < 180) return "good";
  if (latencyMs < 350) return "fair";
  return "poor";
}

/**
 * Append one sample using immutable updates and bounded memory.
 */
export function appendLatencySample(
  samples: LatencySample[],
  sample: LatencySample,
  maxSamples = MAX_LATENCY_SAMPLES,
): LatencySample[] {
  if (!Number.isFinite(sample.latencyMs) || sample.latencyMs < 0)
    return samples;
  const boundedMax = Math.max(1, Math.floor(maxSamples));
  return [...samples, sample].slice(-boundedMax);
}

/**
 * Calculate latency statistics without mutating the source samples.
 */
export function calculateLatencyStats(samples: LatencySample[]): LatencyStats {
  if (samples.length === 0) {
    return {
      count: 0,
      latestMs: null,
      averageMs: null,
      minimumMs: null,
      maximumMs: null,
    };
  }

  const values = samples.map((sample) => sample.latencyMs);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    count: values.length,
    latestMs: values[values.length - 1],
    averageMs: Math.round(total / values.length),
    minimumMs: Math.min(...values),
    maximumMs: Math.max(...values),
  };
}

/**
 * Build the complete presentation model for connection state at one seam.
 */
export function buildConnectionStatusModel(
  state: ConnectionState,
  samples: LatencySample[],
): ConnectionStatusModel {
  const stats = calculateLatencyStats(samples);
  const isConnected = state === "OPEN";
  const isConnecting = state === "CONNECTING";
  const latencyQuality = classifyLatency(stats.latestMs);
  const quality: ConnectionQuality = isConnected ? latencyQuality : "offline";

  let tone: ConnectionStatusModel["tone"] = "neutral";
  if (isConnected) {
    if (quality === "excellent" || quality === "good") tone = "success";
    else if (quality === "fair" || quality === "unknown") tone = "warning";
    else tone = "danger";
  } else if (isConnecting) {
    tone = "warning";
  } else {
    tone = "danger";
  }

  return {
    state,
    quality,
    tone,
    isConnected,
    isConnecting,
    canReconnect: !isConnected && !isConnecting,
    stats,
    samples,
  };
}
