// Phone normalization + record cleaning for NANP (US/CA) B2B lists.
// Keeps dependencies to zero so it is trivial to reason about and test.

const DIGITS = /\D+/g;

/**
 * Normalize a phone number to E.164 for the North American Numbering Plan.
 * Returns { e164, valid, reason }.
 */
export function normalizePhone(raw, defaultCountry = "US") {
  if (raw == null) return { e164: "", valid: false, reason: "empty" };

  let s = String(raw).trim();
  if (!s) return { e164: "", valid: false, reason: "empty" };

  // Preserve an explicit international prefix; otherwise treat as NANP.
  const hadPlus = s.startsWith("+");
  let digits = s.replace(DIGITS, "");

  if (hadPlus && !digits.startsWith("1")) {
    // Non-NANP international number: accept as-is if plausible length.
    if (digits.length >= 8 && digits.length <= 15) {
      return { e164: "+" + digits, valid: true, reason: "intl" };
    }
    return { e164: "", valid: false, reason: "intl-bad-length" };
  }

  // Strip a leading NANP country code.
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) {
    return { e164: "", valid: false, reason: `length-${digits.length}` };
  }

  // NANP rules: area code and exchange code both start with 2-9.
  const areaFirst = digits[0];
  const exchFirst = digits[3];
  if (areaFirst < "2" || exchFirst < "2") {
    return { e164: "", valid: false, reason: "nanp-invalid" };
  }

  void defaultCountry; // reserved for future multi-country support
  return { e164: "+1" + digits, valid: true, reason: "nanp" };
}

// Common header spellings we auto-detect when the caller does not map columns.
const FIELD_ALIASES = {
  phone: ["phone", "phone number", "phonenumber", "mobile", "tel", "telephone", "number", "cell"],
  business: ["business", "business name", "company", "company name", "name", "account", "organization"],
  firstName: ["first name", "firstname", "first", "contact first name", "owner first name"],
  lastName: ["last name", "lastname", "last", "contact last name", "owner last name"],
  email: ["email", "e-mail", "email address"],
  city: ["city", "town"],
  state: ["state", "province", "region"],
  website: ["website", "url", "site", "web"],
};

/** Build a header -> canonical-field map from the CSV's header row. */
export function detectColumns(headers) {
  const lower = headers.map((h) => String(h).trim().toLowerCase());
  const map = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const idx = lower.findIndex((h) => aliases.includes(h));
    if (idx !== -1) map[field] = headers[idx];
  }
  return map;
}

/**
 * Clean a parsed list of row-objects.
 * Returns { rows, report } where rows are normalized keeper records.
 */
export function cleanRecords(records, { columnMap, defaultCountry = "US", suppress = new Set() } = {}) {
  const report = { total: records.length, kept: 0, invalidPhone: 0, duplicates: 0, suppressed: 0 };
  const seen = new Set();
  const rows = [];

  for (const rec of records) {
    const rawPhone = columnMap.phone ? rec[columnMap.phone] : "";
    const { e164, valid, reason } = normalizePhone(rawPhone, defaultCountry);

    if (!valid) {
      report.invalidPhone++;
      continue;
    }
    if (suppress.has(e164)) {
      report.suppressed++;
      continue;
    }
    if (seen.has(e164)) {
      report.duplicates++;
      continue;
    }
    seen.add(e164);

    rows.push({
      phone: e164,
      business: columnMap.business ? String(rec[columnMap.business] || "").trim() : "",
      firstName: columnMap.firstName ? String(rec[columnMap.firstName] || "").trim() : "",
      lastName: columnMap.lastName ? String(rec[columnMap.lastName] || "").trim() : "",
      email: columnMap.email ? String(rec[columnMap.email] || "").trim() : "",
      city: columnMap.city ? String(rec[columnMap.city] || "").trim() : "",
      state: columnMap.state ? String(rec[columnMap.state] || "").trim() : "",
      website: columnMap.website ? String(rec[columnMap.website] || "").trim() : "",
      _phoneReason: reason,
    });
    report.kept++;
  }

  return { rows, report };
}

/** Load a suppression list (one phone per line) into a Set of E.164 numbers. */
export function loadSuppression(lines, defaultCountry = "US") {
  const set = new Set();
  for (const line of lines) {
    const { e164, valid } = normalizePhone(line, defaultCountry);
    if (valid) set.add(e164);
  }
  return set;
}
