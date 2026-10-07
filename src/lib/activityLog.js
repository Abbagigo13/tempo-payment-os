// Event types emitted by the app.
// Kept as constants so typos don't silently break the feed.
export const ACTIVITY_TYPES = {
  PAYMENT_CREATED: "payment_created",
  POLICY_EVALUATED: "policy_evaluated",
  PAYMENT_BLOCKED: "payment_blocked",
  STATUS_CHANGED: "status_changed",
};

/**
 * Normalize an event into a displayable shape.
 * Returns { id, type, label, detail, timestamp, tone }
 * where tone is one of: 'positive' | 'negative' | 'neutral' | 'warn'
 */
export function formatEvent(event) {
  const { type, payload } = event;

  switch (type) {
    case ACTIVITY_TYPES.PAYMENT_CREATED:
      return {
        ...base(event),
        label: "Payment created",
        detail: `${payload.recipient} — ${payload.amountFormatted}`,
        tone: "neutral",
      };

    case ACTIVITY_TYPES.POLICY_EVALUATED:
      return {
        ...base(event),
        label: "Policy evaluated",
        detail:
          payload.result === "allowed"
            ? "All policies passed"
            : payload.reason,
        tone:
          payload.result === "allowed"
            ? "positive"
            : payload.result === "approval"
            ? "warn"
            : "negative",
      };

    case ACTIVITY_TYPES.PAYMENT_BLOCKED:
      return {
        ...base(event),
        label: "Payment blocked",
        detail: payload.reason,
        tone: "negative",
      };

    case ACTIVITY_TYPES.STATUS_CHANGED:
      return {
        ...base(event),
        label: "Status changed",
        detail: `${payload.id}: ${payload.from} → ${payload.to}`,
        tone: payload.to === "Completed" ? "positive" : "neutral",
      };

    default:
      return {
        ...base(event),
        label: "Event",
        detail: JSON.stringify(payload),
        tone: "neutral",
      };
  }
}

function base(event) {
  return {
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
  };
}