// End-to-end check of the main flow against a running dev server, a local Hardhat chain with the registry deployed,
// and tests/e2e/pinata-stub.mjs. See README "End-to-end test".
//   node tests/e2e/flow.mjs [baseUrl] [screenshotDir]
import { createRequire } from "node:module";
// Uses the globally installed Playwright when the project does not install its own.
const { chromium } = createRequire(import.meta.url)("playwright");
import { randomBytes } from "node:crypto";
import fs from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const shots = process.argv[3];
if (shots) fs.mkdirSync(shots, { recursive: true });

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVR42mNkYPj/n4EIwMgwqpBhVCHDqEKGUYUMowqhChlGFTKMKmQAAH0XH/F3sA5aAAAAAElFTkSuQmCC",
  "base64",
);
const audio = { name: "silent-night-vibes.mp3", mimeType: "audio/mpeg", buffer: randomBytes(300_000) };
const lyrics = { name: "lyrics.txt", mimeType: "text/plain", buffer: Buffer.from(`Silent night vibes ${Date.now()}\n`) };
const cover = { name: "cover.png", mimeType: "image/png", buffer: PNG };

const step = (s) => console.log(`• ${s}`);
const errors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push(e.message));
page.setDefaultNavigationTimeout(180_000);
// The mock wallet does not survive a full reload the way a browser wallet does, so reconnect after each navigation.
const go = async (path) => {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const btn = page.getByTestId("connect-test-wallet").first();
  const account = page.getByTestId("account-button");
  await btn.or(account).first().waitFor({ timeout: 120_000 });
  if (await btn.isVisible()) {
    await btn.click();
    await account.waitFor();
  }
};
const shot = async (name) => shots && page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });

try {
  await go(base);
  await page.getByRole("heading", { name: /Unbreakable/ }).waitFor();
  await shot("01-landing");
  step("landing renders");

  await page.getByTestId("account-button").waitFor();
  step("test wallet connected");

  await go(`${base}/protect?type=music&subtype=single`);
  await page.locator("#f-title").fill("Silent Night Vibes");
  await page.locator("#f-artist").fill("Meta Content Creator Architect");
  await page.locator("#f-genre").fill("Vibe 19");
  await page.locator("#slot-audio").setInputFiles(audio);
  await page.locator("#slot-lyrics").setInputFiles(lyrics);
  await page.locator("#slot-cover").setInputFiles(cover);
  await page.getByText(/SHA-256 0x/).nth(2).waitFor({ timeout: 30_000 });
  await shot("02-details");
  step("files fingerprinted on device");

  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("heading", { name: "Review your IP protection" }).waitFor({ timeout: 60_000 });
  await page.getByText(/Estimated total/).waitFor();
  await shot("03-review");
  step("uploaded to IPFS stub, metadata pinned, review shown");

  for (const cb of await page.getByRole("checkbox").all()) await cb.check();
  await page.getByRole("button", { name: /Register on blockchain/ }).click();
  await page.getByTestId("token-id").waitFor({ timeout: 60_000 });
  const tokenText = await page.getByTestId("token-id").innerText();
  await shot("04-success");
  step(`registered on-chain as ${tokenText}`);
  const tokenId = tokenText.replace("#", "");

  await go(`${base}/library`);
  await page.getByText("Silent Night Vibes").first().waitFor({ timeout: 30_000 });
  await shot("05-library");
  step("library lists the work");

  await go(`${base}/library/31337/${tokenId}`);
  await page.getByText(/Registered on Hardhat|Registered on Local/).first().waitFor({ timeout: 30_000 });
  await page.getByText("✓ on-chain").first().waitFor();
  await shot("06-detail");
  step("detail page shows pillars, files and timeline");

  await go(`${base}/verify/31337/${tokenId}`);
  await page.getByTestId("verification-badge").getByText("All 4 Pillars verified").waitFor({ timeout: 30_000 });
  await shot("07-public-verify");
  step("public verification passes all 4 pillars");

  await go(`${base}/verify`);
  await page.locator("#verify-file").setInputFiles(audio);
  await page.getByText(`Token #${tokenId} on`).waitFor({ timeout: 30_000 });
  step("file lookup finds the registration");

  await page.locator("#verify-file").setInputFiles({ ...audio, buffer: Buffer.concat([audio.buffer, Buffer.from([1])]) });
  await page.getByText("Not registered").waitFor({ timeout: 30_000 });
  step("an altered file is reported as not registered");

  await go(`${base}/protect?type=music&subtype=single`);
  await page.locator("#f-title").fill("Copy attempt");
  await page.locator("#f-artist").fill("Someone");
  await page.locator("#slot-audio").setInputFiles(audio);
  await page.getByText(/SHA-256 0x/).first().waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByText(/is already registered on/).waitFor({ timeout: 30_000 });
  step("re-registering the same file is blocked");

  for (const path of ["/dashboard", "/analytics", "/settings", "/docs"]) {
    await go(`${base}${path}`);
    await page.locator("h1").first().waitFor();
    await shot(`08-${path.slice(1)}`);
  }
  step("dashboard, analytics, settings and docs render");

  await page.setViewportSize({ width: 390, height: 844 });
  await go(`${base}/dashboard`);
  await page.locator("h1").first().waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await shot("09-mobile-dashboard");
  if (overflow > 1) throw new Error(`Horizontal overflow on mobile: ${overflow}px`);
  step("mobile layout has no horizontal scroll");

  if (errors.length) throw new Error(`Page errors:\n${errors.join("\n")}`);
  console.log("\nE2E PASSED");
} catch (e) {
  await shot("failure");
  console.error("\nE2E FAILED:", e.message);
  if (errors.length) console.error("Page errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
