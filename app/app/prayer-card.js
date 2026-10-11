/** One prayer rectangle: name on the left, Qaza counter, then Prayed / Missed (or Logged) on the right. */
export default function PrayerCard({ prayer, past, log, owed, busy, onLog, onUndo }) {
  return (
    <li className="prayer" style={{ "--tint": `var(--${prayer.id})` }}>
      <div className="prayer-name">
        {prayer.name}
        {past && <small>Yesterday</small>}
      </div>
      {log && (
        <button type="button" className="link undo" disabled={busy} onClick={onUndo}>
          Undo
        </button>
      )}
      <div className="owed">
        {owed ? `-${owed}` : "0"}
        <small>Qaza</small>
      </div>
      <div className="actions">
        {log ? (
          <span className="pill logged">Logged</span>
        ) : (
          <>
            <button type="button" className="pill prayed" disabled={busy} onClick={() => onLog("prayed")}>
              Prayed
            </button>
            <button type="button" className="pill missed" disabled={busy} onClick={() => onLog("missed")}>
              Missed
            </button>
          </>
        )}
      </div>
    </li>
  );
}
