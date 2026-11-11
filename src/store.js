// Data layer. Two backends with the same async API:
//  - Supabase (shared across all phones/laptops) when REACT_APP_SUPABASE_URL
//    and REACT_APP_SUPABASE_ANON_KEY are set. Schema: supabase/schema.sql
//  - Demo mode: this browser's localStorage, synced across tabs on one device.

import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.REACT_APP_SUPABASE_URL;
const KEY_ = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supa = URL_ && KEY_ ? createClient(URL_, KEY_) : null;

export const MODE = supa ? "live" : "demo";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newToken() {
  let s = "";
  const buf = new Uint32Array(6);
  (window.crypto || window.msCrypto).getRandomValues(buf);
  buf.forEach((n) => (s += ALPHA[n % ALPHA.length]));
  return "GRB-" + s;
}

export const normToken = (raw) => {
  let s = String(raw || "").trim().toUpperCase();
  const m = s.match(/GRB-[A-Z0-9]{6}/); // QR may hold a full pass URL
  return m ? m[0] : s;
};
const normEmail = (e) => String(e || "").trim().toLowerCase();

/* ---------------- row mapping (Supabase uses snake_case) ---------------- */

const toPerson = (r) => ({
  id: r.id, token: r.token, name: r.name, department: r.department, email: r.email,
  phone: r.phone, house: r.house, createdAt: r.created_at,
  checkedInAt: r.checked_in_at, giftClaimedAt: r.gift_claimed_at,
  emailSentAt: r.email_sent_at || null,
});
const toScore = (r) => ({
  id: r.id, challenge: r.challenge, house: r.house, points: Number(r.points),
  note: r.note || "", by: r.by_name || "", createdAt: r.created_at,
});

/* ---------------- demo backend ---------------- */

const DB_KEY = "grab_demo_db_v2";
const now = () => new Date().toISOString();

function seed() {
  const P = (name, department, house, email, phone, checked, gift) => ({
    id: "d-" + email, token: newToken(), name, department, email, phone, house,
    createdAt: now(), checkedInAt: checked ? now() : null, giftClaimedAt: gift ? now() : null,
  });
  const S = (id, challenge, house, points, note) => ({ id, challenge, house, points, note, by: "Marshal", createdAt: now() });
  return {
    people: [
      P("Nurul Aisyah binti Rahman", "Operations", "red", "nurul.aisyah@grab.com", "+60 12-345 6781", true, true),
      P("Tan Wei Sheng", "Engineering", "blue", "weisheng.tan@grab.com", "+60 12-345 6782", true, false),
      P("Kavitha Ramachandran", "Finance", "yellow", "kavitha.r@grab.com", "+60 12-345 6783", false, false),
      P("Danish Iskandar", "Product", "green", "danish.iskandar@grab.com", "+60 12-345 6784", false, false),
    ],
    scores: [
      S(1, "fitness", "blue", 29010, "Wave 1"), S(2, "fitness", "red", 31244, "Wave 2"),
      S(3, "fitness", "yellow", 40312, "Wave 3"), S(4, "fitness", "green", 25205, "Wave 1 clean"),
      S(5, "obstacle", "yellow", 41820, "Clean run"), S(6, "obstacle", "blue", 43507, ""),
      S(7, "obstacle", "green", 39911, "One penalty"), S(8, "obstacle", "red", 45130, ""),
      S(9, "bingo", "red", 19, ""), S(10, "bingo", "green", 17, ""),
      S(11, "bingo", "yellow", 12, ""), S(12, "bingo", "blue", 10, ""),
      S(13, "warcry", "yellow", 1, "Judges' pick"),
    ],
  };
}

function readDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* storage blocked */ }
  const db = seed();
  writeDb(db);
  return db;
}
function writeDb(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
  listeners.forEach((f) => f());
}

const listeners = new Set();

/* ---------------- public API ---------------- */

export async function loadAll() {
  if (!supa) {
    const db = readDb();
    return { people: db.people, scores: db.scores };
  }
  const [p, s] = await Promise.all([
    supa.from("grab_people").select("*").order("created_at", { ascending: true }),
    supa.from("grab_scores").select("*").order("created_at", { ascending: true }),
  ]);
  if (p.error) throw p.error;
  if (s.error) throw s.error;
  return { people: p.data.map(toPerson), scores: s.data.map(toScore) };
}

// Calls onChange whenever data changes anywhere (other tabs, other devices).
export function subscribe(onChange) {
  if (!supa) {
    const onStorage = (e) => { if (e.key === DB_KEY) onChange(); };
    listeners.add(onChange);
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(onChange); window.removeEventListener("storage", onStorage); };
  }
  const ch = supa.channel("grab-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "grab_people" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "grab_scores" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "grab_settings" }, onChange)
    .subscribe();
  const poll = setInterval(onChange, 15000); // safety net if realtime drops
  return () => { clearInterval(poll); supa.removeChannel(ch); };
}

