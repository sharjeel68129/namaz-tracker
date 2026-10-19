// The Islamic (Hijri) date shown beside Today. Browsers know the Saudi Umm al-Qura calendar;
// Hong Kong's moon-sighting committee has been starting months one day later (Ramadan 2026
// began 18 Feb in Saudi Arabia and 19 Feb in Hong Kong; Eid al-Fitr 2025 was 30 March there
// and 31 March here), so the date shown is Umm al-Qura's for one day earlier.
const OFFSET_DAYS = -1;

const format = new Intl.DateTimeFormat("en-GB-u-ca-islamic-umalqura", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "26 Rabiʻ II 1448 AH" for a Date. */
export function hijriDate(date) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + OFFSET_DAYS);
  return format.format(shifted);
}
