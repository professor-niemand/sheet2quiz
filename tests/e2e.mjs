// Browser smoke test: drives the real app in Chromium through the whole user journey.
// Run with: npm run test:e2e   (needs Playwright with a browser, and python3 for a static server)
//
// Covers: import (CSV and XLSX), home actions and hints, category filter, choosing which
// columns show after an answer (and remembering that choice), the quiz, results, history,
// the theme button, and loading again while offline.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const { chromium } = createRequire(import.meta.url)("playwright"); // global install, or: npm i -D playwright

const PORT = 8123;
// Serve ./web the way a static host would.
const server = spawn("python3", ["-m", "http.server", String(PORT), "-d", "web"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } }); // phone-sized
const page = await ctx.newPage();

// Collect anything the page reports as an error; the test fails at the end if there is any.
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const btn = (name) => page.getByRole("button", { name });
const body = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const chip = (text) => page.locator(".show-cols .chip", { hasText: text }).locator("input");

try {
  await page.goto(`http://localhost:${PORT}/`);

  // ----- Home: actions, hints, no Export -----
  assert.equal(await page.locator(".action").count(), 3, "three actions: import, back up, restore");
  assert.equal(await page.locator(".action .hint").count(), 3, "every action explains itself");
  assert.equal(await btn(/export/i).count(), 0, "Export button is gone");
  assert.ok(await page.locator(".status").count(), "storage status line shown");

  // ----- Import a CSV and an XLSX -----
  for (const file of ["samples/world-capitals.csv", "samples/world-capitals.xlsx"]) {
    await page.setInputFiles("input[type=file][accept*=csv]", file);
    await page.waitForTimeout(500);
  }
  assert.equal(await page.locator("ul.cards > li").count(), 2, "both imports listed");

  // ----- Setup: filter to Europe, 3 questions, hide two columns after answers -----
  await page.locator("ul.cards > li").first().getByRole("button", { name: "Study" }).click();
  await page.selectOption("#filterCol", "2"); // Continent
  await page.locator(".values:not(.show-cols) input").evaluateAll((els) => els.forEach((e) => (e.checked = e.value === "Europe")));
  await page.fill("#count", "3");
  await page.locator("details.show-panel summary").click();
  await chip("Fun fact").uncheck();
  await chip("Language").uncheck();
  assert.match(await page.locator("details.show-panel summary").innerText(), /3 of 5/);
  assert.ok(await chip("Country").isDisabled(), "question column locked on");
  assert.ok(await chip("Capital").isDisabled(), "answer column locked on");
  await btn("Start quiz").click();

  // ----- Quiz: three questions, one deliberately wrong -----
  let wrongOnce = false;
  for (let n = 0; n < 3; n++) {
    await page.waitForSelector(".option");
    const q = await page.locator(".question").innerText();
    assert.ok(["France", "Spain", "Italy"].includes(q), "filter respected: " + q);
    assert.equal(await page.locator(".qlabel").innerText(), "Country", "question column named above the question");
    assert.ok((await page.locator(".option").count()) >= 3);
    const rightAnswer = { France: "Paris", Spain: "Madrid", Italy: "Rome" }[q];
    const pick = !wrongOnce && n === 1 ? page.locator(".option").first() : page.locator(".option", { hasText: rightAnswer }).first();
    if (!wrongOnce && n === 1) wrongOnce = true;
    await pick.click();
    await page.waitForSelector(".flashcard");
    assert.ok((await page.locator(".option .tag").count()) >= 1, "right/wrong tagged with text");
    assert.equal(await page.locator(".flashcard tr").count(), 3, "only the chosen columns shown");
    assert.equal(await page.locator(".flashcard th", { hasText: "Fun fact" }).count(), 0, "hidden column not shown");
    assert.equal(await page.locator(".flashcard .is-answer").count(), 1, "answer row emphasised");
    await page.locator("#nextBtn").click();
  }

  // ----- Results and history -----
  await page.waitForSelector(".score");
  console.log("score:", (await page.locator(".score").innerText()).replace(/\s+/g, " "));
  await btn("History").click();
  await page.waitForSelector("ul.cards li");
  assert.equal(await page.locator("ul.cards li").count(), 1, "one quiz in history");

  // ----- The column choice is remembered, and can be changed again before the next quiz -----
  await btn("Libraries").click();
  await page.locator("ul.cards > li").first().getByRole("button", { name: "Study" }).click();
  await page.locator("details.show-panel summary").click();
  assert.equal(await chip("Fun fact").isChecked(), false, "choice remembered");
  await chip("Fun fact").check();
  assert.match(await page.locator("details.show-panel summary").innerText(), /4 of 5/, "can be changed again");
  await btn("Libraries").click();

  // ----- Theme button cycles Auto, Light, Dim, Dark and remembers the choice -----
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme ?? "auto");
  assert.equal(await theme(), "auto");
  await page.locator("#themeBtn").click(); assert.equal(await theme(), "light");
  const light = await body();
  await page.locator("#themeBtn").click(); assert.equal(await theme(), "dim");
  const dim = await body();
  await page.locator("#themeBtn").click(); assert.equal(await theme(), "dark");
  const dark = await body();
  assert.equal(new Set([light, dim, dark]).size, 3, "three distinct backgrounds");
  await page.locator("#themeBtn").click(); // back to auto
  await page.locator("#themeBtn").click(); // light
  await page.locator("#themeBtn").click(); // dim
  await page.reload();
  assert.equal(await theme(), "dim", "theme persists");
  assert.match(await page.locator("#themeBtn").innerText(), /Dim/);

  // ----- Offline: the service worker must serve the app and the saved data must still be there -----
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector("h1");
  assert.equal(await page.locator("h1").innerText(), "Your libraries", "loads offline");
  assert.equal(await page.locator("ul.cards > li").count(), 2, "data present offline");

  assert.deepEqual(errors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED/.test(e)), [], "no console errors");
  console.log("E2E OK");
} finally {
  await browser.close();
  server.kill();
}
