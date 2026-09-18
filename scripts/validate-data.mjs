#!/usr/bin/env node
// Valida data/*.yaml (capa pública) contra su JSON Schema en data/schemas/,
// y si existe la capa privada (data/private/, gitignored — no está presente
// en CI) también la valida contra su propio schema. Además bloquea frases
// marcadas como no verificadas para que no puedan reaparecer en los datos
// del CV.
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
// BANNED_PHRASES. Si `optional` y el archivo no existe, no hace nada (no es
// un error: es el caso esperado de la capa privada en CI).
function validateDataFile(dataFile, schemaFile, { optional = false, checkBannedPhrases = false } = {}) {
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
}

for (const { data: dataFile, schema: schemaFile } of FILES) {
  validateDataFile(dataFile, schemaFile, { checkBannedPhrases: true });
}

for (const { data: dataFile, schema: schemaFile, optional } of PRIVATE_FILES) {
  validateDataFile(dataFile, schemaFile, { optional });
}

if (hasErrors) {
  console.error("\nValidación de datos: FALLÓ.");
  process.exit(1);
}

console.log("\nValidación de datos: OK.");