export async function findByEmail(email) {
  const e = normEmail(email);
  if (!supa) return readDb().people.find((p) => p.email === e) || null;
  const { data, error } = await supa.from("grab_people").select("*").eq("email", e).maybeSingle();
  if (error) throw error;
  return data ? toPerson(data) : null;
}

export async function findByToken(token) {
  const t = normToken(token);
  if (!supa) return readDb().people.find((p) => p.token === t) || null;
  const { data, error } = await supa.from("grab_people").select("*").eq("token", t).maybeSingle();
  if (error) throw error;
  return data ? toPerson(data) : null;
}

// Returns { person, duplicate } - duplicate=true when the email already RSVP'd.
export async function register({ name, department, email, phone, house }) {
  const e = normEmail(email);
  const existing = await findByEmail(e);
  if (existing) return { person: existing, duplicate: true };
  const person = {
    token: newToken(), name: name.trim(), department, email: e,
    phone: phone.trim(), house, createdAt: now(), checkedInAt: null, giftClaimedAt: null,
  };
  if (!supa) {
    const db = readDb();
    const p = { ...person, id: "l-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6) };
    db.people.push(p);
    writeDb(db);
    return { person: p, duplicate: false };
  }
  const { data, error } = await supa.from("grab_people").insert({
    token: person.token, name: person.name, department, email: e, phone: person.phone, house,
  }).select().single();
  if (error) {
    if (error.code === "23505") return { person: await findByEmail(e), duplicate: true };
    throw error;
  }
  return { person: toPerson(data), duplicate: false };
}

// Returns { person, already } or { person: null } when the code is unknown.
// A pass can only ever be checked in once: the update only applies while
// checked_in_at is still empty, so two scanners firing together cannot
// double-check-in or overwrite the first time.
// If the network is down, the check-in is saved on this device (queued: true)
// and synced automatically by flushPending().
export async function checkIn(token) {
  const t = normToken(token);
  try {
    const p = await findByToken(t);
    if (!p) return { person: null };
    if (p.checkedInAt) return { person: p, already: true };
    if (!supa) {
      const db = readDb();
      const row = db.people.find((x) => x.id === p.id);
      row.checkedInAt = now();
      writeDb(db);
      return { person: { ...row }, already: false };
    }
    const { data, error } = await supa.from("grab_people").update({ checked_in_at: now() })
      .eq("id", p.id).is("checked_in_at", null).select();
    if (error) throw error;
    if (!data.length) return { person: await findByToken(t), already: true };
    return { person: toPerson(data[0]), already: false };
  } catch (e) {
    if (!supa) throw e;
    // Offline: use this device's last snapshot so the door keeps moving.
    const snap = readSnapshot();
    const p = snap && snap.people.find((x) => x.token === t);
    if (!p) throw e;
    const q = readPending();
    const queued = q.find((x) => x.kind === "checkin" && x.token === t);
    if (p.checkedInAt) return { person: p, already: true };
    if (queued) return { person: { ...p, checkedInAt: queued.at }, already: true, queued: true };
    const at = now();
    q.push({ kind: "checkin", token: t, id: p.id, at });
    writePending(q);
    return { person: { ...p, checkedInAt: at }, already: false, queued: true };
  }
}

/* ---------------- offline queue, snapshots, health ---------------- */

const PENDING_KEY = "grab_pending_v1";
const SNAP_KEY = "grab_snapshot_v1";
const BACKUPS_KEY = "grab_backups_v1";
const MAX_BACKUPS = 12;

function readPending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]"); } catch (e) { return []; }
}
function writePending(q) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(q)); } catch (e) { /* ignore */ }
}
export const pendingCount = () => readPending().length;

// Push check-ins that were saved while offline. Keeps the original scan time
// and never overwrites a check-in that already exists.
export async function flushPending() {
  if (!supa) return 0;
  const q = readPending();
  if (!q.length) return 0;
  const left = [];
  for (const item of q) {
    try {
      if (item.kind === "checkin") {
        const { error } = await supa.from("grab_people").update({ checked_in_at: item.at })
          .eq("id", item.id).is("checked_in_at", null);
        if (error) throw error;
      }
    } catch (e) { left.push(item); }
  }
  writePending(left);
  return q.length - left.length;
}

function readSnapshot() {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY) || "null"); } catch (e) { return null; }
}

