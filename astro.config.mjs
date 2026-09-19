// Configuracion de Astro para dchiquiar.github.io.
//
// Decisiones fijadas por ADR:
// - ADR-0001: repo `dchiquiar.github.io` -> el sitio vive en la RAIZ del
//   dominio. Por eso no hay `base` configurado: agregar uno rompería todos
//   los links y assets en producción.
// - ADR-0003: inglés por defecto sin prefijo (`/`), español bajo `/es`.
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://dchiquiar.github.io",
  // Sin `base`: este repo es `<usuario>.github.io`, se sirve en la raíz.
  trailingSlash: "ignore",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es"],
    routing: {
      // false => el locale por defecto (en) NO lleva prefijo de ruta.
      // "/" es inglés, "/es/..." es español.
      prefixDefaultLocale: false,
    },
  },
});
