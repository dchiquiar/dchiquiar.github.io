#!/usr/bin/env node
// Valida data/*.yaml (capa pública) contra su JSON Schema en data/schemas/,
// y si existe la capa privada (data/private/, gitignored — no está presente
// en CI) también la valida contra su propio schema. Además bloquea frases
// marcadas como no verificadas para que no puedan reaparecer en los datos
// del CV, y verifica que ningún campo de texto real de la capa pública
// quede descartado por el filtro anti-placeholder (ver T-E: un regex
// insensible a mayúsculas atrapó la palabra "todo" del español y borró
// "Sobre mí" en /es sin ningún error — esa regresión es exactamente lo que
// este chequeo existe para agarrar antes del build).
//
// Uso: node scripts/validate-data.mjs
// Sale con código 1 y mensajes por consola si algo no valida. Lo corre CI
// (.github/workflows/deploy.yml) antes de buildear, y se puede correr en
// local con `npm run validate:data`.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import Ajv from "ajv";
// La función real, no una reimplementación del patrón: si alguien cambia
// PLACEHOLDER_RE en content.js, este chequeo corre con el cambio puesto,
// no con una copia que puede quedar desactualizada.
import { isPlaceholder } from "../src/lib/content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const schemasDir = path.join(dataDir, "schemas");

// Capa pública: siempre presente, siempre se valida.
const FILES = [
  { data: "cv.en.yaml", schema: "cv.schema.json" },
  { data: "cv.es.yaml", schema: "cv.schema.json" },
  { data: "proyectos.yaml", schema: "proyectos.schema.json" },
];

// Capa privada (data/private/, gitignored): no existe en CI ni en un clon
// nuevo del repo. Si está presente en local se valida igual; si no está, se
// salta sin marcar error.
const PRIVATE_FILES = [
  { data: path.join("private", "cv.private.yaml"), schema: "cv.private.schema.json", optional: true },
];

// Frases marcadas como no verificadas que no deben reaparecer en los datos
// del CV. Si vuelven a aparecer (por ejemplo al copiar contenido viejo de
// una versión anterior), la validación tiene que fallar de forma explícita,
// no silenciosa.
const BANNED_PHRASES = [
  { pattern: /bloqueos?\s+at[oó]micos?/i, note: "frase no verificada: 'bloqueo(s) atómico(s)' (SQL Server)" },
  { pattern: /atomic\s+locks?/i, note: "frase no verificada: 'atomic lock(s)' (SQL Server)" },
];

const ajv = new Ajv({ allErrors: true, strict: true });
// Cachea el validador compilado por archivo de schema: cv.schema.json se
// usa para cv.en.yaml y cv.es.yaml, y ajv no permite compilar dos veces un
// schema con el mismo $id.
const compiledValidators = new Map();

let hasErrors = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  hasErrors = true;
}

// Recorre cualquier valor ya parseado de YAML (objetos, arrays, strings,
// null, números) y llama `visit(fieldPath, text)` por cada string hoja.
// `fieldPath` queda como "experience[0].employer.sector", para que el
// mensaje de error diga exactamente dónde está el problema. `null` no es
// un string, así que un campo legítimamente sin confirmar (por ejemplo
// employer.sector: null) nunca llega a `visit` — no es un placeholder,
// es la ausencia de un dato, y eso ya lo maneja `cleanField` en runtime.
function walkStrings(value, fieldPath, visit) {
  if (typeof value === "string") {
    visit(fieldPath, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, `${fieldPath}[${i}]`, visit));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, val] of Object.entries(value)) {
      walkStrings(val, fieldPath ? `${fieldPath}.${key}` : key, visit);
    }
  }
}

// Falla si algún campo de texto de un YAML de la capa pública quedaría
// descartado por `isPlaceholder` — es decir, si el sitio lo borraría en
// silencio al pasar por `cleanField`/`cleanList` (o si alguien lo cablea
// a ese filtro más adelante, como pasaría hoy con el `problem` de un
// proyecto si se le aplicara cleanField). No distingue campos que hoy
// pasan por el filtro de los que no: cualquier string publicado que
// contenga uno de los marcadores reales que reconoce PLACEHOLDER_RE (ver
// src/lib/content.js) es una señal de que ese contenido no debería estar
// publicado tal cual.
function checkNoFalsePlaceholders(dataFile, doc) {
  walkStrings(doc, "", (fieldPath, text) => {
    if (isPlaceholder(text)) {
      fail(
        `${dataFile}: el campo "${fieldPath}" se leería como placeholder y se ` +
          `descartaría en el sitio — texto: ${JSON.stringify(text)}`
      );
    }
  });
}

function getValidator(schemaFile) {
  let validate = compiledValidators.get(schemaFile);
  if (validate) return validate;

  const schemaPath = path.join(schemasDir, schemaFile);
  let schema;
  try {
    schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  } catch (err) {
    fail(`no se pudo leer/parsear ${path.relative(rootDir, schemaPath)}: ${err.message}`);
    return null;
  }

  try {
    validate = ajv.compile(schema);
    compiledValidators.set(schemaFile, validate);
    return validate;
  } catch (err) {
    fail(`el schema ${schemaFile} es inválido: ${err.message}`);
    return null;
  }
}

// Valida un archivo de datos contra su schema y, si se pide, contra los
// BANNED_PHRASES y contra falsos positivos del filtro anti-placeholder. Si
// `optional` y el archivo no existe, no hace nada (no es un error: es el
// caso esperado de la capa privada en CI).
function validateDataFile(
  dataFile,
  schemaFile,
  { optional = false, checkBannedPhrases = false, checkPlaceholders = false } = {}
) {
  const dataPath = path.join(dataDir, dataFile);

  if (optional && !existsSync(dataPath)) {
    return;
  }

  let rawYaml;
  try {
    rawYaml = readFileSync(dataPath, "utf8");
  } catch (err) {
    fail(`no se pudo leer ${path.relative(rootDir, dataPath)}: ${err.message}`);
    return;
  }

  let doc;
  try {
    doc = loadYaml(rawYaml);
  } catch (err) {
    fail(`${dataFile} no es YAML válido:\n  ${err.message}`);
    return;
  }

  const validate = getValidator(schemaFile);
  if (!validate) return;

  const valid = validate(doc);
  if (!valid) {
    console.error(`ERROR: ${dataFile} no cumple ${schemaFile}:`);
    for (const e of validate.errors) {
      console.error(`  - ${e.instancePath || "(root)"} ${e.message}`);
    }
    hasErrors = true;
  } else {
    console.log(`OK: ${dataFile} valida contra ${schemaFile}`);
  }

  if (checkBannedPhrases) {
    for (const { pattern, note } of BANNED_PHRASES) {
      if (pattern.test(rawYaml)) {
        fail(`${dataFile} contiene una frase prohibida (${note}).`);
      }
    }
  }

  if (checkPlaceholders) {
    checkNoFalsePlaceholders(dataFile, doc);
  }
}

for (const { data: dataFile, schema: schemaFile } of FILES) {
  validateDataFile(dataFile, schemaFile, { checkBannedPhrases: true, checkPlaceholders: true });
}

for (const { data: dataFile, schema: schemaFile, optional } of PRIVATE_FILES) {
  validateDataFile(dataFile, schemaFile, { optional });
}

if (hasErrors) {
  console.error("\nValidación de datos: FALLÓ.");
  process.exit(1);
}

console.log("\nValidación de datos: OK.");
