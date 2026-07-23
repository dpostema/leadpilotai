// Fire a sample call-result payload at the running bridge, to confirm it
// parses/routes correctly before a real call.
// Run: npm run send-test              (uses samples/call-completed.json)
//      npm run send-test path.json    (custom payload)

import { readFileSync } from "node:fs";
import "dotenv/config";

const file = process.argv[2] || "./samples/call-completed.json";
const port = process.env.PORT || 4000;
const secret = process.env.BRIDGE_SECRET || "";
const url = `http://127.0.0.1:${port}/webhook/centerfy`;

const body = readFileSync(file, "utf8");

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-bridge-secret": secret },
  body,
});
const text = await res.text();
console.log(`POST ${url}\nHTTP ${res.status}\n${text}`);
if (!res.ok) process.exit(1);
