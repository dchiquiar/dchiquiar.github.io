import puppeteer from "puppeteer-core";

const CHROME = "C:\\Users\\diego\\.cache\\puppeteer\\chrome\\win64-153.0.8010.36\\chrome-win64\\chrome.exe";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:4321/es/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 2500));
const info = await page.evaluate(() => {
  const h1 = document.querySelector(".hero__name");
  const content = document.querySelector(".hero__content");
  const layout = document.querySelector(".hero__layout");
  const letters = document.querySelector(".hero__name-letters");
  const cs = getComputedStyle(h1);
  const csLetters = getComputedStyle(letters);
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width };
  };
  return {
    h1Rect: rect(h1),
    h1ScrollWidth: h1.scrollWidth,
    lettersRect: rect(letters),
    lettersScrollWidth: letters.scrollWidth,
    contentRect: rect(content),
    layoutRect: rect(layout),
    fontSize: cs.fontSize,
    overflow: cs.overflow,
    whiteSpace: cs.whiteSpace,
    lettersOverflow: csLetters.overflow,
    lastLetterTransform: (() => {
      const spans = letters.querySelectorAll(".hero__name-letter");
      const last = spans[spans.length - 1];
      const lcs = getComputedStyle(last);
      return { text: last.textContent, transform: lcs.transform, opacity: lcs.opacity, rect: rect(last) };
    })(),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
