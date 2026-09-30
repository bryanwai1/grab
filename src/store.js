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
});
const toScore = (r) => ({
  id: r.id, challenge: r.challenge, house: r.house, points: Number(r.points),
  note: r.note || "", by: r.by_name || "", createdAt: r.created_at,
});

/* ---------------- demo backend ---------------- */

const DB_KEY = "grab_demo_db_v1";
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
      S(5, "obstacle", "yellow", 510, "Clean run"), S(6, "obstacle", "blue", 480, ""),
      S(7, "obstacle", "green", 415, "One penalty"), S(8, "obstacle", "red", 330, ""),
      S(9, "bingo", "red", 19, ""), S(10, "bingo", "green", 17, ""),
      S(11, "bingo", "yellow", 12, ""), S(12, "bingo", "blue", 10, ""),
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
export async function checkIn(token) {
  const p = await findByToken(token);
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
  if (!data.length) return { person: await findByToken(token), already: true };
  return { person: toPerson(data[0]), already: false };
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
  const map = { checkedInAt: "checked_in_at", giftClaimedAt: "gift_claimed_at" };
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
