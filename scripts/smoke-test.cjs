// Checks the preserved Claude dashboard in isolated offline mode before publishing.
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const productionRequests = [];
  page.on("pageerror", err => errors.push(err.message));
  page.on("request", request => {
    if (request.url().includes("fwkmgzwmfoyotnstybcq") || request.url().includes("supabase.co")) {
      productionRequests.push(request.url());
    }
  });
  await page.goto("http://127.0.0.1:8765/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1400);
  const state = await page.evaluate(() => {
    const root = document.getElementById("appRoot");
    const login = document.getElementById("loginOverlay");
    const main = document.getElementById("main");
    return {
      title: document.title,
      hasOriginalHeading: document.body.innerText.includes("Daily Performance Management"),
      appVisible: !!root && getComputedStyle(root).display !== "none",
      loginHidden: !!login && getComputedStyle(login).display === "none",
      mainVisible: !!main && main.getBoundingClientRect().width > 600,
      displayedPage: document.getElementById("pageTitle")?.textContent || "",
      navCount: document.querySelectorAll("[data-nav]").length,
      offlineFlag: window.DailySFM?.mode === "offline",
      hasSavedDemo: !!localStorage.getItem("dailysfm-original-offline-v1"),
    };
  });
  console.log("DPM Lab smoke result:", JSON.stringify(state));
  console.log("Browser errors:", JSON.stringify(errors.slice(0, 8)));
  console.log("Production requests:", productionRequests.length);
  if (!state.hasOriginalHeading || !state.appVisible || !state.loginHidden ||
      !state.mainVisible || state.navCount < 5 || !state.offlineFlag || !state.displayedPage || !state.hasSavedDemo ||
      errors.length || productionRequests.length) {
    await page.screenshot({ path: "dpm-lab-smoke-failure.png", fullPage: false });
    await browser.close();
    process.exit(1);
  }
  await browser.close();
  console.log("PASS: Original Claude cockpit renders offline and cannot reach B+K.");
})().catch(err => {
  console.error(err);
  process.exit(1);
});
