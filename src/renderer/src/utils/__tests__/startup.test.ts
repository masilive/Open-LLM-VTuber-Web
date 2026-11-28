import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForStartupIdle } from "../startup";

describe("waitForStartupIdle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uses requestIdleCallback with a bounded timeout when available", async () => {
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 0,
      } as IdleDeadline);
      return 1;
    });
    vi.stubGlobal("requestIdleCallback", requestIdleCallback);

    await expect(waitForStartupIdle(777)).resolves.toBeUndefined();
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 777,
    });
  });

  it("falls back to a zero-delay timer when idle callbacks are unavailable", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    let resolved = false;

    const promise = waitForStartupIdle().then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(0);
    await promise;
    expect(resolved).toBe(true);
  });

  it("falls back cleanly outside a browser window context", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", undefined);
    const promise = waitForStartupIdle();
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toBeUndefined();
  });
});
