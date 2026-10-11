import { keyToDate } from "@/lib/days";

const LEVELS = [5, 4, 3, 2, 1, 0];

function label(cell) {
  const date = keyToDate(cell.day).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return cell.level === null ? `${date}: nothing logged` : `${date}: ${cell.level} of 5 prayed`;
}

/**
 * Contribution chart: one square per day. `calendar` lays the days out in weeks (Monday first)
 * for a single month; otherwise they run in one strip.
 */
export default function Chart({ cells, calendar = false, legend = false }) {
  const offset = calendar && cells.length ? (keyToDate(cells[0].day).getDay() + 6) % 7 : 0;
  return (
    <>
      <ol className={`chart ${calendar ? "chart-calendar" : "chart-strip"}`}>
        {Array.from({ length: offset }, (_, i) => (
          <li key={i} className="cell blank" aria-hidden="true" />
        ))}
        {cells.map((cell, i) => (
          // --i is the square's position, used by the landing page to fill the month in one day at a time.
          <li key={cell.day} className={`cell ${cell.level === null ? "" : `l${cell.level}`}`} style={{ "--i": i }} title={label(cell)}>
            <span className="sr-only">{label(cell)}</span>
          </li>
        ))}
      </ol>
      {legend && (
        <ul className="legend" aria-label="Prayers prayed that day">
          {LEVELS.map((level) => (
            <li key={level}>
              <span className={`cell l${level}`} aria-hidden="true" />
              {level}
            </li>
          ))}
          <li>
            <span className="cell" aria-hidden="true" />
            No data
          </li>
        </ul>
      )}
    </>
  );
}
