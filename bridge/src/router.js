// Normalize an incoming Centerfy webhook and format the note we write to MogulOS.

/**
 * Resolve the target MogulOS location from the payload's `route`,
 * falling back to DEFAULT_LOCATION_ID.
 */
export function resolveLocation(payload, routes, defaultLocationId) {
  const route = (payload.route || payload.tag || "").trim();
  if (route && routes[route]) return { locationId: routes[route], route };
  return { locationId: defaultLocationId || null, route: route || "(default)" };
}

/** Pull a normalized contact object out of a loose payload. */
export function extractContact(payload) {
  const c = payload.contact || {};
  return {
    phone: c.phone || payload.phone || "",
    email: c.email || payload.email || "",
    firstName: c.firstName || c.first_name || "",
    lastName: c.lastName || c.last_name || "",
    business: c.business || c.companyName || c.company || "",
  };
}

/** Build a human-readable note body from the call result.
 *  Tolerates both our clean shape and GHL's native snake_case field names. */
export function formatNote(payload) {
  const call = payload.call || {};
  const recording = call.recordingUrl || call.recording_url || "";
  const lines = ["📞 Gimmeleads (Centerfy) call result"];
  if (payload.event) lines.push(`Event: ${payload.event}`);
  if (call.status) lines.push(`Status: ${call.status}`);
  if (call.disposition) lines.push(`Disposition: ${call.disposition}`);
  if (call.duration) lines.push(`Duration: ${call.duration}s`);
  if (call.summary) lines.push(`\nSummary:\n${call.summary}`);
  if (call.transcript) lines.push(`\nTranscript:\n${call.transcript}`);
  if (recording) lines.push(`\nRecording: ${recording}`);
  return lines.join("\n");
}

/** Does this payload represent a booked appointment we should create? */
export function hasAppointment(payload) {
  const a = payload.appointment;
  return Boolean(a && a.startTime && a.calendarId);
}
