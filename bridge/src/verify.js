// Verify MogulOS bridge credentials + that every routed location resolves.
// Run: npm run verify   (from the bridge/ folder)

import { readFileSync } from "node:fs";
import "dotenv/config";
import { MogulosClient } from "./mogulos.js";

function loadRoutes() {
  const path = process.env.ROUTING_MAP || "./routing.json";
  try {
    return JSON.parse(readFileSync(path, "utf8")).routes || {};
  } catch {
    return {};
  }
}

async function main() {
  const problems = [];
  const ok = (m) => console.log(`  ✓ ${m}`);
  const bad = (m) => { console.log(`  ✗ ${m}`); problems.push(m); };

  console.log("\nVerifying MogulOS (bridge) credentials...\n");

  if (!process.env.BRIDGE_SECRET) bad("BRIDGE_SECRET is not set (webhook auth would be open/blocked)");
  const token = process.env.MOGULOS_PIT_TOKEN;
  if (!token) bad("MOGULOS_PIT_TOKEN is not set in .env");

  const routes = loadRoutes();
  const targets = [];
  if (process.env.DEFAULT_LOCATION_ID) targets.push(["DEFAULT_LOCATION_ID", process.env.DEFAULT_LOCATION_ID]);
  for (const [route, id] of Object.entries(routes)) targets.push([`route "${route}"`, id]);

  if (!targets.length) bad("No locations to check — set DEFAULT_LOCATION_ID or fill routing.json");
  if (!token || !targets.length) return finish(problems);

  const client = new MogulosClient({
    token,
    base: process.env.GHL_API_BASE,
    version: process.env.GHL_API_VERSION,
  });

  let tokenReported = false;
  for (const [label, id] of targets) {
    try {
      const name = await client.getLocationName(id);
      if (!tokenReported) { ok("Token accepted by MogulOS API"); tokenReported = true; }
      ok(`${label} → "${name}" (${id})`);
    } catch (err) {
      if (err.status === 401) bad(`Token rejected (401) — check MOGULOS_PIT_TOKEN`);
      else bad(`${label} id "${id}" did not resolve (HTTP ${err.status || "?"})`);
    }
  }

  finish(problems);
}

function finish(problems) {
  if (problems.length) {
    console.log(`\n✗ ${problems.length} problem(s) — fix .env / routing.json before going live.\n`);
    process.exit(1);
  }
  console.log("\n✓ All checks passed. Bridge is ready.\n");
}

main().catch((e) => { console.error(`\nUnexpected error: ${e.message}\n`); process.exit(1); });
