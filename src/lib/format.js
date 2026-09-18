// Formateo de fechas "AAAA-MM" (formato de data/cv.*.yaml) a texto legible,
// sin sumar una dependencia de i18n de fechas para esto.
const MONTHS = {
  en: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
  es: [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ],
};

/**
 * @param {string|null} yyyyMm
 * @param {"en"|"es"} lang
 */
function formatMonth(yyyyMm, lang) {
  const [year, month] = yyyyMm.split("-");
  const name = MONTHS[lang][Number(month) - 1];
  return `${name} ${year}`;
}

/**
 * @param {{ startDate: string, endDate: string|null, current: boolean }} range
 * @param {"en"|"es"} lang
 */
export function formatDateRange({ startDate, endDate, current }, lang) {
  const start = formatMonth(startDate, lang);
  if (current && !endDate) {
    return `${start} — ${lang === "es" ? "actualidad" : "present"}`;
  }
  if (!endDate) return start;
  return `${start} — ${formatMonth(endDate, lang)}`;
}
