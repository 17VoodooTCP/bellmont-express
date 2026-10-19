/* Older holds were saved with the console's own wording ("Placed on hold by
   admin"), which customers shouldn't see. Treat it as no reason given. */
const INTERNAL_HOLD_NOTE =
  /^\s*(on hold\s*[:—-]\s*)?placed on hold by admin\.?\s*$/i;

/** The hold reason fit for a customer, or '' if there isn't one. */
export function customerHoldReason(reason?: string | null): string {
  return reason && !INTERNAL_HOLD_NOTE.test(reason) ? reason.trim() : '';
}
