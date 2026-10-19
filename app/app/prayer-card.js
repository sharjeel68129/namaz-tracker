/** One prayer rectangle: name on the left, Qaza counter, then Prayed / Missed (or Logged) on the right. */
export default function PrayerCard({ prayer, log, owed, onLog, onUndo }) {
  return (
    <li className="prayer">
      <div className="prayer-name">{prayer.name}</div>
      {log && (
        <button type="button" className="link undo" onClick={onUndo}>
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
            <button type="button" className="pill prayed" onClick={() => onLog("prayed")}>
              Prayed
            </button>
            <button type="button" className="pill missed" onClick={() => onLog("missed")}>
              Missed
            </button>
          </>
        )}
      </div>
    </li>
  );
}
