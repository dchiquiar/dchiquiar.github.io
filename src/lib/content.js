// Lectura de datos del CV/proyectos desde data/*.yaml.
//
// process.cwd(), no import.meta.url: Vite reubica el frontmatter compilado
// a una profundidad de carpetas distinta a la del código fuente, así que una
// ruta relativa anclada al módulo se rompe en `astro build` (mismo problema
// resuelto de la misma forma en src/pages/index.astro).
import fs from "node:fs";
import path from "node:path";
import { load } from "js-yaml";

const dataDir = path.resolve(process.cwd(), "data");

/** @param {"en"|"es"} lang */
export function loadCv(lang) {
  const file = path.join(dataDir, `cv.${lang}.yaml`);
  return load(fs.readFileSync(file, "utf-8"));
}

export function loadProjects() {
  const file = path.join(dataDir, "proyectos.yaml");
  const parsed = load(fs.readFileSync(file, "utf-8"));
  return parsed?.projects ?? [];
}

// Algunos campos de data/cv.*.yaml todavía llevan una nota "TODO:" o
// "<<PREGUNTA" incrustada en el propio string (no sólo `null`), porque son
// pendientes de confirmación de Diego que se dejaron documentados ahí mismo.
// Eso es correcto para quien lee el YAML, pero nunca puede llegar a HTML
// público: es una nota interna, no contenido para un recruiter.
const PLACEHOLDER_RE = /TODO|<<PREGUNTA/i;

/** @param {unknown} value */
export function isPlaceholder(value) {
  return typeof value === "string" && PLACEHOLDER_RE.test(value);
}

/** Devuelve el valor, o null si es un placeholder sin confirmar. */
export function cleanField(value) {
  return isPlaceholder(value) ? null : value;
}

/** Filtra de una lista cualquier item marcado como placeholder. */
export function cleanList(items) {
  return (items ?? []).filter((item) => !isPlaceholder(item));
}
