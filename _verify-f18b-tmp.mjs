import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "C:\\Users\\diego\\.cache\\puppeteer\\chrome\\win64-153.0.8010.36\\chrome-win64\\chrome.exe";
const BASE = "http://localhost:4321";
const SHOTS = "C:\\Users\\diego\\AppData\\Local\\Temp\\claude\\C--Users-diego-source-repos-portfolioDiegoChiquiar\\7d4386f7-3cf8-4b0c-9605-5619549a9b38\\scratchpad\\f18";

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    // --- Screenshots: ES desktop full, ES mobile full, hero, stack (desktop) ---
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
      await page.goto(BASE + "/es/", { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 2200));
      await page.screenshot({ path: `${SHOTS}/after-es-desktop-full.png`, fullPage: true });
      const heroClip = await page.evaluate(() => {
        const r = document.querySelector(".hero").getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      await page.screenshot({ path: `${SHOTS}/after-hero-desktop.png`, clip: heroClip });
      const stackClip = await page.evaluate(() => {
        const r = document.querySelector("#skills").getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 900) };
      });
      await page.screenshot({ path: `${SHOTS}/after-stack-desktop.png`, clip: stackClip });
      await page.close();
    }
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
      await page.goto(BASE + "/es/", { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 2200));
      await page.screenshot({ path: `${SHOTS}/after-es-mobile-full.png`, fullPage: true });
      const heroClip = await page.evaluate(() => {
        const r = document.querySelector(".hero").getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      await page.screenshot({ path: `${SHOTS}/after-hero-mobile.png`, clip: heroClip });
      const stackClip = await page.evaluate(() => {
        const r = document.querySelector("#skills").getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 1200) };
      });
      await page.screenshot({ path: `${SHOTS}/after-stack-mobile.png`, clip: stackClip });
      await page.close();
    }

    // --- Content checks: education section, learning card, job projects ---
    for (const langPath of ["/", "/es/"]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE + langPath, { waitUntil: "networkidle0" });

      const eduItems = await page.evaluate(() => document.querySelectorAll("#education .education-list li").length);
      const expJobs = await page.evaluate(() => document.querySelectorAll("#experience .job").length);
      const expHasEduList = await page.evaluate(() => Boolean(document.querySelector("#experience .education-list")));
      const learningCard = await page.evaluate(() => {
        const el = document.querySelector(".stack-card--learning");
        if (!el) return null;
        return {
          title: el.querySelector(".stack-card__title")?.textContent.trim(),
          desc: el.querySelector(".stack-card__desc")?.textContent.trim() ?? null,
          num: el.querySelector(".stack-card__num")?.textContent.trim(),
          items: Array.from(el.querySelectorAll(".tag")).map((t) => t.textContent.trim()),
        };
      });
      const learningCardCount = await page.evaluate(() => document.querySelectorAll(".stack-card--learning").length);

      // CLS durante un scroll completo
      const cls = await page.evaluate(async () => {
        let total = 0;
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        });
        po.observe({ type: "layout-shift", buffered: true });
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 400));
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 400));
        po.takeRecords();
        return total;
      });

      // Overflow a 200% zoom (proxy: doble font-size raíz)
      const overflowAtZoom = await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
        const of = document.documentElement.scrollWidth > document.documentElement.clientWidth;
        document.documentElement.style.fontSize = "";
        return of;
      });

      console.log(`\n--- content ${langPath} ---`);
      console.log("education items:", eduItems);
      console.log("experience jobs:", expJobs, "| experience aún tiene .education-list:", expHasEduList);
      console.log("learning card count:", learningCardCount, JSON.stringify(learningCard));
      console.log("CLS:", cls);
      console.log("overflow at 200% zoom:", overflowAtZoom);

      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
