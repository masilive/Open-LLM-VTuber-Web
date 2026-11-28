/**
 * Wait until the browser has an idle slice during startup.
 *
 * Heavy optional subsystems use this seam so they do not prevent first paint,
 * input handling, or WebSocket heartbeat processing during application startup.
 */
export function waitForStartupIdle(timeoutMs = 1200): Promise<void> {
  if (
    typeof window === "undefined" ||
    typeof window.requestIdleCallback !== "function"
  ) {
    return new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  return new Promise((resolve) => {
    window.requestIdleCallback(() => resolve(), { timeout: timeoutMs });
  });
}
