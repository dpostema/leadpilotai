#!/usr/bin/env node
// LeadPilot dialer CLI:
//   prep  — clean a raw B2B list into a dialer-ready CSV (+ a report)
//   push  — upsert cleaned contacts into Centerfy and enroll them in a campaign
//
// Usage:
//   node src/cli.js prep  --in leads.csv --out out/clean.csv [--suppress dnc.txt]
//   node src/cli.js push  --in out/clean.csv [--tag "spring-b2b"] [--dry-run]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import "dotenv/config";

import { cleanRecords, detectColumns, loadSuppression } from "./normalize.js";
import { GhlClient, runLimited } from "./ghl.js";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function ensureDir(file) {
  mkdirSync(dirname(file), { recursive: true });
}

function readCsv(file) {
  const text = readFileSync(file, "utf8");
  return parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true });
}

function cmdPrep(args) {
  const inFile = args.in || args._[0];
  const outFile = args.out || "out/clean.csv";
  if (!inFile) throw new Error("prep: --in <leads.csv> is required");

  const defaultCountry = process.env.DEFAULT_COUNTRY || "US";
  const records = readCsv(inFile);
  if (!records.length) throw new Error(`prep: no rows found in ${inFile}`);

  const headers = Object.keys(records[0]);
  const columnMap = detectColumns(headers);
  if (!columnMap.phone) {
    throw new Error(
      `prep: could not find a phone column in headers [${headers.join(", ")}]. ` +
        `Rename your phone column to "phone".`
    );
  }

  let suppress = new Set();
  if (args.suppress) {
    const lines = readFileSync(args.suppress, "utf8").split(/\r?\n/).filter(Boolean);
    suppress = loadSuppression(lines, defaultCountry);
  }

  const minPriority = args["min-priority"] ? String(args["min-priority"]) : null;
  const categories = args.category ? String(args.category).split(",") : null;

  const { rows, report } = cleanRecords(records, {
    columnMap,
    defaultCountry,
    suppress,
    minPriority,
    categories,
  });

  ensureDir(outFile);
  const outCols = [
    "phone", "business", "firstName", "lastName", "email",
    "city", "state", "website", "zip", "category", "priority",
  ];
  const csv = stringify(rows.map((r) => Object.fromEntries(outCols.map((c) => [c, r[c]]))), {
    header: true,
    columns: outCols,
  });
  writeFileSync(outFile, csv);

  console.log(`\nDetected columns: ${JSON.stringify(columnMap)}`);
  if (minPriority) console.log(`Filter: min priority = ${minPriority}`);
  if (categories) console.log(`Filter: categories = ${categories.join(", ")}`);
  console.log(`\nPrep report`);
  console.log(`  input rows       : ${report.total}`);
  console.log(`  kept (valid)     : ${report.kept}`);
  console.log(`  invalid phone    : ${report.invalidPhone}`);
  console.log(`  duplicates       : ${report.duplicates}`);
  console.log(`  suppressed (DNC) : ${report.suppressed}`);
  if (minPriority) console.log(`  filtered priority: ${report.filteredPriority}`);
  if (categories) console.log(`  filtered category: ${report.filteredCategory}`);
  console.log(`\nWrote ${rows.length} dialer-ready rows -> ${outFile}\n`);
}

async function cmdPush(args) {
  const inFile = args.in || args._[0];
  if (!inFile) throw new Error("push: --in <clean.csv> is required");

  const dryRun = Boolean(args["dry-run"]);
  const tags = ["leadpilot-dialer"];
  if (args.tag) tags.push(String(args.tag));

  const rows = readCsv(inFile);
  if (!rows.length) throw new Error(`push: no rows found in ${inFile}`);

  const workflowId = process.env.CENTERFY_WORKFLOW_ID || "";

  if (dryRun) {
    console.log(`\n[dry-run] would push ${rows.length} contacts to Centerfy`);
    console.log(`[dry-run] tags: ${tags.join(", ")}`);
    console.log(`[dry-run] workflow enrollment: ${workflowId ? workflowId : "(none — contacts only)"}`);
    console.log(`[dry-run] sample: ${JSON.stringify(rows[0])}\n`);
    return;
  }

  const client = new GhlClient({
    token: process.env.CENTERFY_PIT_TOKEN,
    locationId: process.env.CENTERFY_LOCATION_ID,
    base: process.env.GHL_API_BASE,
    version: process.env.GHL_API_VERSION,
  });

  let ok = 0;
  let failed = 0;
  let enrolled = 0;
  const failures = [];

  const results = await runLimited(
    rows,
    async (rec) => {
      const res = await client.upsertContact(rec, { tags });
      if (!res.ok || !res.contactId) {
        failed++;
        failures.push({ phone: rec.phone, status: res.status, data: res.data });
        return res;
      }
      ok++;
      if (workflowId) {
        const wf = await client.addToWorkflow(res.contactId, workflowId);
        if (wf.ok) enrolled++;
      }
      return res;
    },
    { concurrency: 3, delayMs: 150 }
  );

  console.log(`\nPush complete`);
  console.log(`  contacts upserted : ${ok}`);
  console.log(`  enrolled in wf    : ${workflowId ? enrolled : "(no workflow set)"}`);
  console.log(`  failed            : ${failed}`);
  if (failures.length) {
    console.log(`\nFirst failures:`);
    for (const f of failures.slice(0, 5)) {
      console.log(`  ${f.phone} -> HTTP ${f.status}: ${JSON.stringify(f.data).slice(0, 200)}`);
    }
  }
  console.log("");
  void results;
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const args = parseArgs(rest);
  try {
    if (cmd === "prep") cmdPrep(args);
    else if (cmd === "push") await cmdPush(args);
    else {
      console.log("Usage:");
      console.log("  node src/cli.js prep --in leads.csv --out out/clean.csv [--suppress dnc.txt]");
      console.log("  node src/cli.js push --in out/clean.csv [--tag name] [--dry-run]");
      process.exit(cmd ? 1 : 0);
    }
  } catch (err) {
    console.error(`\nError: ${err.message}\n`);
    process.exit(1);
  }
}

main();
