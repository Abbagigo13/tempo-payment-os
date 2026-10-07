import { Activity, Trash2 } from "lucide-react";
import { formatEvent } from "../lib/activityLog";
import { formatDate } from "../lib/formatters";

export default function ActivityPanel({ events, onClear }) {
  return (
    <div className="panel activity-panel">
      <div className="activity-header">
        <div className="panel-title">
          <div className="panel-title-icon">
            <Activity size={17} />
          </div>
          <div>
            <h3>Activity</h3>
            <p>
              Local event log. Recorded in memory only — cleared on reload.
            </p>
          </div>
        </div>
        {events.length > 0 && (
          <button
            className="text-button"
            onClick={onClear}
            title="Clear local activity"
          >
            <Trash2 size={14} />
            Clear
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <p className="muted-text" style={{ padding: "0 18px 18px" }}>
          No activity yet. Create or simulate a payment to see events here.
        </p>
      ) : (
        <ul className="activity-list">
          {events.slice(0, 25).map((event) => {
            const display = formatEvent(event);
            return (
              <li key={display.id} className={`activity-item ${display.tone}`}>
                <span className={`activity-dot ${display.tone}`} />
                <div>
                  <div className="activity-row">
                    <strong>{display.label}</strong>
                    <time>{formatDate(display.timestamp)}</time>
                  </div>
                  <p>{display.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}