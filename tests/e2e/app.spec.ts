import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

const runSeed = Number(String(Date.now()).slice(-5));
const userPassword = "test-password-2026";

function uidFor(workerIndex: number, offset = 0) {
  return String(60_000_000 + runSeed * 100 + workerIndex * 10 + offset).padStart(8, "0");
}

async function provisionUser(request: import("@playwright/test").APIRequestContext, uid: string) {
  const response = await request.post("/api/admin/users", {
    headers: { "x-admin-secret": "local-admin-secret-change-me" },
    data: { uid, password: userPassword },
  });
  expect(response.ok()).toBeTruthy();
}

async function makeMarketFresh(
  request: import("@playwright/test").APIRequestContext,
  marketIndex = 0,
) {
  const marketsPayload = await (await request.get("/api/markets")).json();
  const market = marketsPayload.data[marketIndex];
  const response = await request.post(`/api/admin/markets/${market.id}/replay`, {
    headers: { "x-admin-secret": "local-admin-secret-change-me" },
    data: {
      homeProbability: market.home.oracleProbability,
      homeScore: market.home.score,
      awayScore: market.away.score,
      matchMinute: market.matchMinute,
      status: market.status,
      event: "E2E fresh feed",
    },
  });
  expect(response.ok()).toBeTruthy();
  return market;
}

test("UID user can quote, buy, and see the live portfolio", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "desktop workflow");
  const uid = uidFor(testInfo.workerIndex);
  await provisionUser(request, uid);
  await makeMarketFresh(request);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Enter your UID" })).toBeVisible();

  await page.getByLabel("MEXC UID").fill(uid);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByLabel("Football markets")).toBeVisible();
  await expect(page.getByText("10,000 PTS").first()).toBeVisible();

  const pointInput = page.getByLabel("Points");
  await pointInput.fill("350");
  await page.getByRole("button", { name: "Get quote" }).click();
  await expect(page.getByText("Potential profit")).toBeVisible();
  await page.getByRole("button", { name: "Confirm buy" }).click();
  await expect(page.getByText(/Bought .* FRA shares/)).toBeVisible();

  await page.getByRole("button", { name: "Sell" }).click();
  await page.getByRole("button", { name: "50%", exact: true }).click();
  await page.getByRole("button", { name: "Get quote" }).click();
  await page.getByRole("button", { name: "Confirm sell" }).click();
  await expect(page.getByText(/Sold .* FRA shares/)).toBeVisible();

  await page.getByRole("button", { name: /My predictions/ }).first().click();
  await expect(page.getByRole("heading", { name: "My predictions" })).toBeVisible();
  await expect(page.getByText("Open positions")).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("desktop-portfolio.png"), fullPage: true });
});

