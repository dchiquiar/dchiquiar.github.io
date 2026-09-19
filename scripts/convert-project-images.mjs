// Convierte capturas de proyectos a WebP 1280x720 y las publica en public/projects/.
// Correr con: node scripts/convert-project-images.mjs <carpeta-de-originales>
// o con la variable de entorno SCREENSHOTS_DIR=<carpeta-de-originales> en vez
// del argumento. La carpeta de originales es local a cada máquina y no se
// commitea, por eso no está hardcodeada acá.
//
// kernel "nearest" + WebP lossless: es pixel art reducido a exactamente la
// mitad (2560->1280), así que cada píxel de salida sale de uno solo de
// entrada. Con un kernel que interpola (lanczos3, el default) los colores
// planos del pixel art se degradan a gradientes, se ve más blando Y pesa más
// (WebP comprime peor un degradado que un color plano). No lo cambies a
// lanczos/lossy sin volver a medir.
import sharp from "sharp";
import path from "node:path";

const SRC_DIR = process.argv[2] ?? process.env.SCREENSHOTS_DIR;
if (!SRC_DIR) {
  console.error(
    "Falta la carpeta de originales. Uso:\n" +
      "  node scripts/convert-project-images.mjs <carpeta-de-originales>\n" +
      "o con variable de entorno:\n" +
      "  SCREENSHOTS_DIR=<carpeta-de-originales> node scripts/convert-project-images.mjs"
  );
  process.exit(1);
}

const DEST_DIR = new URL("../public/projects/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const files = [
  { src: "02-multiplayer.png", dest: "urgentum-multiplayer.webp" },
  { src: "06-systems.png", dest: "urgentum-systems.webp" },
  { src: "01-hero.png", dest: "urgentum-hero.webp" },
];

for (const { src, dest } of files) {
  const srcPath = path.join(SRC_DIR, src);
  const destPath = path.join(DEST_DIR, dest);
  const info = await sharp(srcPath)
    .resize(1280, 720, { kernel: "nearest" })
    .webp({ lossless: true, effort: 6 })
    .toFile(destPath);
  console.log(`${src} -> ${dest}: ${info.width}x${info.height}, ${info.size} bytes`);
}
