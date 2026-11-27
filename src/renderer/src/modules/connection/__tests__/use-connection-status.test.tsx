import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConnectionStatus } from "../use-connection-status";

const mocks = vi.hoisted(() => ({
  wsState: "OPEN" as "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED",
  reconnect: vi.fn(),
  unsubscribe: vi.fn(),
  latencyCallbacks: [] as Array<(latencyMs: number) => void>,
}));

vi.mock("@/context/websocket-context", () => ({
  useWebSocket: () => ({ wsState: mocks.wsState, reconnect: mocks.reconnect }),
}));

vi.mock("@/services/websocket-service", () => ({
  wsService: {
    onLatency: (callback: (latencyMs: number) => void) => {
      mocks.latencyCallbacks.push(callback);
      return { unsubscribe: mocks.unsubscribe };
    },
  },
}));

describe("useConnectionStatus", () => {
  beforeEach(() => {
    mocks.wsState = "OPEN";
    mocks.latencyCallbacks.length = 0;
    vi.clearAllMocks();
  });

  it("subscribes to transport latency and builds a presentation model", () => {
    const { result } = renderHook(() => useConnectionStatus());

    expect(mocks.latencyCallbacks).toHaveLength(1);
    expect(result.current.model.quality).toBe("unknown");

    act(() => {
      mocks.latencyCallbacks[0](42);
      mocks.latencyCallbacks[0](140);
    });

    expect(result.current.model.samples).toHaveLength(2);
    expect(result.current.model.stats.latestMs).toBe(140);
    expect(result.current.model.stats.averageMs).toBe(91);
    expect(result.current.model.quality).toBe("good");
    expect(result.current.reconnect).toBe(mocks.reconnect);
  });

  it("clears stale latency samples whenever the socket is no longer open", () => {
    mocks.wsState = "OPEN";
    const { result, rerender } = renderHook(() => useConnectionStatus());

    act(() => {
      mocks.latencyCallbacks[0](50);
    });
    expect(result.current.model.samples).toHaveLength(1);

    mocks.wsState = "CLOSED";
    rerender();

    expect(result.current.model.samples).toEqual([]);
    expect(result.current.model.quality).toBe("offline");
    expect(result.current.model.canReconnect).toBe(true);
  });

  it("unsubscribes from latency events on unmount", () => {
    const { unmount } = renderHook(() => useConnectionStatus());
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
