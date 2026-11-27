import { describe, expect, it } from "vitest";
import {
  appendLatencySample,
  buildConnectionStatusModel,
  calculateLatencyStats,
  classifyLatency,
  MAX_LATENCY_SAMPLES,
} from "../connection.business";
import { LatencySample } from "../connection.abstractions";

const sample = (latencyMs: number, at = 1): LatencySample => ({
  latencyMs,
  at,
});

describe("classifyLatency", () => {
  it.each([
    [null, "unknown"],
    [0, "excellent"],
    [79, "excellent"],
    [80, "good"],
    [179, "good"],
    [180, "fair"],
    [349, "fair"],
    [350, "poor"],
  ])("classifies %s ms as %s", (latency, expected) => {
    expect(classifyLatency(latency)).toBe(expected);
  });
});

describe("appendLatencySample", () => {
  it("appends samples immutably and retains the newest bounded set", () => {
    const original = [sample(10, 1), sample(20, 2)];
    const result = appendLatencySample(original, sample(30, 3), 2);

    expect(original).toHaveLength(2);
    expect(result).toEqual([sample(20, 2), sample(30, 3)]);
  });

  it("rejects non-finite and negative latencies without copying state", () => {
    const original = [sample(10)];
    expect(appendLatencySample(original, sample(Number.NaN))).toBe(original);
    expect(appendLatencySample(original, sample(Infinity))).toBe(original);
    expect(appendLatencySample(original, sample(-1))).toBe(original);
  });

  it("clamps maximum sample count to at least one", () => {
    expect(appendLatencySample([], sample(5), 0)).toEqual([sample(5)]);
    expect(appendLatencySample([], sample(5), 1.8)).toEqual([sample(5)]);
  });

  it("uses the default bounded memory window", () => {
    let samples: LatencySample[] = [];
    for (let index = 0; index < MAX_LATENCY_SAMPLES + 2; index += 1) {
      samples = appendLatencySample(samples, sample(index, index));
    }
    expect(samples).toHaveLength(MAX_LATENCY_SAMPLES);
    expect(samples[0].latencyMs).toBe(2);
  });
});

describe("calculateLatencyStats", () => {
  it("returns nullable statistics for an empty series", () => {
    expect(calculateLatencyStats([])).toEqual({
      count: 0,
      latestMs: null,
      averageMs: null,
      minimumMs: null,
      maximumMs: null,
    });
  });

  it("calculates count, latest, rounded average, minimum, and maximum", () => {
    expect(calculateLatencyStats([sample(10), sample(21), sample(30)])).toEqual(
      {
        count: 3,
        latestMs: 30,
        averageMs: 20,
        minimumMs: 10,
        maximumMs: 30,
      },
    );
  });
});

describe("buildConnectionStatusModel", () => {
  it("marks open connections with excellent or good latency as successful", () => {
    for (const latency of [20, 100]) {
      const model = buildConnectionStatusModel("OPEN", [sample(latency)]);
      expect(model).toMatchObject({
        state: "OPEN",
        isConnected: true,
        isConnecting: false,
        canReconnect: false,
        tone: "success",
      });
    }
  });

  it("marks fair and unknown open latency as a warning", () => {
    expect(buildConnectionStatusModel("OPEN", [sample(200)]).tone).toBe(
      "warning",
    );
    expect(buildConnectionStatusModel("OPEN", []).tone).toBe("warning");
    expect(buildConnectionStatusModel("OPEN", []).quality).toBe("unknown");
  });

  it("marks poor open latency as danger", () => {
    const model = buildConnectionStatusModel("OPEN", [sample(500)]);
    expect(model.quality).toBe("poor");
    expect(model.tone).toBe("danger");
  });

  it("marks transitional and disconnected states explicitly", () => {
    const connecting = buildConnectionStatusModel("CONNECTING", []);
    expect(connecting).toMatchObject({
      quality: "offline",
      tone: "warning",
      canReconnect: false,
    });

    for (const state of ["CLOSING", "CLOSED"] as const) {
      const model = buildConnectionStatusModel(state, [sample(20)]);
      expect(model).toMatchObject({
        quality: "offline",
        tone: "danger",
        canReconnect: true,
      });
    }
  });
});
