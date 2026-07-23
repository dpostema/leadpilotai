// Run: node --test   (from the bridge/ folder)
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLocation, extractContact, formatNote, hasAppointment } from "../src/router.js";

test("resolveLocation: matches route, falls back to default", () => {
  const routes = { gimmeleads: "locG", "client-acme": "locA" };
  assert.equal(resolveLocation({ route: "gimmeleads" }, routes, "def").locationId, "locG");
  assert.equal(resolveLocation({ route: "unknown" }, routes, "def").locationId, "def");
  assert.equal(resolveLocation({}, routes, "def").locationId, "def");
});

test("extractContact: reads nested + snake_case", () => {
  const c = extractContact({
    contact: { phone: "+14195550142", first_name: "Sam", company: "Acme" },
  });
  assert.equal(c.phone, "+14195550142");
  assert.equal(c.firstName, "Sam");
  assert.equal(c.business, "Acme");
});

test("formatNote: includes summary and snake_case recording_url", () => {
  const note = formatNote({
    event: "call_completed",
    call: { status: "completed", summary: "Interested", recording_url: "https://x/rec.mp3" },
  });
  assert.match(note, /Interested/);
  assert.match(note, /https:\/\/x\/rec\.mp3/);
  assert.match(note, /completed/);
});

test("hasAppointment: only when calendarId + startTime present", () => {
  assert.equal(hasAppointment({ appointment: { calendarId: "c", startTime: "t" } }), true);
  assert.equal(hasAppointment({ appointment: { startTime: "t" } }), false);
  assert.equal(hasAppointment({}), false);
});
