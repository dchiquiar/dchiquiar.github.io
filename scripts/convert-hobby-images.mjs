// Convierte fotos de la sección "Acerca de mí" (setup, perro, libros) a
// WebP y las publica en public/hobbies/. Procesa TODOS los archivos de
// imagen (jpg/jpeg/png/webp) que encuentra en la carpeta de origen,
// ordenados alfabéticamente, y les da nombre <item-id>-NN.webp.
//
// Uso:
//   node scripts/convert-hobby-images.mjs <item-id> <carpeta-de-originales>
// o con variables de entorno:
//   HOBBY_ITEM_ID=<item-id> SCREENSHOTS_DIR=<carpeta-de-originales> \
//     node scripts/convert-hobby-images.mjs
//
// <item-id> tiene que coincidir con el `id` del item en data/hobbies.yaml
// (ej. "setup", "perro", "libros"): así el nombre de archivo de salida
// queda asociado a su item. La carpeta de originales es local a cada
// máquina y no se commitea, por eso no está hardcodeada acá (mismo motivo
// que en convert-project-images.mjs).
//
// CRITERIO DE COMPRESIÓN — a propósito DISTINTO del de
// convert-project-images.mjs, no un descuido a "unificar" más adelante:
// ese script usa kernel "nearest" + WebP lossless porque esas capturas son
// pixel art reducido a exactamente la mitad (cada píxel de salida sale de
// uno solo de entrada), y un kernel que interpola degradaría bordes duros
// que tienen que quedar nítidos. Estas imágenes son FOTOGRAFÍAS (setup,
// perro, libros): no tienen ese problema. Acá se aplica el mismo criterio
// que ya usa convert-portrait.mjs para la foto del hero — kernel
// "lanczos3" (el default de sharp, pensado para fotos) y WebP CON
// pérdida: una foto tolera la pérdida perceptualmente y así es como se
// llega a un peso razonable. Aplicar "nearest" + lossless acá daría
// archivos más pesados sin ninguna ganancia de calidad.
//
// OUT_WIDTH sale de una MEDICIÓN del layout real (frontend, componente
// HobbiesSection ya construido), no de una estimación: el marco de cada
// imagen es `clamp(13rem, 30vw, 20rem)`, o sea que nunca renderiza a más
// de 320px CSS de ancho. 800px es 2.5x ese máximo — cubre pantallas de
// alta densidad (2x) con margen, sin llegar a servir 4x de más como
// pasaba con el valor anterior (1600px, puesto antes de que el
// componente existiera y de que hubiera algo contra qué calibrar). Si el
// marco de la imagen cambia, este número hay que volver a calibrarlo
// contra la medida nueva, no subirlo "por las dudas".
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const OUT_WIDTH = 800;
const QUALITY = 80; // mismo criterio que convert-portrait.mjs: las fotos toleran pérdida perceptualmente.

const itemId = process.argv[2] ?? process.env.HOBBY_ITEM_ID;
const srcDir = process.argv[3] ?? process.env.SCREENSHOTS_DIR;

if (!itemId || !srcDir) {
  console.error(
    "Faltan argumentos. Uso:\n" +
      "  node scripts/convert-hobby-images.mjs <item-id> <carpeta-de-originales>\n" +
      "o con variables de entorno:\n" +
      "  HOBBY_ITEM_ID=<item-id> SCREENSHOTS_DIR=<carpeta-de-originales> node scripts/convert-hobby-images.mjs"
  );
  process.exit(1);
}

const DEST_DIR = new URL("../public/hobbies/", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1"
);
// public/hobbies/ no existe hasta la primera corrida: a diferencia de
// public/projects/, que ya estaba creado a mano cuando se escribió
// convert-project-images.mjs, acá nadie lo había creado todavía. Sin este
// mkdirSync, sharp falla con "system error: No such file or directory" al
// intentar escribir el primer archivo.
mkdirSync(DEST_DIR, { recursive: true });

const files = readdirSync(srcDir)
  .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
  .sort();

if (files.length === 0) {
  console.error(`No se encontraron imágenes (${[...IMAGE_EXTENSIONS].join(", ")}) en ${srcDir}`);
  process.exit(1);
}

for (const [i, file] of files.entries()) {
  const srcPath = path.join(srcDir, file);
  const destName = `${itemId}-${String(i + 1).padStart(2, "0")}.webp`;
  const destPath = path.join(DEST_DIR, destName);

  const info = await sharp(srcPath)
    .resize(OUT_WIDTH, null, { kernel: "lanczos3", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(destPath);

  console.log(
    `${file} -> ${destName}: ${info.width}x${info.height}, ${info.size} bytes ` +
      `— pegar en data/hobbies.yaml: src: "/hobbies/${destName}", width: ${info.width}, height: ${info.height}`
  );
}
