import puppeteer from "puppeteer-core";

const CHROME = "C:\\Users\\diego\\.cache\\puppeteer\\chrome\\win64-153.0.8010.36\\chrome-win64\\chrome.exe";
const BASE = "http://localhost:4321";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];
const langs = [
  { name: "en", path: "/" },
  { name: "es", path: "/es/" },
];
const themes = ["light", "dark"];

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    for (const lang of langs) {
      for (const vp of viewports) {
        for (const theme of themes) {
          const page = await browser.newPage();
          await page.setViewport({ width: vp.width, height: vp.height });
          await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
          await page.goto(BASE + lang.path, { waitUntil: "networkidle0" });
          // Forzar el tema vía el toggle si hace falta (localStorage manda sobre prefers-color-scheme
          // luego de la primera visita) -- en una page nueva no hay localStorage previo, así que
          // el script inline de BaseLayout ya debería aplicar prefers-color-scheme directamente.
          const theme_applied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));

          const label = `${lang.name}/${vp.name}/${theme}(applied=${theme_applied})`;

          // 1. Orden de secciones (ids reales en el DOM, en orden)
          const sectionIds = await page.evaluate(() =>
            Array.from(document.querySelectorAll("main > section[id]")).map((s) => s.id)
          );

          // 2. Nav: anclas + labels
          const navLinks = await page.evaluate(() =>
            Array.from(document.querySelectorAll(".site-nav__links a")).map((a) => ({
              href: a.getAttribute("href"),
              text: a.textContent.trim(),
            }))
          );

          // 3. Numeración de SectionHeading
          const numbers = await page.evaluate(() =>
            Array.from(document.querySelectorAll(".section-heading .num")).map((n) => n.textContent.trim())
          );

          // 4. Overflow horizontal
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

          // 5. Hero: nombre + rol + ubicación + CTA primario dentro del viewport (sólo mobile relevante)
          let heroCheck = null;
          if (vp.name === "mobile") {
            heroCheck = await page.evaluate(() => {
              const name = document.querySelector(".hero__name");
              const role = document.querySelector(".hero__role");
              const loc = document.querySelector(".hero__location");
              const cta = document.querySelector(".hero .btn-primary");
              const rect = (el) => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
              };
              return {
                name: rect(name),
                role: rect(role),
                loc: rect(loc),
                ctaBottom: cta ? cta.getBoundingClientRect().bottom : null,
              };
            });
          }

          // 6. Órbita: tamaño real
          const orbitBox = await page.evaluate(() => {
            const el = document.querySelector(".stack-orbit");
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { width: r.width, height: r.height };
          });

          // 7. Sección about presente?
          const hasAbout = sectionIds.includes("about");

          // 8. Elementos hero opcionales visibles (mobile)
          let factVisible = null;
          let linksVisible = null;
          if (vp.name === "mobile") {
            factVisible = await page.evaluate(() => {
              const el = document.querySelector(".hero__fact");
              if (!el) return "not-in-dom";
              const cs = getComputedStyle(el);
              return cs.display === "none" ? "hidden" : "visible";
            });
            linksVisible = await page.evaluate(() => {
              const el = document.querySelector(".hero__links");
              if (!el) return "not-in-dom";
              const cs = getComputedStyle(el);
              return cs.display === "none" ? "hidden" : "visible";
            });
          }

          console.log(`\n=== ${label} ===`);
          console.log("sections:", sectionIds.join(", "));
          console.log("nav:", navLinks.map((n) => `${n.href}:${n.text}`).join(" | "));
          console.log("numbers:", numbers.join(", "));
          console.log("overflow-x:", overflow);
          console.log("hasAbout:", hasAbout);
          console.log("orbitBox:", orbitBox);
          if (heroCheck) console.log("heroCheck:", JSON.stringify(heroCheck));
          if (vp.name === "mobile") console.log("factVisible:", factVisible, "linksVisible:", linksVisible);

          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