test("admin replay tick updates a market through Supabase Realtime", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "desktop realtime workflow");
  const marketsResponse = await request.get("/api/markets");
  const marketsPayload = await marketsResponse.json();
  const market = marketsPayload.data[0];
  const uid = uidFor(testInfo.workerIndex, 1);
  await provisionUser(request, uid);

  await page.goto("/");
  await page.getByLabel("MEXC UID").fill(uid);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Football markets")).toBeVisible();

  const replayResponse = await request.post(`/api/admin/markets/${market.id}/replay`, {
    headers: { "x-admin-secret": "local-admin-secret-change-me" },
    data: {
      homeProbability: 0.3,
      homeScore: 0,
      awayScore: 1,
      matchMinute: 32,
      status: "live_open",
      event: "England goal",
    },
  });
  expect(replayResponse.ok()).toBeTruthy();

  await expect(page.locator(".latest-event").getByText("England goal")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("32'")).toBeVisible();

  const suspendResponse = await request.post(`/api/admin/markets/${market.id}/status`, {
    headers: { "x-admin-secret": "local-admin-secret-change-me" },
    data: { status: "suspended", reason: "VAR review" },
  });
  expect(suspendResponse.ok()).toBeTruthy();
  await expect(page.getByText("VAR review").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Get quote" })).toBeDisabled();

  const unsafeResume = await request.post(`/api/admin/markets/${market.id}/status`, {
    headers: { "x-admin-secret": "local-admin-secret-change-me" },
    data: { status: "live_open", reason: "Unsafe direct resume" },
  });
  expect(unsafeResume.status()).toBe(409);

  const confirmationResponse = await request.post(`/api/admin/markets/${market.id}/replay`, {
    headers: { "x-admin-secret": "local-admin-secret-change-me" },
    data: {
      homeProbability: 0.31,
      homeScore: 0,
      awayScore: 1,
      matchMinute: 33,
      status: "live_open",
      event: "Fresh odds confirmation 1/2",
    },
  });
  expect(confirmationResponse.ok()).toBeTruthy();
  await expect(page.getByText("Awaiting second fresh odds snapshot").first()).toBeVisible({ timeout: 10_000 });

  const resumeResponse = await request.post(`/api/admin/markets/${market.id}/replay`, {
    headers: { "x-admin-secret": "local-admin-secret-change-me" },
    data: {
      homeProbability: 0.32,
      homeScore: 0,
      awayScore: 1,
      matchMinute: 34,
      status: "live_open",
      event: "Odds reopened",
    },
  });
  expect(resumeResponse.ok()).toBeTruthy();
  await expect(page.locator(".latest-event").getByText("Odds reopened")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Get quote" })).toBeEnabled();
});

test("mobile market layout has no horizontal document overflow", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "mobile layout workflow");
  const uid = uidFor(testInfo.workerIndex, 2);
  await provisionUser(request, uid);
  await page.goto("/");
  await page.getByLabel("MEXC UID").fill(uid);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Football markets")).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect.poll(() => page.locator('img[alt$=" flag"]').evaluateAll((images) =>
    images.length > 0
      && images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0),
  )).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath("mobile-markets.png"), fullPage: true });
});

test("security guards reject invalid UID, anonymous portfolio, and unauthorized admin", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "API security workflow");

  const invalidUid = await request.post("/api/session", {
    data: { uid: "123", password: userPassword },
  });
  expect(invalidUid.status()).toBe(400);

  const anonymousPortfolio = await request.get("/api/portfolio");
  expect(anonymousPortfolio.status()).toBe(401);

  const marketsPayload = await (await request.get("/api/markets")).json();
  const unauthorizedAdmin = await request.post(
    `/api/admin/markets/${marketsPayload.data[0].id}/status`,
    { data: { status: "suspended", reason: "Unauthorized test" } },
  );
  expect(unauthorizedAdmin.status()).toBe(401);

  const unauthorizedUserExport = await request.get("/api/admin/users.csv");
  expect(unauthorizedUserExport.status()).toBe(401);
});

