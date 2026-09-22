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

// F-20: fuente de la terminal decorativa del hero (`$ cat now.txt`).
// data/now.yaml es independiente de idioma (se presenta como código, no
// como copy) — un solo archivo para /es y /, sin parámetro lang, a
// diferencia de loadCv().
export function loadNow() {
  const file = path.join(dataDir, "now.yaml");
  return load(fs.readFileSync(file, "utf-8"));
}

// Algunos campos de data/cv.*.yaml todavía llevan una nota "TODO:" o
// "<<PREGUNTA" incrustada en el propio string (no sólo `null`), porque son
// pendientes de confirmación de Diego que se dejaron documentados ahí mismo.
// Eso es correcto para quien lee el YAML, pero nunca puede llegar a HTML
// público: es una nota interna, no contenido para un recruiter.
//
// Sensible a mayúsculas A PROPÓSITO — no le agregues la bandera `i`. Los
// marcadores siempre se escriben en caja alta ("TODO", "<<PREGUNTA"); la
// prosa no. Con `i` este patrón atrapaba "todo" como palabra suelta del
// español ("si todo sale bien", "todos los días", "todavía") y borraba en
// silencio contenido real — pasó con person.summary en ES y tumbó la
// sección "Sobre mí" completa sin ningún error visible (T-E). `\bTODO\b`
// (límites de palabra, mayúsculas exactas) seguía atrapando el marcador
// real sin tocar la prosa.
const PLACEHOLDER_RE = /\bTODO\b|<<PREGUNTA/;

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

// El estilo plegado (`>-`) de YAML es parte del contrato con esta función,
// no un detalle de formato: al plegar, YAML une cada línea de un mismo
// párrafo con un espacio y convierte la línea en blanco entre párrafos en
// un único "\n" dentro del string resultante. Por eso separar por
// `/\n+/` alcanza para recuperar los párrafos tal como se escribieron.
// Si algún campo pasara a estilo literal (`|`), cada línea del wrap se
// convertiría en un párrafo propio — sería un cambio de contrato, no algo
// que este código deba absorber en silencio.
/** @param {unknown} value */
export function splitParagraphs(value) {
  if (typeof value !== "string") return [];
  return value
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}
