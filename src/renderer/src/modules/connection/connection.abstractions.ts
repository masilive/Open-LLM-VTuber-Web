import { StatusTone } from "@/components/ui/status-pill";

export type ConnectionState = "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED";

export type ConnectionQuality =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "unknown"
  | "offline";

export interface LatencySample {
  latencyMs: number;
  at: number;
}

export interface LatencyStats {
  count: number;
  latestMs: number | null;
  averageMs: number | null;
  minimumMs: number | null;
  maximumMs: number | null;
}

export interface ConnectionStatusModel {
  state: ConnectionState;
  quality: ConnectionQuality;
  tone: StatusTone;
  isConnected: boolean;
  isConnecting: boolean;
  canReconnect: boolean;
  stats: LatencyStats;
  samples: LatencySample[];
}
