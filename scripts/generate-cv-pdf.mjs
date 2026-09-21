#!/usr/bin/env node
// Genera public/cv-es.pdf y public/cv-en.pdf a partir de las dos versiones
// finales y aprobadas del CV (texto ya escrito, este script sólo maqueta).
//
// CORRE SÓLO EN LOCAL, NUNCA EN CI (ver la decisión "los PDF del CV se
// generan desde el vault, en local, y sin teléfono" en el historial de
// decisiones del proyecto). El texto fuente vive en el directorio interno
// de notas de trabajo, excluido de git por el .gitignore del repo — CI
// nunca lo va a poder leer, así que un paso de pipeline que lo intentara
// fallaría siempre. Los dos PDF resultantes SÍ se versionan en el repo,
// como binarios. Este script no está enganchado a ningún workflow de
// `.github/` y no hay que agregarlo a ninguno.
//
// Requiere un Chrome/Chromium ya instalado en la máquina — no lo descarga:
// usa `puppeteer-core`, no `puppeteer`, así que `npm install`/`npm ci`
// nunca baja un navegador (eso rompería CI, que sí corre `npm ci`, aunque
// este script en sí no se ejecute ahí). Cuál Chrome usar se resuelve en
// este orden:
//   1. variable de entorno CV_PDF_CHROME_PATH, si apunta a un ejecutable
//      que existe.
//   2. el build más reciente que haya quedado cacheado en
//      ~/.cache/puppeteer/chrome/ (lo dejan ahí otras herramientas de este
//      mismo proyecto que también usan Chrome headless).
//   3. rutas típicas de una instalación normal de Chrome, por sistema
//      operativo.
// Si ninguna resuelve un ejecutable, el script termina con un mensaje
// explicando qué falta, sin generar nada.
//
// Uso:
//   node scripts/generate-cv-pdf.mjs          # genera los dos idiomas
//   node scripts/generate-cv-pdf.mjs es       # sólo cv-es.pdf
//   node scripts/generate-cv-pdf.mjs en       # sólo cv-en.pdf
//   CV_PDF_CHROME_PATH=/ruta/a/chrome node scripts/generate-cv-pdf.mjs

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Fuente del contenido ─────────────────────────────────────────────────
// El texto ya está escrito y aprobado; vive en el directorio interno de
// notas de trabajo del proyecto (vault/, gitignored). Este script lee su
// contenido de ahí por diseño — es la decisión de origen de los PDF del CV
// ("los PDF del CV se generan desde el vault, en local, y sin teléfono") —
// y por eso corre sólo en local, nunca en CI (ver el encabezado de arriba:
// CI jamás ve vault/, así que un paso de pipeline que lo intentara
// fallaría siempre). La ruta se escribe directa y legible, como cualquier
// otra ruta de este archivo: partirla en piezas no la esconde de nadie que
// abra el script, sólo se la esconde al gate anti-fuga — que es justo lo
// que no puede pasar, porque ese gate es lo único que avisa si mañana se
// agrega ahí una ruta interna que sí importe. La excepción para que
// `scripts/check-repo-leak.sh` no marque esta línea está declarada ahí,
// acotada a este archivo y a este patrón puntual.
const SOURCE_DIR = path.join(ROOT, "vault", "06-contenido");

function sourcePathFor(lang) {
  return path.join(SOURCE_DIR, `cv-final-${lang}.md`);
}

const LANGS = {
  es: {
    endHeadingRe: /^# Notas — NO van al CV\s*$/m,
    outFile: "cv-es.pdf",
  },
  en: {
    endHeadingRe: /^# Notes — NOT part of the CV\s*$/m,
    outFile: "cv-en.pdf",
  },
};

// ── Resolución del ejecutable de Chrome ──────────────────────────────────

