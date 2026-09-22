import puppeteer from "puppeteer-core";

const CHROME = "C:\\Users\\diego\\.cache\\puppeteer\\chrome\\win64-153.0.8010.36\\chrome-win64\\chrome.exe";
const SHOTS = "C:\\Users\\diego\\AppData\\Local\\Temp\\claude\\C--Users-diego-source-repos-portfolioDiegoChiquiar\\7d4386f7-3cf8-4b0c-9605-5619549a9b38\\scratchpad\\f18";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, defaultViewport: null });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto("http://localhost:4321/es/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 2500));
const heroEl = await page.$(".hero");
await heroEl.screenshot({ path: `${SHOTS}/hero-dsf2.png` });
await browser.close();
