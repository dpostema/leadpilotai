// GHL API v2 (LeadConnector) client for writing results back into MogulOS.

export class MogulosClient {
  constructor({ token, base, version }) {
    if (!token) throw new Error("Missing MOGULOS_PIT_TOKEN");
    this.token = token;
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
    if (!res.ok) {
      const err = new Error(`GHL ${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /** Upsert a contact into a MogulOS location; returns the contact id. */
  async upsertContact(locationId, contact) {
    const body = { locationId };
    if (contact.phone) body.phone = contact.phone;
    if (contact.email) body.email = contact.email;
    if (contact.firstName) body.firstName = contact.firstName;
    if (contact.lastName) body.lastName = contact.lastName;
    if (contact.business) body.companyName = contact.business;
    body.source = contact.source || "LeadPilot Dialer (Centerfy)";
    if (contact.tags?.length) body.tags = contact.tags;

    const data = await this.#request("POST", "/contacts/upsert", body);
    return (data.contact || data)?.id || null;
  }

  /** Attach a note (call summary / transcript / outcome) to a contact. */
  async addNote(contactId, bodyText) {
    return this.#request("POST", `/contacts/${contactId}/notes`, { body: bodyText });
  }

  /** Look up a location (sub-account) by id — used by `verify`. Returns its name. */
  async getLocationName(locationId) {
    const data = await this.#request("GET", `/locations/${locationId}`);
    return data?.location?.name || data?.name || "(unnamed)";
  }

  /** Best-effort appointment creation (requires calendarId in the payload). */
  async createAppointment(locationId, contactId, appt) {
    const body = {
      locationId,
      contactId,
      calendarId: appt.calendarId,
      startTime: appt.startTime,
      title: appt.title || "LeadPilot AI booking",
    };
    if (appt.endTime) body.endTime = appt.endTime;
    return this.#request("POST", "/calendars/events/appointments", body);
  }
}
