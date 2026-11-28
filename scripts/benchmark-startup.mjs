import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

const appUrl = process.env.APP_URL || "http://localhost:3000/";
const iterations = Number(process.env.BENCHMARK_ITERATIONS || 3);
const evidenceDir =
  process.env.BENCHMARK_EVIDENCE_DIR ||
  path.join(os.tmpdir(), "open-llm-vtuber-startup-benchmark");
const browserCandidates = [
  process.env.BROWSER_PATH,
  process.env.EDGE_PATH,
  process.env.CHROME_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/microsoft-edge",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const executablePath = browserCandidates.find((candidate) =>
  fs.existsSync(candidate),
);
if (!executablePath)
  throw new Error(
    "No browser executable found; set BROWSER_PATH, EDGE_PATH, or CHROME_PATH.",
  );
fs.mkdirSync(evidenceDir, { recursive: true });

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const runs = [];
try {
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      window.__startupLongTasks = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__startupLongTasks.push({
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      }).observe({ type: "longtask", buffered: true });
    });
    await page.setViewport({ width: 1280, height: 800 });
    const startedAt = Date.now();
    await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("textarea", { timeout: 15000 });
    const composerVisibleMs = Date.now() - startedAt;
    await page.waitForFunction(
      () =>
        /\d+\s*ms/.test(
          document.querySelector('[aria-label="Connection health"]')
            ?.innerText || "",
        ),
      { timeout: 15000 },
    );
    const heartbeatVisibleMs = Date.now() - startedAt;
    const measurement = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const paints = Object.fromEntries(
        performance
          .getEntriesByType("paint")
          .map((entry) => [entry.name, entry.startTime]),
      );
      const resources = performance.getEntriesByType("resource");
      const scripts = resources.filter(
        (entry) =>
          entry.initiatorType === "script" || entry.name.endsWith(".js"),
      );
      return {
        domContentLoadedMs: navigation?.domContentLoadedEventEnd || 0,
        loadEventMs: navigation?.loadEventEnd || 0,
        firstPaintMs: paints["first-paint"] || 0,
        firstContentfulPaintMs: paints["first-contentful-paint"] || 0,
        resourceCount: resources.length,
        scriptCount: scripts.length,
        scriptTransferBytes: scripts.reduce(
          (sum, entry) => sum + (entry.transferSize || 0),
          0,
        ),
        scriptDecodedBytes: scripts.reduce(
          (sum, entry) => sum + (entry.decodedBodySize || 0),
          0,
        ),
        totalTransferBytes: resources.reduce(
          (sum, entry) => sum + (entry.transferSize || 0),
          0,
        ),
        longTaskCount: window.__startupLongTasks.length,
        longTaskTotalMs: window.__startupLongTasks.reduce(
          (sum, entry) => sum + entry.duration,
          0,
        ),
        longestTaskMs: window.__startupLongTasks.reduce(
          (max, entry) => Math.max(max, entry.duration),
          0,
        ),
        connectionText:
          document.querySelector('[aria-label="Connection health"]')
            ?.innerText || "",
      };
    });
    runs.push({
      iteration: iteration + 1,
      composerVisibleMs,
      heartbeatVisibleMs,
      ...measurement,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const summary = Object.fromEntries(
  [
    "composerVisibleMs",
    "heartbeatVisibleMs",
    "domContentLoadedMs",
    "firstContentfulPaintMs",
    "scriptTransferBytes",
    "scriptDecodedBytes",
    "totalTransferBytes",
    "longTaskCount",
    "longTaskTotalMs",
    "longestTaskMs",
  ].map((key) => [
    key,
    Math.round(median(runs.map((run) => run[key] || 0)) * 100) / 100,
  ]),
);
const output = { appUrl, iterations, summary, runs };
fs.writeFileSync(
  path.join(evidenceDir, "startup-benchmark.json"),
  JSON.stringify(output, null, 2),
);
console.log(JSON.stringify(output, null, 2));
