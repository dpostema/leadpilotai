// Minimal GHL API v2 (LeadConnector) client — works against any white-label
// GHL instance, including Centerfy, using a Private Integration Token.

export class GhlClient {
  constructor({ token, locationId, base, version }) {
    if (!token) throw new Error("Missing CENTERFY_PIT_TOKEN");
    if (!locationId) throw new Error("Missing CENTERFY_LOCATION_ID");
    this.token = token;
    this.locationId = locationId;
    this.base = (base || "https://services.leadconnectorhq.com").replace(/\/$/, "");
    this.version = version || "2021-07-28";
  }

  get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Version: this.version,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async #request(method, path, body) {
    const res = await fetch(this.base + path, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    return { ok: res.ok, status: res.status, data };
  }

  /**
   * Upsert a contact into the location. GHL dedupes by phone/email within a
   * location, so re-running is safe. Returns { contactId, isNew, status, data }.
   */
  async upsertContact(rec, { source = "LeadPilot Dialer", tags = [] } = {}) {
    const body = {
      locationId: this.locationId,
      phone: rec.phone,
      source,
      tags,
    };
    if (rec.firstName) body.firstName = rec.firstName;
    if (rec.lastName) body.lastName = rec.lastName;
    if (rec.business) body.companyName = rec.business;
    if (rec.email) body.email = rec.email;
    if (rec.city) body.city = rec.city;
    if (rec.state) body.state = rec.state;
    if (rec.website) body.website = rec.website;

    const { ok, status, data } = await this.#request("POST", "/contacts/upsert", body);
    const contact = data.contact || data;
    return {
      ok,
      status,
      contactId: contact?.id || null,
      isNew: data?.new ?? null,
      data,
    };
  }

  /** Enroll a contact in a workflow (the outbound calling campaign). */
  async addToWorkflow(contactId, workflowId) {
    return this.#request("POST", `/contacts/${contactId}/workflow/${workflowId}`, {});
  }
}

/** Small helper: run async tasks with limited concurrency + a per-task delay. */
export async function runLimited(items, worker, { concurrency = 3, delayMs = 120 } = {}) {
  const results = new Array(items.length);
  let cursor = 0;

  async function lane() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
  return results;
}