function findChromeExecutable() {
  const fromEnv = process.env.CV_PDF_CHROME_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const cacheRoot = path.join(os.homedir(), ".cache", "puppeteer", "chrome");
  if (existsSync(cacheRoot)) {
    const builds = readdirSync(cacheRoot).sort().reverse();
    for (const build of builds) {
      const candidates = [
        path.join(cacheRoot, build, "chrome-win64", "chrome.exe"),
        path.join(cacheRoot, build, "chrome-linux64", "chrome"),
        path.join(
          cacheRoot,
          build,
          "chrome-mac-x64",
          "Google Chrome for Testing.app",
          "Contents",
          "MacOS",
          "Google Chrome for Testing"
        ),
        path.join(
          cacheRoot,
          build,
          "chrome-mac-arm64",
          "Google Chrome for Testing.app",
          "Contents",
          "MacOS",
          "Google Chrome for Testing"
        ),
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
      }
    }
  }

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

// ── Extracción del cuerpo del CV desde el markdown fuente ────────────────
//
// Entra desde el encabezado "# DIEGO CHIQUIAR" hasta justo antes del
// encabezado de notas de cada idioma. Todo lo que está debajo de ese
// encabezado (confirmaciones pendientes, registro de lo retirado, criterio
// editorial) queda afuera: no es CV, es bitácora de trabajo.

const START_HEADING_RE = /^# DIEGO CHIQUIAR\s*$/m;

function extractCvBody(raw, endHeadingRe, lang) {
  const startMatch = raw.match(START_HEADING_RE);
  if (!startMatch) {
    throw new Error(
      `[${lang}] no se encontró el encabezado de inicio ("# DIEGO CHIQUIAR") en el archivo fuente.`
    );
  }
  const endMatch = raw.match(endHeadingRe);
  if (!endMatch) {
    throw new Error(
      `[${lang}] no se encontró el encabezado de notas en el archivo fuente — no se puede cortar con seguridad.`
    );
  }
  if (endMatch.index <= startMatch.index) {
    throw new Error(
      `[${lang}] el encabezado de notas aparece antes que el de inicio en el archivo fuente — revisar a mano.`
    );
  }

  let body = raw.slice(startMatch.index, endMatch.index);

  // Recorta líneas en blanco y separadores "---" colgantes al final (el CV
  // cierra con un separador doble justo antes del encabezado de notas).
  const lines = body.split("\n");
  while (lines.length && /^(\s*|-{3,}\s*)$/.test(lines[lines.length - 1])) {
    lines.pop();
  }
  return lines.join("\n");
}

// Teléfono (ADR: los PDF publicados no llevan teléfono, a diferencia del
// dato que sí usa la capa privada para otros fines). El patrón no es un
// número fijo: cualquier "+<dígitos con espacios>" entre separadores "·".
const PHONE_SEGMENT_RE = /\s·\s\+\d[\d ]*\d(?=\s·)/g;

// ── Encabezado (nombre, lema, línea de contacto) ─────────────────────────
//
// Se extrae aparte del resto porque es una franja de texto corto y factual
// (no prosa que deba re-envolverse): la ubicación y el contacto van en
// líneas propias, no fundidas en un párrafo.

function extractHeader(body) {
  const hrMatch = body.match(/^-{3,}\s*$/m);
  const headerChunk = hrMatch ? body.slice(0, hrMatch.index) : body;
  const rest = hrMatch ? body.slice(hrMatch.index) : "";

  const lines = headerChunk.split("\n");
  const h1Match = lines[0].match(/^#\s+(.*)$/);
  const name = (h1Match ? h1Match[1] : lines[0]).trim();

  const remaining = lines.slice(1).filter((l) => l.trim() !== "");
  const taglineRaw = remaining[0] || "";
  const tagline = taglineRaw.replace(/^\*\*(.*)\*\*$/, "$1").trim();
  const metaLines = remaining
    .slice(1)
    .map((l) => l.replace(PHONE_SEGMENT_RE, "").trim())
    .filter((l) => l !== "");

  return { name, tagline, metaLines, rest };
}

// ── Parser de markdown a bloques ─────────────────────────────────────────
//
// No es un parser de CommonMark genérico: cubre exactamente el subconjunto
// que usan los dos documentos fuente (encabezados ##/###, listas "- ",
// tablas GFM, separadores "---" y párrafos con **negrita**/*itálica*). Se
// eligió a mano en vez de sumar una librería de markdown porque el
// contenido es fijo y conocido, y así queda control total sobre cómo se ve
// una página que tiene que leerse como el sitio, no como un volcado
// genérico.

function isHr(line) {
  return /^-{3,}\s*$/.test(line.trim());
}

function isHeading(line) {
  return /^#{1,3}\s+/.test(line);
}

function isListItem(line) {
  return /^-\s+/.test(line);
}

function isTableRow(line) {
  return line.trim().startsWith("|");
}

function parseBlocks(md) {
  const lines = md.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (isHr(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    if (isTableRow(line)) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    if (isListItem(line)) {
      const items = [];
      while (i < lines.length) {
        if (lines[i].trim() === "") {
          // Una lista puede tener sus ítems separados por una línea en
          // blanco (FORMACIÓN los tiene pegados; MercadoPago/ERP los tienen
          // separados). Si lo que sigue tras el/los blanco(s) es otro ítem
          // de lista, es la misma lista; si no, la lista terminó acá.
          let j = i;
          while (j < lines.length && lines[j].trim() === "") j++;
          if (j < lines.length && isListItem(lines[j])) {
            i = j;
            continue;
          }
          break;
        }
        if (!isListItem(lines[i])) break;

        const itemLines = [lines[i].replace(/^-\s+/, "")];
        i++;
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          !isListItem(lines[i]) &&
          !isHeading(lines[i]) &&
          !isHr(lines[i]) &&
          !isTableRow(lines[i])
        ) {
          itemLines.push(lines[i].trim());
          i++;
        }
        items.push(itemLines.join(" "));
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Párrafo: junta líneas consecutivas no vacías (el salto de línea
    // dentro del párrafo es sólo ancho de edición, se renderiza corrido).
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isHr(lines[i]) &&
      !isHeading(lines[i]) &&
      !isTableRow(lines[i]) &&
      !isListItem(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}

// ── Formato inline y render a HTML ───────────────────────────────────────

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(text) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return out;
}

// ── Enlaces en la línea de contacto del encabezado ───────────────────────
//
// Genérico a propósito: no hardcodea "linkedin.com" ni "github.com" ni
// ninguna URL concreta, detecta la FORMA (email o dominio/URL) de cada
// segmento entre "·" de una meta-línea. Así cualquier dominio que el vault
// agregue a futuro a esa línea sale ya clicable, sin tocar este script.

const EMAIL_SEGMENT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_SEGMENT_RE = /^(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?$/i;

function linkifySegment(segment) {
  const trimmed = segment.trim();
  if (EMAIL_SEGMENT_RE.test(trimmed)) {
    return `<a href="mailto:${trimmed}">${renderInline(trimmed)}</a>`;
  }
  if (DOMAIN_SEGMENT_RE.test(trimmed)) {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return `<a href="${escapeHtml(href)}">${renderInline(trimmed)}</a>`;
  }
  return renderInline(segment);
}

// Las meta-líneas del encabezado (ubicación, contacto) separan sus datos con
// " · " — mismo separador que ya asume PHONE_SEGMENT_RE más arriba. Cada
// segmento se evalúa por separado para no linkificar la línea entera.
function renderMetaLine(line) {
  return line.split(" · ").map(linkifySegment).join(" · ");
}

function renderJobHeading(rawText) {
  const parts = rawText.split("|").map((p) => p.trim());
  if (parts.length === 3) {
    const [role, company, dates] = parts;
    return (
      `<h3 class="job-heading">` +
      `<span class="job-header">` +
      `<span class="job-role">${renderInline(role)}</span>` +
      `<span class="job-dates">${renderInline(dates)}</span>` +
      `</span>` +
      `<span class="job-employer">${renderInline(company)}</span>` +
      `</h3>`
    );
  }
  return `<h3>${renderInline(rawText)}</h3>`;
}

function parseTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((c) => c.trim());
}

function renderTable(rawRows) {
  // Fila 0 = encabezado GFM (vacío en estos dos documentos, no se
  // renderiza) · fila 1 = separador GFM ("|---|---|") · el resto es cuerpo.
  const bodyRows = rawRows.slice(2).map(parseTableRow);
  const trs = bodyRows
    .map(
      (cells) =>
        `<tr>${cells.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`
    )
    .join("");
  return `<table class="skills-table"><tbody>${trs}</tbody></table>`;
}

function renderBlock(block) {
  switch (block.type) {
    case "hr":
      // Los separadores del markdown no se traducen a una regla visual
      // propia: la separación entre secciones la da el margen/borde de
      // cada "section-title" (##) más abajo en el CSS.
      return "";
    case "heading":
      if (block.level === 2) {
        return `<h2 class="section-title">${renderInline(block.text)}</h2>`;
      }
      if (block.level === 3) {
        return renderJobHeading(block.text);
      }
      return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
    case "paragraph":
      return `<p>${renderInline(block.text)}</p>`;
    case "list":
      return `<ul>${block.items
        .map((it) => `<li>${renderInline(it)}</li>`)
        .join("")}</ul>`;
    case "table":
      return renderTable(block.rows);
    default:
      return "";
  }
}

// ── Documento HTML completo ──────────────────────────────────────────────

const PALETTE = {
  // Muestreados en la decisión de identidad editorial del proyecto (papel
  // crema + tinta azul, tema claro): papel, tinta de énfasis/títulos, texto
  // de lectura, metadatos y borde de sección, en ese orden.
  paper: "#f6ecd3",
  accent: "#364aa9",
  ink: "#233066",
  muted: "#445bc1",
  border: "#ddd1b0",
};

function fontFaceCss() {
  const fontsDir = path.join(ROOT, "public", "fonts");
  const toDataUri = (file) =>
    readFileSync(path.join(fontsDir, file)).toString("base64");

  return `
    @font-face {
      font-family: "Source Serif 4";
      font-style: normal;
      font-weight: 400;
      src: url(data:font/woff2;base64,${toDataUri("source-serif4-400.woff2")}) format("woff2");
    }
    @font-face {
      font-family: "Source Serif 4";
      font-style: normal;
      font-weight: 700;
      src: url(data:font/woff2;base64,${toDataUri("source-serif4-700.woff2")}) format("woff2");
    }
    @font-face {
      font-family: "Source Serif 4";
      font-style: italic;
      font-weight: 400;
      src: url(data:font/woff2;base64,${toDataUri("source-serif4-400-italic.woff2")}) format("woff2");
    }
    @font-face {
      font-family: "IBM Plex Mono";
      font-style: normal;
      font-weight: 400;
      src: url(data:font/woff2;base64,${toDataUri("ibm-plex-mono-400.woff2")}) format("woff2");
    }
    @font-face {
      font-family: "IBM Plex Mono";
      font-style: normal;
      font-weight: 700;
      src: url(data:font/woff2;base64,${toDataUri("ibm-plex-mono-700.woff2")}) format("woff2");
    }
  `;
}

function documentCss() {
  return `
    ${fontFaceCss()}

    @page {
      size: A4;
      margin: 9mm 12.5mm 6mm;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
    }

    body {
      font-family: "Source Serif 4", Georgia, "Times New Roman", serif;
      font-size: 9pt;
      line-height: 1.22;
      color: ${PALETTE.ink};
      background: ${PALETTE.paper};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    p { margin: 0 0 3pt; }
    ul { margin: 0 0 3pt; padding-left: 12pt; }
    li { margin: 0 0 0.75pt; }
    strong { font-weight: 700; }
    em { font-style: italic; }

    .cv-header {
      margin-bottom: 2pt;
    }

    .cv-name {
      font-size: 19pt;
      font-weight: 700;
      color: ${PALETTE.accent};
      letter-spacing: -0.01em;
      margin: 0 0 1pt;
    }

    .cv-tagline {
      font-style: italic;
      font-weight: 400;
      color: ${PALETTE.accent};
      font-size: 10.2pt;
      margin: 0 0 2pt;
    }

    .cv-meta-line {
      color: ${PALETTE.muted};
      font-size: 8.6pt;
      margin: 0 0 0.75pt;
    }

    .cv-meta-line a {
      color: inherit;
      text-decoration: none;
    }

    .section-title {
      font-size: 10.6pt;
      font-weight: 700;
      color: ${PALETTE.accent};
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-top: 0.75pt solid ${PALETTE.border};
      margin: 3.5pt 0 2pt;
      padding-top: 2pt;
    }

    h2.section-title:first-of-type {
      margin-top: 2pt;
    }

    .job-heading {
      margin: 2.5pt 0 0.75pt;
    }

    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8pt;
    }

    .job-role {
      font-size: 10.2pt;
      font-weight: 700;
      color: ${PALETTE.ink};
    }

    .job-dates {
      font-family: "IBM Plex Mono", "Consolas", monospace;
      font-size: 8.2pt;
      color: ${PALETTE.muted};
      white-space: nowrap;
    }

    .job-employer {
      display: block;
      font-weight: 600;
      font-size: 9.4pt;
      color: ${PALETTE.ink};
      margin-top: 0.5pt;
    }

    .skills-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1pt 0 2pt;
      font-size: 8.6pt;
    }

    .skills-table td {
      vertical-align: top;
      padding: 1.5pt 0;
      border-bottom: 0.5pt solid ${PALETTE.border};
    }

    .skills-table td:first-child {
      width: 19%;
      font-weight: 700;
      color: ${PALETTE.accent};
      padding-right: 8pt;
    }
  `;
}

function buildDocument(rawMarkdown, lang) {
  const config = LANGS[lang];
  const body = extractCvBody(rawMarkdown, config.endHeadingRe, lang);
  const header = extractHeader(body);
  const blocks = parseBlocks(header.rest);
  const bodyHtml = blocks.map(renderBlock).join("\n");

  const metaHtml = header.metaLines
    .map((l) => `<p class="cv-meta-line">${renderMetaLine(l)}</p>`)
    .join("");

  const headerHtml =
    `<header class="cv-header">` +
    `<h1 class="cv-name">${renderInline(header.name)}</h1>` +
    (header.tagline
      ? `<p class="cv-tagline">${renderInline(header.tagline)}</p>`
      : "") +
    metaHtml +
    `</header>`;

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(header.name)}</title>
<style>${documentCss()}</style>
</head>
<body>
${headerHtml}
<main class="cv-body">
${bodyHtml}
</main>
</body>
</html>`;
}

// ── Render a PDF ──────────────────────────────────────────────────────────

async function renderPdf(html, outPath, executablePath) {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: outPath,
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const requested = process.argv.slice(2).filter((a) => a === "es" || a === "en");
  const langs = requested.length ? requested : ["es", "en"];

  const executablePath = findChromeExecutable();
  if (!executablePath) {
    console.error(
      "No se encontró un Chrome/Chromium instalado en esta máquina.\n" +
        "Indicá uno con la variable de entorno CV_PDF_CHROME_PATH, o instalá\n" +
        "Google Chrome, y volvé a correr el script."
    );
    process.exitCode = 1;
    return;
  }

  for (const lang of langs) {
    const srcPath = sourcePathFor(lang);
    if (!existsSync(srcPath)) {
      console.error(
        `[${lang}] no se encontró el archivo fuente. Este script corre sólo ` +
          "en local, con el directorio interno de notas de trabajo presente " +
          "(ver el comentario al inicio de este archivo)."
      );
      process.exitCode = 1;
      continue;
    }

    const raw = readFileSync(srcPath, "utf8");
    const html = buildDocument(raw, lang);
    const outPath = path.join(ROOT, "public", LANGS[lang].outFile);
    await renderPdf(html, outPath, executablePath);
    const { size } = statSync(outPath);
    console.log(`[${lang}] ${outPath} — ${(size / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
