#!/usr/bin/env node
// Genera public/og-image.png (EN) y public/og-image-es.png (ES): la imagen
// que se ve al compartir el link del sitio (LinkedIn, WhatsApp, Slack...).
// Reproduce el hero en su versión clara — mismos tokens de DESIGN.md — con
// Puppeteer, no con un editor de imágenes: así queda reproducible si el
// nombre, el cargo o la foto cambian.
//
// CORRE SÓLO EN LOCAL, A MANO. No está enganchado a ningún workflow de
// `.github/` ni al build — no hace falta regenerar la imagen en cada
// deploy, sólo cuando cambia el contenido que muestra o la identidad
// visual. Mismo patrón que scripts/generate-cv-pdf.mjs.
//
// Requiere un Chrome/Chromium ya instalado (usa `puppeteer-core`, no
// `puppeteer`: `npm ci` nunca descarga un navegador). Resolución del
// ejecutable, en orden:
//   1. OG_IMAGE_CHROME_PATH, si apunta a un ejecutable que existe.
//   2. rutas típicas de una instalación normal de Chrome, por sistema
//      operativo (incluye la ruta estándar de Windows).
// Si ninguna resuelve, el script termina explicando qué falta.
//
// Uso:
//   node scripts/generate-og-image.mjs          # genera los dos idiomas
//   node scripts/generate-og-image.mjs es        # sólo og-image-es.png
//   node scripts/generate-og-image.mjs en        # sólo og-image.png
//   OG_IMAGE_CHROME_PATH=/ruta/a/chrome node scripts/generate-og-image.mjs
//
// Las fuentes (public/fonts/*.woff2) y el retrato (public/images/*.webp) se
// incrustan como data URI en el HTML que se renderiza: evita problemas de
// resolución de `file://` con espacios/letra de unidad en Windows y no
// depende de ningún servidor corriendo.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { loadCv, cleanField } from "../src/lib/content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const FONTS_DIR = path.join(PUBLIC_DIR, "fonts");

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_BYTES = 300 * 1024;

// ── Resolución del ejecutable de Chrome ──────────────────────────────────

function findChromeExecutable() {
  const fromEnv = process.env.OG_IMAGE_CHROME_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const commonPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const candidate of commonPaths) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

// ── Datos (data/cv.*.yaml — única fuente, nada hardcodeado acá) ─────────

function textOf(lang) {
  const cv = loadCv(lang);
  const { person } = cv;
  return {
    name: person.name,
    headline: person.headline,
    location: cleanField(person.location),
    availability: cleanField(person.availability),
  };
}

// ── Assets embebidos (fuentes locales + retrato) como data URI ──────────

function b64(filePath) {
  return readFileSync(filePath).toString("base64");
}

function buildFontFaces() {
  const serif400 = b64(path.join(FONTS_DIR, "source-serif4-400.woff2"));
  const serif700 = b64(path.join(FONTS_DIR, "source-serif4-700.woff2"));
  const serifItalic = b64(
    path.join(FONTS_DIR, "source-serif4-400-italic.woff2")
  );
  const mono400 = b64(path.join(FONTS_DIR, "ibm-plex-mono-400.woff2"));

  return `
    @font-face {
      font-family: "Source Serif 4";
      font-style: normal;
      font-weight: 400;
      src: url(data:font/woff2;base64,${serif400}) format("woff2");
    }
    @font-face {
      font-family: "Source Serif 4";
      font-style: normal;
      font-weight: 800;
      src: url(data:font/woff2;base64,${serif700}) format("woff2");
    }
    @font-face {
      font-family: "Source Serif 4";
      font-style: italic;
      font-weight: 400;
      src: url(data:font/woff2;base64,${serifItalic}) format("woff2");
    }
    @font-face {
      font-family: "IBM Plex Mono";
      font-style: normal;
      font-weight: 400;
      src: url(data:font/woff2;base64,${mono400}) format("woff2");
    }
  `;
}

function buildPortraitDataUri() {
  const bytes = b64(path.join(PUBLIC_DIR, "images", "diego-portrait.webp"));
  return `data:image/webp;base64,${bytes}`;
}

