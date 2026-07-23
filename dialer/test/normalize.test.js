// Run: node --test   (from the dialer/ folder)
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, detectColumns, cleanRecords, loadSuppression } from "../src/normalize.js";

test("normalizePhone: US formats -> E.164", () => {
  assert.equal(normalizePhone("(419) 555-0142").e164, "+14195550142");
  assert.equal(normalizePhone("419.555.0142").e164, "+14195550142");
  assert.equal(normalizePhone("1-419-555-0142").e164, "+14195550142");
  assert.equal(normalizePhone("+1 419 555 0142").e164, "+14195550142");
});

test("normalizePhone: rejects junk and bad NANP", () => {
  assert.equal(normalizePhone("123").valid, false);
  assert.equal(normalizePhone("").valid, false);
  assert.equal(normalizePhone(null).valid, false);
  // area/exchange code starting with 0 or 1 is invalid NANP
  assert.equal(normalizePhone("119-555-0142").valid, false);
});

test("normalizePhone: keeps plausible international", () => {
  const r = normalizePhone("+44 20 7946 0958");
  assert.equal(r.valid, true);
  assert.equal(r.e164, "+442079460958");
});

test("detectColumns: maps harvest + common headers", () => {
  const map = detectColumns(["business_name", "Phone", "zip", "category", "priority", "Email"]);
  assert.equal(map.business, "business_name");
  assert.equal(map.phone, "Phone");
  assert.equal(map.zip, "zip");
  assert.equal(map.category, "category");
  assert.equal(map.priority, "priority");
  assert.equal(map.email, "Email");
});

test("cleanRecords: dedupes, drops invalid, applies suppression", () => {
  const columnMap = { phone: "phone", business: "business" };
  const records = [
    { phone: "(419) 555-0142", business: "A" },
    { phone: "14195550142", business: "A dup" }, // same number -> dup
    { phone: "123", business: "bad" },
    { phone: "419-555-0177", business: "B" },
  ];
  const suppress = loadSuppression(["4195550177"]);
  const { rows, report } = cleanRecords(records, { columnMap, suppress });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].phone, "+14195550142");
  assert.equal(report.duplicates, 1);
  assert.equal(report.invalidPhone, 1);
  assert.equal(report.suppressed, 1);
});

test("cleanRecords: priority + category filters (harvest schema)", () => {
  const columnMap = { phone: "phone", business: "business", category: "category", priority: "priority" };
  const records = [
    { phone: "419-555-0142", business: "Plumb", category: "plumber", priority: "A" },
    { phone: "419-555-0143", business: "Nails", category: "nail salon", priority: "D" },
    { phone: "419-555-0144", business: "HVAC", category: "hvac", priority: "C" },
  ];
  const { rows, report } = cleanRecords(records, {
    columnMap,
    minPriority: "B",
    categories: ["plumber", "hvac"],
  });
  // D (nail salon) filtered by priority; C (hvac) filtered by priority; only A plumber remains
  assert.equal(rows.length, 1);
  assert.equal(rows[0].business, "Plumb");
  assert.equal(report.filteredPriority, 2);
});