test("an oracle update invalidates an outstanding quote", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "quote version workflow");
  const uid = uidFor(testInfo.workerIndex, 3);
  await provisionUser(request, uid);
  await makeMarketFresh(request, 1);
  await page.goto("/");
  await page.getByLabel("MEXC UID").fill(uid);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Football markets")).toBeVisible();

  const marketsPayload = await (await request.get("/api/markets")).json();
  const market = marketsPayload.data[1];
  const quoteResponse = await page.request.post(`/api/markets/${market.id}/quote`, {
    data: { action: "buy", side: "home", amount: 100 },
  });
  expect(quoteResponse.ok()).toBeTruthy();
  const quote = (await quoteResponse.json()).data;

  const oracleUpdate = await request.post(`/api/admin/markets/${market.id}/replay`, {
    headers: { "x-admin-secret": "local-admin-secret-change-me" },
    data: {
      homeProbability: 0.6,
      homeScore: 0,
      awayScore: 0,
      matchMinute: null,
      status: "pre_match_open",
      event: "Pre-match price update",
    },
  });
  expect(oracleUpdate.ok()).toBeTruthy();

  const tradeResponse = await page.request.post(`/api/markets/${market.id}/trades`, {
    data: { quoteToken: quote.quoteToken, idempotencyKey: crypto.randomUUID() },
  });
  expect(tradeResponse.status()).toBe(409);
  expect((await tradeResponse.json()).error.code).toBe("ORACLE_VERSION_CHANGED");

  const expiringQuoteResponse = await page.request.post(`/api/markets/${market.id}/quote`, {
    data: { action: "buy", side: "home", amount: 100 },
  });
  expect(expiringQuoteResponse.ok()).toBeTruthy();
  const expiringQuote = (await expiringQuoteResponse.json()).data;
  await page.waitForTimeout(5_500);

  const expiredTrade = await page.request.post(`/api/markets/${market.id}/trades`, {
    data: { quoteToken: expiringQuote.quoteToken, idempotencyKey: crypto.randomUUID() },
  });
  expect(expiredTrade.status()).toBe(409);
  expect((await expiredTrade.json()).error.code).toBe("QUOTE_EXPIRED");
});

test("admin requires settlement and void previews before commit", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "admin preview workflow");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin access" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview settle" })).toHaveCount(0);
  await page.getByLabel("Admin secret").fill("local-admin-secret-change-me");
  await page.getByRole("button", { name: "Unlock operations" }).click();
  await expect(page.getByRole("heading", { name: "Market control" })).toBeVisible();

  const managedUid = uidFor(testInfo.workerIndex, 5);
  await page.getByLabel("UID", { exact: true }).fill(managedUid);
  await page.getByLabel("Password", { exact: true }).fill(userPassword);
  await page.getByRole("button", { name: "Add user" }).click();
  await expect(page.getByRole("cell", { name: managedUid, exact: true })).toBeVisible();

  await page.getByLabel(`New password for ${managedUid}`).fill("updated-password-2026");
  await page.getByTitle(`Update password for ${managedUid}`).click();
  await expect(page.getByText(`Password updated for ${managedUid}`)).toBeVisible();

  const usersDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export users CSV" }).click();
  const usersDownload = await usersDownloadPromise;
  expect(usersDownload.suggestedFilename()).toMatch(/^mexc-users-\d{4}-\d{2}-\d{2}\.csv$/);
  const usersCsv = await readFile(await usersDownload.path(), "utf8");
  expect(usersCsv).toContain(`"${managedUid}"`);
  expect(usersCsv).not.toContain("password_hash");
  expect(usersCsv).not.toContain("updated-password-2026");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export leaderboard CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mexc-leaderboard-\d{4}-\d{2}-\d{2}\.csv$/);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTitle(`Delete UID ${managedUid}`).click();
  await expect(page.getByRole("cell", { name: managedUid, exact: true })).toHaveCount(0);

  const settleButton = page.getByRole("button", { name: "Settle", exact: true });
  const voidButton = page.getByRole("button", { name: "Void", exact: true });
  await expect(settleButton).toBeDisabled();
  await expect(voidButton).toBeDisabled();

  await page.getByRole("button", { name: "Preview settle" }).click();
  await expect(page.getByText("Settlement preview ready")).toBeVisible();
  await expect(settleButton).toBeEnabled();
  await expect(voidButton).toBeDisabled();

  await page.getByRole("button", { name: "Preview void" }).click();
  await expect(page.getByText("Void preview ready")).toBeVisible();
  await expect(settleButton).toBeDisabled();
  await expect(voidButton).toBeEnabled();
});

test("required responsive widths do not overflow", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "responsive matrix");
  const uid = uidFor(testInfo.workerIndex, 4);
  await provisionUser(request, uid);
  await page.goto("/");
  await page.getByLabel("MEXC UID").fill(uid);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: "Continue" }).click();

  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 812 : 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});
