import { readFile } from "node:fs/promises";

import { expect, test, type APIRequestContext } from "@playwright/test";

const reusableCode = "MEXC26-0AD8949CB6FA";
const secondCode = "MEXC26-2D9F07264C4A";
const runSeed = Number(String(Date.now()).slice(-5));

function uidFor(workerIndex: number, offset = 0) {
  return String(60_000_000 + runSeed * 100 + workerIndex * 10 + offset).padStart(8, "0");
}

async function enterContest(page: import("@playwright/test").Page, uid: string, code = reusableCode) {
  await page.goto("/");
  await expect(page.getByText("Một mã có thể được sử dụng cho nhiều UID được mời.")).toHaveCount(0);
  await page.getByLabel("Mã tham gia").fill(code);
  await page.getByLabel("UID MEXC").fill(uid);
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByRole("heading", { name: "Tham gia dự đoán" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Chung kết World Cup 2026", exact: true })).toBeVisible();
}

async function createApiSession(request: APIRequestContext, uid: string, code = reusableCode) {
  const response = await request.post("/api/session", { data: { code, uid } });
  expect(response.ok(), await response.text()).toBeTruthy();
  const sessionCookie = response.headers()["set-cookie"]?.split(";", 1)[0];
  expect(sessionCookie).toContain("mexc_uid_session=");
  return sessionCookie as string;
}

test("participant submits once, sees the masked FCFS timeline, and can sign back in", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "desktop submission workflow");
  const uid = uidFor(testInfo.workerIndex);
  await enterContest(page, uid);

  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name === "mexc_uid_session");
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.value.split(".")).toHaveLength(3);

  await page.getByRole("button", { name: "Argentina" }).click();
  await page.getByLabel("Tỉ số Argentina").fill("2");
  await page.getByLabel("Tỉ số Tây Ban Nha").fill("1");
  await page.getByRole("button", { name: "Có", exact: true }).click();
  await page.getByLabel(/Tôi xác nhận/).check();
  await page.screenshot({ path: testInfo.outputPath("prediction-form.png"), fullPage: true });
  await page.getByRole("button", { name: "Gửi dự đoán" }).click();

  await expect(page.getByRole("heading", { name: "Thứ tự gửi dự đoán" })).toBeVisible();
  await expect(page.locator(".timeline-entry").getByText(`${uid.slice(0, 2)}****${uid.slice(-2)}`)).toBeVisible();
  await expect(page.locator(".timeline-entry").filter({ hasText: "2 : 1" })).toBeVisible();
  await expect(page.locator(".timeline-entry").filter({ hasText: "Messi ghi bànCó" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("masked-timeline.png"), fullPage: true });

  await page.reload();
  await expect(page.getByLabel("Mã tham gia")).toHaveCount(0);
  await page.getByTitle("Đăng xuất").click();
  await expect(page.getByRole("heading", { name: "Tham gia dự đoán" })).toBeVisible();
  await page.getByLabel("Mã tham gia").fill(reusableCode);
  await page.getByLabel("UID MEXC").fill(uid);
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByRole("heading", { name: "Thứ tự gửi dự đoán" })).toBeVisible();

  const reloginCookie = (await page.context().cookies()).find((cookie) => cookie.name === "mexc_uid_session");
  expect(reloginCookie).toBeDefined();
  const secondSubmission = await page.request.post("/api/predictions", {
    headers: { cookie: `mexc_uid_session=${reloginCookie?.value}` },
    data: { winner: "spain", argentinaScore: 0, spainScore: 3, messiScores: false },
  });
  expect(secondSubmission.status()).toBe(409);
  expect((await secondSubmission.json()).error.code).toBe("PREDICTION_ALREADY_SUBMITTED");
});

test("access pair is enforced and retired market APIs no longer exist", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "desktop API security workflow");
  const uid = uidFor(testInfo.workerIndex, 1);
  const firstAccess = await request.post("/api/session", { data: { code: reusableCode, uid } });
  expect(firstAccess.ok()).toBeTruthy();
  await request.delete("/api/session");

  const wrongPair = await request.post("/api/session", { data: { code: secondCode, uid } });
  expect(wrongPair.status()).toBe(401);
  expect((await wrongPair.json()).error.code).toBe("INVALID_ACCESS");
  expect((await request.get("/api/markets")).status()).toBe(404);
  expect((await request.get("/api/portfolio")).status()).toBe(404);
  expect((await request.post("/api/provider/webhook", { data: {} })).status()).toBe(404);
});

