import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";
import { LocalSqliteAdapter } from "../src/storage/local_sqlite";

const dbPath = path.join(process.cwd(), "data", "sessions.sqlite");
const storage = new LocalSqliteAdapter(dbPath);
const db = (storage as any).db as Database;

// Load exported prod data
const sessionsData = JSON.parse(fs.readFileSync("/tmp/prod_sessions.json", "utf-8"))[0].results;
const recordsData = JSON.parse(fs.readFileSync("/tmp/prod_records.json", "utf-8"))[0].results;

console.log(`Importing ${sessionsData.length} sessions and ${recordsData.length} records into ${dbPath}...`);

// Insert sessions
for (const s of sessionsData) {
  const keys = Object.keys(s).filter(k => k !== "full_report_json" && k !== "name" && k !== "role_title");
  // ensure referrer_session_id exists or null
  const cols = [...keys];
  const placeholders = cols.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO completed_sessions (${cols.join(", ")}) VALUES (${placeholders})`;
  const vals = cols.map(c => s[c] === undefined ? null : s[c]);
  try {
    db.run(sql, vals);
  } catch (err) {
    console.warn(`Error inserting session ${s.id}:`, err);
  }
}

// Insert records
for (const r of recordsData) {
  const cols = Object.keys(r);
  const placeholders = cols.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO session_records (${cols.join(", ")}) VALUES (${placeholders})`;
  const vals = cols.map(c => r[c]);
  try {
    db.run(sql, vals);
  } catch (err) {
    console.warn(`Error inserting record ${r.session_id}-${r.trial_index}:`, err);
  }
}

console.log("Import completed!");