// ── HTML/CSS — mismos tokens que src/styles/global.css (tema claro),
// DESIGN.md y ADR-0012, no valores inventados. Colores, radios y la sombra
// del retrato son los literales de --color-* / --shadow-portrait en tema
// claro; el tamaño del nombre es el techo del clamp() de .hero__name
// (5.25rem = 84px a 16px raíz). ──────────────────────────────────────────

function buildHtml({ lang, name, headline, location, availability, portraitAlt }) {
  const nameParts = name.trim().split(/\s+/);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<style>
  ${buildFontFaces()}

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    background: #f6ecd3; /* --color-bg, tema claro */
  }

  .card {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    display: flex;
    align-items: center;
    gap: 56px;
    padding: 0 76px;
    font-family: "Source Serif 4", Georgia, "Times New Roman", serif;
  }

  .content {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* width: fit-content, no el ancho por defecto de un bloque (100% del
     contenedor): estos tres son los elementos que fitLine() mide con
     scrollWidth para decidir si entran o hay que achicarlos -- con el
     ancho por defecto, scrollWidth reporta el ancho del CONTENEDOR
     (730px) en vez del ancho real del texto en cuanto el texto es mas
     angosto que la columna, y la medicion queda inutil (todo "desborda"
     siempre). fit-content conserva el comportamiento de bloque (una
     linea propia, apilado vertical) pero el ancho de la caja pasa a ser
     el del contenido. */
  .name {
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.01em;
    color: #364aa9; /* --color-accent, tema claro */
    font-size: 84px;
    margin-bottom: 16px;
    white-space: nowrap;
    width: fit-content;
  }

  .role {
    font-style: italic;
    font-weight: 400;
    color: #364aa9; /* --color-accent */
    font-size: 30px;
    margin-bottom: 26px;
    white-space: nowrap;
    width: fit-content;
  }

  .meta {
    font-family: "IBM Plex Mono", Consolas, monospace;
    color: #445bc1; /* --color-text-muted, tema claro */
    font-size: 21px;
    white-space: nowrap;
    width: fit-content;
  }

  .meta .sep {
    color: #ddd1b0; /* --color-border, tema claro */
    margin: 0 12px;
  }

  .portrait-wrap {
    flex: 0 0 auto;
  }

  .portrait-wrap img {
    display: block;
    width: 262px;
    height: auto;
    border-radius: 16px; /* rounded.portrait: 1rem */
    /* --shadow-portrait, tema claro */
    box-shadow:
      0 2px 6px rgba(35, 48, 102, 0.1),
      0 16px 32px rgba(35, 48, 102, 0.14);
  }
</style>
</head>
<body>
  <div class="card">
    <div class="content">
      <p class="name">${nameParts.join(" ")}</p>
      <p class="role">${headline}</p>
      <p class="meta"><span class="loc">${location}</span>${availability ? `<span class="sep">·</span><span class="avail">${availability}</span>` : ""}</p>
    </div>
    <div class="portrait-wrap">
      <img src="${buildPortraitDataUri()}" alt="${portraitAlt}" />
    </div>
  </div>
</body>
</html>`;
}

// ── Ajuste de línea sin desbordar: mide en el propio navegador y reduce
// el tamaño de fuente hasta entrar, en vez de asumir que un texto entra
// porque "se ve corto" (T-E: hay que verificarlo, no suponerlo). ─────────

async function fitLine(page, selector, maxWidth, { minFontSize = 15, step = 1 } = {}) {
  return page.evaluate(
    (sel, max, min, st) => {
      const el = document.querySelector(sel);
      if (!el) return { fit: true, fontSize: null };
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > max && size > min) {
        size -= st;
        el.style.fontSize = `${size}px`;
      }
      return { fit: el.scrollWidth <= max, fontSize: size, scrollWidth: el.scrollWidth };
    },
    selector,
    maxWidth,
    minFontSize,
    step
  );
}

// Ancho disponible real para .content: WIDTH - 2*padding - gap - ancho del
// retrato (262px), con un margen de seguridad de 20px para que "entre sin
// apretar" (brief), no pegado al borde.
const CONTENT_MAX_WIDTH = WIDTH - 76 * 2 - 56 - 262 - 20;

async function renderOne(browser, lang, outFile) {
  const data = textOf(lang);
  if (!data.name || !data.headline) {
    throw new Error(
      `[${lang}] falta name/headline en data/cv.${lang}.yaml (o está sin confirmar) — no genero la imagen con contenido inventado.`
    );
  }
  if (!data.location) {
    console.warn(`[${lang}] aviso: location no confirmado en el YAML; la línea de metadatos queda vacía.`);
  }

  const portraitAlt =
    lang === "es"
      ? "Retrato de Diego Chiquiar, con buzo oscuro"
      : "Portrait of Diego Chiquiar, wearing a dark hoodie";

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.setContent(
    buildHtml({
      lang,
      name: data.name,
      headline: data.headline,
      location: data.location ?? "",
      availability: data.availability,
      portraitAlt,
    }),
    { waitUntil: "networkidle0" }
  );
  // Las @font-face con `src` en data URI ya están disponibles sin red, pero
  // esperamos document.fonts.ready igual: evita medir con la fuente de
  // respaldo todavía activa en la primera pasada de layout.
  await page.evaluate(() => document.fonts.ready);

  // 1) El nombre nunca se corta: si algún día es más largo, se achica antes
  //    de desbordar la columna.
  await fitLine(page, ".name", CONTENT_MAX_WIDTH, { minFontSize: 44, step: 2 });
  // 2) El cargo, igual.
  await fitLine(page, ".role", CONTENT_MAX_WIDTH, { minFontSize: 18, step: 1 });

  // 3) La línea de metadatos: con disponibilidad si entra; si no, sólo la
  //    ubicación. Se decide MIDIENDO en el navegador, no contando
  //    caracteres a mano.
  const withAvailability = await fitLine(page, ".meta", CONTENT_MAX_WIDTH, {
    minFontSize: 21, // si con el piso normal ya entra, no se achica: sólo se prueba si entra tal cual
    step: 1,
  });
  if (!withAvailability.fit && data.availability) {
    await page.evaluate(() => {
      const avail = document.querySelector(".meta .avail");
      const sep = document.querySelector(".meta .sep");
      if (avail) avail.remove();
      if (sep) sep.remove();
    });
    // Vuelve a poner el tamaño de fuente al valor base antes de re-medir
    // sólo con la ubicación (si el achique de arriba llegó a tocarlo).
    await page.evaluate(() => {
      const el = document.querySelector(".meta");
      if (el) el.style.fontSize = "21px";
    });
    await fitLine(page, ".meta", CONTENT_MAX_WIDTH, { minFontSize: 15, step: 1 });
  }

  const cardHandle = await page.$(".card");
  const pngBuffer = await cardHandle.screenshot({ type: "png" });
  await page.close();

  const outPath = path.join(PUBLIC_DIR, outFile);
  writeFileSync(outPath, pngBuffer);

  let finalBuffer = pngBuffer;
  if (pngBuffer.length > MAX_BYTES) {
    // No hay una segunda dependencia nueva acá: sharp ya está instalado
    // (dependencia transitiva de astro, y ya se usa directo en
    // scripts/convert-portrait.mjs con el mismo criterio) — se recurre a
    // él sólo como fallback, si el PNG plano de Puppeteer no entra en el
    // presupuesto.
    const { default: sharp } = await import("sharp");
    finalBuffer = await sharp(pngBuffer)
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    if (finalBuffer.length < pngBuffer.length) {
      writeFileSync(outPath, finalBuffer);
    } else {
      finalBuffer = pngBuffer;
    }
  }

  console.log(
    `[${lang}] ${outFile}: ${finalBuffer.length} bytes (${(finalBuffer.length / 1024).toFixed(1)} KB)` +
      (finalBuffer.length > MAX_BYTES ? " — POR ENCIMA de 300 KB" : "")
  );

  return { outPath, bytes: finalBuffer.length };
}

// ── Main ──────────────────────────────────────────────────────────────

const requested = process.argv[2];
const langs = requested === "es" || requested === "en" ? [requested] : ["en", "es"];

const chromePath = findChromeExecutable();
if (!chromePath) {
  console.error(
    "No se encontró un Chrome/Chromium instalado. Definí OG_IMAGE_CHROME_PATH apuntando al ejecutable."
  );
  process.exit(1);
}

mkdirSync(PUBLIC_DIR, { recursive: true });

const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
try {
  for (const lang of langs) {
    const outFile = lang === "es" ? "og-image-es.png" : "og-image.png";
    await renderOne(browser, lang, outFile);
  }
} finally {
  await browser.close();
}