test("timeline is paginated after twenty predictions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "desktop timeline pagination workflow");

  for (let index = 0; index < 20; index += 1) {
    const uid = uidFor(testInfo.workerIndex, 10 + index);
    const sessionCookie = await createApiSession(page.request, uid);
    const prediction = await page.request.post("/api/predictions", {
      headers: { cookie: sessionCookie },
      data: {
        winner: index % 2 === 0 ? "argentina" : "spain",
        argentinaScore: index % 4,
        spainScore: (index + 1) % 4,
        messiScores: index % 2 === 0,
      },
    });
    expect(prediction.ok()).toBeTruthy();
  }

  await page.goto("/");
  await page.locator(".desktop-nav").getByRole("button", { name: "Timeline" }).click();
  await expect(page.getByText("21 lượt hợp lệ")).toBeVisible();
  await expect(page.locator(".timeline-entry")).toHaveCount(20);
  await page.locator(".pagination").getByRole("button", { name: "2", exact: true }).click();
  await expect(page.locator(".timeline-order").getByText("#21", { exact: true })).toBeVisible();
  await expect(page.locator(".timeline-entry")).toHaveCount(1);
});

test("admin publishes the official result and leaderboard", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "desktop admin workflow");
  const uid = uidFor(testInfo.workerIndex, 2);
  const sessionCookie = await createApiSession(page.request, uid);
  const prediction = await page.request.post("/api/predictions", {
    headers: { cookie: sessionCookie },
    data: { winner: "argentina", argentinaScore: 2, spainScore: 1, messiScores: true },
  });
  const predictionResponse = await prediction.json();
  expect(prediction.ok(), JSON.stringify(predictionResponse)).toBeTruthy();

  await page.goto("/admin");
  await page.getByLabel("ADMIN_SECRET").fill("local-admin-secret-change-me");
  await page.getByRole("button", { name: "Mở quản trị" }).click();
  await expect(page.getByRole("heading", { name: "Quản trị sự kiện dự đoán" })).toBeVisible();
  await expect(page.getByText("•••• B6FA").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: uid, exact: true })).toBeVisible();

  const visibleCodes = page.locator(".code-list > div");
  await expect(visibleCodes).toHaveCount(5);
  await page.getByTitle("Tạo mã mới").click();
  await expect(page.getByText("Đã tạo mã mới. Hãy lưu mã ngay vì hệ thống chỉ lưu bản hash.")).toBeVisible();
  const codePagination = page.getByRole("navigation", { name: "Phân trang mã tham gia" });
  await expect(codePagination).toBeVisible();
  await expect(codePagination.getByRole("button", { name: "2", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(visibleCodes).toHaveCount(1);
  await codePagination.getByRole("button", { name: "1", exact: true }).click();
  await expect(visibleCodes).toHaveCount(5);

  await page.getByLabel("Argentina").fill("2");
  await page.getByLabel("Tây Ban Nha").fill("1");
  page.once("dialog", (dialog) => dialog.accept());
  await page.screenshot({ path: testInfo.outputPath("admin-contest.png"), fullPage: true });
  await page.getByRole("button", { name: "Công bố bảng xếp hạng" }).click();
  await expect(page.getByText("Đã công bố kết quả và bảng xếp hạng")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "BXH CSV" }).click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), "utf8");
  expect(csv).toContain(`"${uid}"`);
  expect(csv).toContain('"30"');

  await page.goto("/");
  await page.locator(".desktop-nav").getByRole("button", { name: "Bảng xếp hạng" }).click();
  await expect(page.getByRole("heading", { name: "Bảng xếp hạng" })).toBeVisible();
  await expect(page.getByText("30 điểm").first()).toBeVisible();

  await page.goto("/admin");
  await page.getByLabel("ADMIN_SECRET").fill("local-admin-secret-change-me");
  await page.getByRole("button", { name: "Mở quản trị" }).click();
  await expect(page.getByRole("cell", { name: uid, exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTitle(`Xóa UID ${uid}`).click();
  await expect(page.getByRole("cell", { name: uid, exact: true })).toHaveCount(0);

  await page.getByLabel("Nhập RESET để xác nhận").fill("RESET");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset dữ liệu" }).click();
  await expect(page.getByText("Đã reset dữ liệu sự kiện. Các mã tham gia vẫn được giữ lại.")).toBeVisible();
  const health = await (await page.request.get("/api/health")).json();
  expect(health.data.participants).toBe(0);
  expect(health.data.predictions).toBe(0);
});

test("mobile prediction and rules views do not overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "mobile layout workflow");
  await enterContest(page, uidFor(testInfo.workerIndex, 3));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
  await page.locator(".mobile-tab-bar").getByRole("button", { name: "Thể lệ" }).click();
  await expect(page.getByRole("heading", { name: "Thể lệ chương trình" })).toBeVisible();
  await expect(page.getByText("Tổng giá trị giải thưởng: 2,000 USDT")).toBeVisible();
  await expect(page.getByText("Sự kiện chỉ dành cho người dùng Việt Nam.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("mobile-rules.png"), fullPage: true });
});
