// Convierte el retrato del hero a WebP y lo publica en public/images/.
// Correr con: node scripts/convert-portrait.mjs <ruta-del-original>
//
// Script separado de convert-project-images.mjs a propósito, no un modo
// nuevo del mismo archivo: ese script está afinado para pixel art
// (kernel "nearest" + WebP lossless) y aplicarlo a una fotografía daría un
// archivo enorme sin ninguna ganancia de calidad (una foto no tiene los
// bordes duros de un sprite, así que "nearest" no protege nada que
// "lanczos3" ya no resuelva mejor). Acá es al revés: lanczos3 (el default
// de sharp, pensado para fotos) y compresión CON pérdida, calidad 80 —
// una foto tolera la pérdida perceptualmente y así es como se llega a un
// peso razonable (<60 KB) para una imagen que se muestra a ~220-300px de
// ancho en el hero.
//
// El recorte (left/top/width/height) es fijo para ESTE retrato (F-9, la
// segunda foto: retrato frontal, expresión neutra, misma pared blanca
// pero con más pared a los costados que la primera), no un recorte
// automático de rostro: se ajustó a mano mirando el original
// (1932x2576) para dejar cara y hombros, con el mínimo de pared blanca
// alrededor, misma proporción aproximada que la foto anterior
// (ancho/alto del recorte ≈0.579 en las dos) — el motivo no es sólo
// estético: menos pared blanca alrededor es lo que hace que el ajuste
// de brillo en tema oscuro (ver `.hero__media img` en global.css)
// alcance para evitar el efecto "bloque brillante" que señala
// dark-mode.md de la skill apple-design. Si el día de mañana se
// reemplaza la foto otra vez, este recorte hay que rehacerlo a mano
// mirando la nueva, no reutilizar estos números.
import sharp from "sharp";

const SRC = process.argv[2];
if (!SRC) {
  console.error(
    "Falta la ruta del original.\nUso: node scripts/convert-portrait.mjs <ruta-del-original>"
  );
  process.exit(1);
}

const DEST = new URL("../public/images/diego-portrait.webp", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1"
);

const CROP = { left: 336, top: 0, width: 1229, height: 2123 };
// 520px, no 560 (F-9): esta foto tiene más detalle/nitidez que la
// anterior y a 560px/calidad 80 daba 62.1 KB, por ENCIMA del techo de
// 60 KB. A calidad 80 (la pedida, sin bajarla) 520px da 55.2 KB, con
// margen real. Sigue siendo ~2x del ancho de despliegue real
// (220-300px).
const OUT_WIDTH = 520;

const info = await sharp(SRC)
  .extract(CROP)
  .resize(OUT_WIDTH, null, { kernel: "lanczos3" })
  .webp({ quality: 80 })
  .toFile(DEST);

console.log(`${SRC} -> ${DEST}: ${info.width}x${info.height}, ${info.size} bytes`);
