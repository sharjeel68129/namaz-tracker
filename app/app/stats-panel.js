import { PRAYERS } from "@/lib/days";

/** The one statistics block used everywhere: last 30 days, a single month, and since sign-up. */
export default function StatsPanel({ stats }) {
  return (
    <div className="stats">
      <dl className="figures">
        <div>
          <dt>Perfect days</dt>
          <dd>{stats.perfectDays}</dd>
        </div>
        <div>
          <dt>Prayers missed</dt>
          <dd>{stats.missed}</dd>
        </div>
        <div>
          <dt>Qaza prayed</dt>
          <dd>{stats.qazaPrayed}</dd>
        </div>
        <div>
          <dt>Prayed on time</dt>
          <dd>{stats.onTime === null ? "–" : `${stats.onTime}%`}</dd>
        </div>
      </dl>
      <table className="breakdown">
        <thead>
          <tr>
            <th scope="col">Prayer</th>
            <th scope="col">Prayed</th>
            <th scope="col">Missed</th>
            <th scope="col">Qaza</th>
          </tr>
        </thead>
        <tbody>
          {PRAYERS.map((prayer) => (
            <tr key={prayer.id}>
              <th scope="row">{prayer.name}</th>
              <td>{stats.perPrayer[prayer.id].prayed}</td>
              <td>{stats.perPrayer[prayer.id].missed}</td>
              <td>{stats.perPrayer[prayer.id].qaza}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
