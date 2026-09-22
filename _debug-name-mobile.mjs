import puppeteer from "puppeteer-core";

const CHROME = "C:\\Users\\diego\\.cache\\puppeteer\\chrome\\win64-153.0.8010.36\\chrome-win64\\chrome.exe";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812 });
await page.goto("http://localhost:4321/es/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 2500));
const info = await page.evaluate(() => {
  const h1 = document.querySelector(".hero__name");
  const letters = document.querySelector(".hero__name-letters");
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width };
  };
  return {
    h1Rect: rect(h1),
    lettersRect: rect(letters),
    fontSize: getComputedStyle(h1).fontSize,
    viewportWidth: window.innerWidth,
    docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