// Called with fresh data: keeps the latest copy (used offline) and a rolling
// set of timestamped backups on this device.
export function saveSnapshot(people, scores, { rolling } = {}) {
  const snap = { at: now(), mode: MODE, people, scores };
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(snap)); } catch (e) { /* ignore */ }
  if (!rolling) return snap;
  try {
    const list = JSON.parse(localStorage.getItem(BACKUPS_KEY) || "[]");
    list.unshift(snap);
    let keep = list.slice(0, MAX_BACKUPS);
    // If storage is full, drop the oldest until it fits.
    while (keep.length) {
      try { localStorage.setItem(BACKUPS_KEY, JSON.stringify(keep)); break; } catch (e) { keep = keep.slice(0, -1); }
    }
  } catch (e) { /* ignore */ }
  return snap;
}
export function listBackups() {
  try { return JSON.parse(localStorage.getItem(BACKUPS_KEY) || "[]"); } catch (e) { return []; }
}

// Quick round trip to the database. { ok, ms }
export async function healthCheck() {
  const t0 = Date.now();
  if (!supa) return { ok: true, ms: 0 };
  try {
    const { error } = await supa.from("grab_people").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    return { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: String((e && e.message) || e) };
  }
}

// One-time door gift. The conditional update makes it safe even if two
// counters slide at the same second: only one wins.
// Returns { person, ok } | { person, already } | { person, notCheckedIn } | { person: null }
export async function claimGift(token) {
  const p = await findByToken(token);
  if (!p) return { person: null };
  if (p.giftClaimedAt) return { person: p, already: true };
  if (!p.checkedInAt) return { person: p, notCheckedIn: true };
  if (!supa) {
    const db = readDb();
    const row = db.people.find((x) => x.id === p.id);
    if (row.giftClaimedAt) return { person: { ...row }, already: true };
    row.giftClaimedAt = now();
    writeDb(db);
    return { person: { ...row }, ok: true };
  }
  const { data, error } = await supa.from("grab_people").update({ gift_claimed_at: now() })
    .eq("id", p.id).is("gift_claimed_at", null).select();
  if (error) throw error;
  if (!data.length) return { person: await findByToken(token), already: true };
  return { person: toPerson(data[0]), ok: true };
}

export async function updatePerson(id, patch) {
  if (!supa) {
    const db = readDb();
    const row = db.people.find((x) => x.id === id);
    if (row) Object.assign(row, patch);
    writeDb(db);
    return;
  }
  const map = { checkedInAt: "checked_in_at", giftClaimedAt: "gift_claimed_at", emailSentAt: "email_sent_at" };
  const body = {};
  Object.keys(patch).forEach((k) => (body[map[k] || k] = patch[k]));
  const { error } = await supa.from("grab_people").update(body).eq("id", id);
  if (error) throw error;
}

export async function deletePerson(id) {
  if (!supa) {
    const db = readDb();
    db.people = db.people.filter((x) => x.id !== id);
    writeDb(db);
    return;
  }
  const { error } = await supa.from("grab_people").delete().eq("id", id);
  if (error) throw error;
}

export async function addScore({ challenge, house, points, note, by }) {
  if (!supa) {
    const db = readDb();
    db.scores.push({ id: Date.now(), challenge, house, points, note, by, createdAt: now() });
    writeDb(db);
    return;
  }
  const { error } = await supa.from("grab_scores").insert({ challenge, house, points, note, by_name: by });
  if (error) throw error;
}

export async function removeScore(id) {
  if (!supa) {
    const db = readDb();
    db.scores = db.scores.filter((s) => s.id !== id);
    writeDb(db);
    return;
  }
  const { error } = await supa.from("grab_scores").delete().eq("id", id);
  if (error) throw error;
}

export function resetDemo() {
  if (supa) return;
  try { localStorage.removeItem(DB_KEY); } catch (e) { /* ignore */ }
  readDb();
}

/* ---------------- settings (challenges, display) ---------------- */
// Stored in table grab_settings (key text primary key, value jsonb).
// Returns {} when nothing is saved yet (or the table doesn't exist yet),
// so the app falls back to the defaults in config.js.

const SETTINGS_KEY = "grab_demo_settings_v1";
export const SETTINGS_SQL = `create table if not exists grab_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table grab_settings enable row level security;
create policy "settings all" on grab_settings for all using (true) with check (true);
alter publication supabase_realtime add table grab_settings;`;

export async function loadSettings() {
  if (!supa) {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch (e) { return {}; }
  }
  const { data, error } = await supa.from("grab_settings").select("key,value");
  if (error) return { _missing: true };
  const out = {};
  data.forEach((r) => (out[r.key] = r.value));
  return out;
}

export async function saveSetting(key, value) {
  if (!supa) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch (e) { /* ignore */ }
    all[key] = value;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(all)); } catch (e) { /* ignore */ }
    listeners.forEach((f) => f());
    return;
  }
  const { error } = await supa.from("grab_settings").upsert({ key, value, updated_at: now() });
  if (error) {
    const e = new Error(error.message);
    e.missingTable = /grab_settings|relation|schema cache/i.test(error.message || "");
    throw e;
  }
}
