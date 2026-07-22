import express from "express";
import { readFileSync } from "node:fs";
import "dotenv/config";

import { MogulosClient } from "./mogulos.js";
import { resolveLocation, extractContact, formatNote, hasAppointment } from "./router.js";

const PORT = process.env.PORT || 4000;
const SECRET = process.env.BRIDGE_SECRET || "";

function loadRoutes() {
  const path = process.env.ROUTING_MAP || "./routing.json";
  try {
    const json = JSON.parse(readFileSync(path, "utf8"));
    return json.routes || {};
  } catch {
    console.warn(`[bridge] no routing map at ${path} — using DEFAULT_LOCATION_ID only`);
    return {};
  }
}

const routes = loadRoutes();
const mogulos = new MogulosClient({
  token: process.env.MOGULOS_PIT_TOKEN,
  base: process.env.GHL_API_BASE,
  version: process.env.GHL_API_VERSION,
});

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, routes: Object.keys(routes) }));

app.post("/webhook/centerfy", async (req, res) => {
  // Auth: shared secret via header (or ?token= for platforms that can't set headers).
  const provided = req.get("x-bridge-secret") || req.query.token || "";
  if (!SECRET || provided !== SECRET) {
    return res.status(401).json({ ok: false, error: "bad secret" });
  }

  const payload = req.body || {};
  const { locationId, route } = resolveLocation(payload, routes, process.env.DEFAULT_LOCATION_ID);
  if (!locationId) {
    return res.status(422).json({ ok: false, error: `no MogulOS location for route "${route}"` });
  }

  try {
    const contact = extractContact(payload);
    if (!contact.phone && !contact.email) {
      return res.status(422).json({ ok: false, error: "payload has no contact phone or email" });
    }

    const contactId = await mogulos.upsertContact(locationId, {
      ...contact,
      tags: ["leadpilot-callback", `route:${route}`],
    });

    const result = { route, locationId, contactId, note: false, appointment: false };

    await mogulos.addNote(contactId, formatNote(payload));
    result.note = true;

    if (hasAppointment(payload)) {
      try {
        await mogulos.createAppointment(locationId, contactId, payload.appointment);
        result.appointment = true;
      } catch (e) {
        result.appointmentError = e.message;
      }
    }

    console.log(`[bridge] ${route} -> ${locationId} contact ${contactId} (note=${result.note}, appt=${result.appointment})`);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error(`[bridge] error: ${err.message}`);
    return res.status(502).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[bridge] listening on :${PORT} (routes: ${Object.keys(routes).join(", ") || "none"})`);
});
