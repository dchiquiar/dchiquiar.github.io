// Marcado mínimo para la copy de data/home.yaml: [texto] resalta en color de
// acento y {texto} lo encierra en un círculo dibujado a mano. Escapa todo lo
// demás: la copy viene de YAML, nunca se confía como HTML.
const escape = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const CIRCLE =
  '<svg class="circled__ring" viewBox="0 0 120 50" preserveAspectRatio="none" aria-hidden="true">' +
  '<path pathLength="1" d="M70 4 C 30 2, 4 12, 6 27 C 8 42, 50 48, 84 44 C 112 40, 118 26, 110 15 C 100 4, 64 3, 40 8"/></svg>';

/** @param {string} text */
export function richText(text) {
  return escape(text)
    .replace(/\[([^\]]+)\]/g, '<span class="hl">$1</span>')
    .replace(/\{([^}]+)\}/g, `<span class="circled" data-circled>$1${CIRCLE}</span>`);
}
