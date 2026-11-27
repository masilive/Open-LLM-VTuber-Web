import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

const appUrl = process.env.APP_URL || "http://localhost:3000/";
const evidenceDir =
  process.env.VISUAL_EVIDENCE_DIR ||
  path.join(os.tmpdir(), "open-llm-vtuber-visual-evidence");

const browserCandidates = [
  process.env.BROWSER_PATH,
  process.env.EDGE_PATH,
  process.env.CHROME_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/microsoft-edge",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].filter(Boolean);

const executablePath = browserCandidates.find((candidate) =>
  fs.existsSync(candidate),
);
if (!executablePath) {
  throw new Error(
    "No Edge/Chrome executable found. Set BROWSER_PATH, EDGE_PATH, or CHROME_PATH.",
  );
}

fs.mkdirSync(evidenceDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rectFor(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    visible: rect.width > 0 && rect.height > 0,
  };
}

async function waitForLatencyText(page) {
  await page.waitForFunction(
    () =>
      /\d+\s*ms/.test(
        document.querySelector('[aria-label="Connection health"]')?.innerText ||
          "",
      ),
    { timeout: 12000 },
  );
}

async function expectComposerWorkflow(page, scenario) {
  await page.waitForSelector("textarea", { timeout: 15000 });
  await page.waitForFunction(
    () =>
      (
        document.querySelector('[aria-label="Connection health"]')?.innerText ||
        ""
      ).includes("Connected"),
    { timeout: 10000 },
  );
  await waitForLatencyText(page);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const initial = await page.evaluate((rectForSource) => {
    const rectFor = eval(`(${rectForSource})`);
    const byLabel = (label) =>
      document.querySelector(`[aria-label="${label}"]`);
    const send = byLabel("Send message");
    const attach = byLabel("Attach an image");
    const textarea = document.querySelector("textarea");
    const connection = byLabel("Connection health");
    return {
      connectionText: connection?.innerText || "",
      sendPresent: Boolean(send),
      sendEnabled: send ? !send.disabled : false,
      attachPresent: Boolean(attach),
      textareaPresent: Boolean(textarea),
      textareaPlaceholder: textarea?.placeholder || "",
      sendBox: rectFor(send),
      textareaBox: rectFor(textarea),
    };
  }, rectFor.toString());

  assert(initial.sendPresent, `${scenario}: send button missing`);
  assert(initial.attachPresent, `${scenario}: attachment button missing`);
  assert(initial.textareaPresent, `${scenario}: textarea missing`);
  assert(initial.sendBox?.visible, `${scenario}: send button not visible`);
  assert(initial.textareaBox?.visible, `${scenario}: textarea not visible`);
  assert(!initial.sendEnabled, `${scenario}: send should start disabled`);

  const fileInput = await page.$('input[type="file"]');
  assert(fileInput, `${scenario}: file input missing`);
  const pixelPath = path.join(evidenceDir, "pixel.png");
  fs.writeFileSync(
    pixelPath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  await fileInput.uploadFile(pixelPath);
  await page.waitForFunction(
    () => document.body.innerText.includes("pixel.png"),
    { timeout: 5000 },
  );
  const attachmentCount = await page.evaluate(
    () => document.querySelectorAll('[aria-label="Remove attachment"]').length,
  );
  assert(attachmentCount === 1, `${scenario}: attachment preview missing`);
  await page.evaluate(() =>
    document.querySelector('[aria-label="Remove attachment"]')?.click(),
  );
  await page.waitForFunction(
    () => !document.body.innerText.includes("pixel.png"),
    { timeout: 5000 },
  );

  await page.type("textarea", "visual smoke test");
  const enabledAfterTyping = await page.evaluate(() => {
    const send = document.querySelector('[aria-label="Send message"]');
    return send ? !send.disabled : false;
  });
  assert(enabledAfterTyping, `${scenario}: send did not enable after typing`);

  await page.evaluate(() =>
    document.querySelector('[aria-label="Send message"]')?.click(),
  );
  await page.waitForFunction(
    () => document.querySelector("textarea")?.value === "",
    { timeout: 5000 },
  );

  await page.evaluate(() =>
    document.querySelector('[aria-label="Connection health"]')?.click(),
  );
  await page.waitForFunction(
    () =>
      document.body.innerText.includes("Latest ping") &&
      document.body.innerText.includes("heartbeat"),
    { timeout: 5000 },
  );

  if (scenario === "mobile") {
    await page.evaluate(() =>
      document.querySelector('[aria-label="Expand sidebar"]')?.click(),
    );
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("visual smoke test") &&
        Boolean(document.querySelector('[aria-label="New conversation"]')),
      { timeout: 5000 },
    );
    await page.evaluate(() =>
      document.querySelector('[aria-label="Collapse sidebar"]')?.click(),
    );
    await page.waitForSelector('[aria-label="Collapse composer"]', {
      timeout: 5000,
    });
  }

  await page.evaluate(() =>
    document.querySelector('[aria-label="Collapse composer"]')?.click(),
  );
  await page.waitForSelector('[aria-label="Expand composer"]', {
    timeout: 5000,
  });
  await page.evaluate(() =>
    document.querySelector('[aria-label="Expand composer"]')?.click(),
  );
  await page.waitForSelector('[aria-label="Collapse composer"]', {
    timeout: 5000,
  });

  return initial;
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

const results = [];
try {
  for (const scenario of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
  ]) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(String(error)));
    await page.setViewport({
      width: scenario.width,
      height: scenario.height,
      isMobile: Boolean(scenario.isMobile),
      hasTouch: Boolean(scenario.hasTouch),
    });
    await page.goto(appUrl, { waitUntil: "networkidle2", timeout: 30000 });
    const initial = await expectComposerWorkflow(page, scenario.name);
    const screenshot = path.join(evidenceDir, `visual-${scenario.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    results.push({
      scenario: scenario.name,
      ...initial,
      screenshot,
      screenshotBytes: fs.statSync(screenshot).size,
      consoleErrors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const failures = results.flatMap((result) =>
  result.consoleErrors.map((error) => `${result.scenario}: ${error}`),
);
fs.writeFileSync(
  path.join(evidenceDir, "visual-evidence.json"),
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify({ evidenceDir, results }, null, 2));
if (failures.length > 0) {
  throw new Error(`Browser console errors:\n${failures.join("\n")}`);
}
