import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";

const EVENT = {
  name: "Grab House Challenge",
  year: "2026",
  dateLong: "Saturday, 14 March 2026",
  dateShort: "14 Mar 2026",
  venue: "Grab Malaysia HQ, Petaling Jaya",
};

const HOUSES = [
  { key: "red", name: "Red", hex: "#E8382F", members: 62 },
  { key: "blue", name: "Blue", hex: "#0B7FD4", members: 58 },
  { key: "yellow", name: "Yellow", hex: "#F2A900", members: 61 },
  { key: "purple", name: "Purple", hex: "#7B3FE4", members: 57 },
  { key: "green", name: "Green", hex: "#00B14F", members: 24, committee: true },
];

const CHALLENGES = [
  { key: "fitness", name: "Fitness Challenge", type: "time", metric: "time", metricNote: "Best combined time - fastest wins", blurb: "Six timed stations - rowing, box jumps, battle ropes, wall balls, sled push and the plank hold. The clock runs from the first rep to the last.", venue: "Hall A, East Deck", time: "09:30", lead: true },
  { key: "obstacle", name: "Obstacles", type: "points", metric: "points", metricNote: "Time-adjusted points", blurb: "A 400 m team course. Fastest clean run per wave scores highest.", venue: "Outdoor Field", time: "11:15" },
  { key: "bingo", name: "Bingo Dash", type: "points", metric: "squares", metricNote: "Squares completed of 24", blurb: "Twenty-four squares hidden across the campus. Scan to claim.", venue: "Level 3 Atrium", time: "14:00" },
];

const RANK_POINTS = [5, 4, 3, 2, 1];

function fmtTime(cs) {
  if (cs === null || cs === undefined || cs === Infinity) return "--:--:--";
  const m = Math.floor(cs / 6000);
  const sec = Math.floor((cs % 6000) / 100);
  const c = Math.round(cs % 100);
  return m + ":" + String(sec).padStart(2, "0") + ":" + String(c).padStart(2, "0");
}

function parseTime(str) {
  const parts = String(str).trim().split(":").map((x) => x.trim());
  if (parts.length !== 3 || parts.some((x) => x === "" || Number.isNaN(Number(x)))) return null;
  const [m, sec, c] = parts.map(Number);
  if (sec > 59 || c > 99 || m < 0 || sec < 0 || c < 0) return null;
  return m * 6000 + sec * 100 + c;
}

const showValue = (ch, v) => (ch.type === "time" ? fmtTime(v) : String(v));

const ITINERARY = [
  { time: "08:00", name: "Doors open and check-in", note: "Scan your QR at the lobby desk. Grab your house band." },
  { time: "09:00", name: "Opening and house call", note: "Main Hall. All five houses assemble." },
  { time: "09:30", name: "Fitness Challenge", note: "Hall A, East Deck - waves 1 to 4." },
  { time: "11:15", name: "Obstacles", note: "Outdoor Field. Wet shoes guaranteed." },
  { time: "12:45", name: "Lunch", note: "Level 1 canteen and the food trucks out front." },
  { time: "14:00", name: "Bingo Dash", note: "Campus-wide. Ends the moment the horn goes." },
  { time: "16:00", name: "Prize giving", note: "Three winners - one per challenge. Main Hall." },
];

const NOW_INDEX = 2;

const SEED_PEOPLE = [
  { id: "P001", name: "Nurul Aisyah binti Rahman", email: "nurul.aisyah@grab.com", staffNo: "GRB1042", house: "red", category: "participant", token: "GHC-4RD1", challenges: ["fitness", "bingo"], wave: 2, checkedIn: true },
  { id: "P002", name: "Tan Wei Sheng", email: "weisheng.tan@grab.com", staffNo: "GRB1088", house: "blue", category: "participant", token: "GHC-8BL7", challenges: ["obstacle", "bingo"], wave: 1, checkedIn: true },
  { id: "P003", name: "Kavitha Ramachandran", email: "kavitha.r@grab.com", staffNo: "GRB1120", house: "yellow", category: "participant", token: "GHC-2YL9", challenges: ["fitness", "obstacle"], wave: 3, checkedIn: false },
  { id: "P004", name: "Danish Iskandar", email: "danish.iskandar@grab.com", staffNo: "GRB1165", house: "purple", category: "participant", token: "GHC-6PR3", challenges: ["fitness", "obstacle", "bingo"], wave: 1, checkedIn: true },
  { id: "P005", name: "Chan Li Mei", email: "limei.chan@grab.com", staffNo: "GRB1201", house: "green", category: "committee", token: "GHC-1GR5", challenges: [], wave: null, checkedIn: true },
  { id: "P006", name: "Arjun Selvaraj", email: "arjun.s@grab.com", staffNo: "GRB1233", house: "blue", category: "spectator", token: "GHC-9BL2", challenges: [], wave: null, checkedIn: false },
];

const SEED_SCORES = [
  { id: 1, challenge: "fitness", house: "purple", points: 25205, note: "Wave 1 clean", by: "Marshal A" },
  { id: 2, challenge: "fitness", house: "red", points: 31244, note: "Wave 2", by: "Marshal A" },
  { id: 3, challenge: "fitness", house: "blue", points: 29010, note: "Wave 1", by: "Marshal A" },
  { id: 4, challenge: "fitness", house: "yellow", points: 40312, note: "Wave 3", by: "Marshal A" },
  { id: 5, challenge: "fitness", house: "green", points: 22521, note: "Committee run", by: "Marshal A" },
  { id: 6, challenge: "obstacle", house: "yellow", points: 510, note: "Clean run 4:12", by: "Marshal B" },
  { id: 7, challenge: "obstacle", house: "blue", points: 480, note: "Clean run 4:31", by: "Marshal B" },
  { id: 8, challenge: "obstacle", house: "green", points: 415, note: "One penalty", by: "Marshal B" },
  { id: 9, challenge: "obstacle", house: "purple", points: 375, note: "Two penalties", by: "Marshal B" },
  { id: 10, challenge: "obstacle", house: "red", points: 330, note: "Three penalties", by: "Marshal B" },
  { id: 11, challenge: "bingo", house: "red", points: 19, note: "", by: "Marshal C" },
  { id: 12, challenge: "bingo", house: "green", points: 17, note: "", by: "Marshal C" },
  { id: 13, challenge: "bingo", house: "purple", points: 15, note: "", by: "Marshal C" },
  { id: 14, challenge: "bingo", house: "yellow", points: 12, note: "", by: "Marshal C" },
  { id: 15, challenge: "bingo", house: "blue", points: 10, note: "", by: "Marshal C" },
];

const houseOf = (k) => HOUSES.find((h) => h.key === k) || HOUSES[0];
const challengeOf = (k) => CHALLENGES.find((c) => c.key === k) || CHALLENGES[0];
const qrSrc = (token, size) => {
  const s = size || 220;
  return "https://api.qrserver.com/v1/create-qr-code/?size=" + s + "x" + s + "&margin=0&data=" + encodeURIComponent(token);
};
const BG = (n) => ({ backgroundImage: "url(" + (process.env.PUBLIC_URL || "") + "/" + n + ")" });
const calmMotion = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================= particle canvas ================= */

function Particles({ className, density = 34, confetti = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (calmMotion()) return;
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let raf, w = 0, h = 0, parts = [];
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const palette = HOUSES.map((x) => x.hex).concat(["#ffffff", "#3ee87f"]);

    const seed = () => {
      parts = [];
      const n = Math.round(density * Math.min(1.5, w / 900 + 0.5));
      for (let i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: confetti ? 2.5 + Math.random() * 4.5 : 1.2 + Math.random() * 2.8,
          vy: -(0.14 + Math.random() * 0.42),
          sway: 0.4 + Math.random() * 1.2,
          ph: Math.random() * Math.PI * 2,
          a: 0.18 + Math.random() * 0.5,
          c: palette[Math.floor(Math.random() * palette.length)],
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.03,
        });
      }
    };

    const resize = () => {
      const b = cv.getBoundingClientRect();
      w = b.width; h = b.height;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    let t = 0;
    const frame = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y += p.vy;
        p.rot += p.vr;
        const x = p.x + Math.sin(t * p.sway + p.ph) * 16;
        if (p.y < -14) { p.y = h + 12; p.x = Math.random() * w; }
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        if (confetti) {
          ctx.save();
          ctx.translate(x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    resize();
    frame();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [density, confetti]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

/* ================= hooks ================= */

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (calmMotion()) { el.querySelectorAll(".reveal").forEach((n) => n.classList.add("in")); return; }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

function useCountUp(target, ms) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target || calmMotion()) { from.current = target; setV(target); return; }
    const dur = ms || 900;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(start + (target - start) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Counter({ value, className, style }) {
  const v = useCountUp(value);
  return <span className={className} style={style}>{v}</span>;
}

/* ================= brand ================= */

function GrabMark({ size = 20, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 15.5c0-4.7 3.6-8 8.2-8 3.3 0 5.6 1.6 6.6 3.6l-3 1.5c-.6-1.2-1.9-2-3.6-2-2.6 0-4.5 1.9-4.5 4.9v2.9H4v-2.9Z" fill={color} />
      <circle cx="16.6" cy="17.3" r="2.4" fill={color} />
    </svg>
  );
}

function Nav({ page, go }) {
  const items = [["home","Home"],["register","Register"],["invite","Invite"],["checkin","Check-in"],["scores","Live scores"],["admin","Admin"]];
  return (
    <nav className="nav">
      <div className="shell nav-in">
        <button className="brand" onClick={() => go("home")}>
          <span className="brand-mark"><GrabMark /></span>
          <span style={{ textAlign: "left" }}>
            <span className="wordmark">Grab</span>
            <span className="brand-sub">HOUSE CHALLENGE</span>
          </span>
        </button>
        <div className="nav-links">
          {items.map(([k, label]) => (
            <button key={k} className="nav-link" aria-current={page === k ? "page" : undefined} onClick={() => go(k)}>{label}</button>
          ))}
        </div>
      </div>
    </nav>
  );
}

function Ticker({ totals, go }) {
  const now = ITINERARY[NOW_INDEX];
  const next = ITINERARY[NOW_INDEX + 1];
  return (
    <div className="ticker">
      <div className="shell ticker-in">
        <span className="live-dot" />
        <span className="ticker-now">Now: {now.name}</span>
        <span className="ticker-sep">|</span>
        <span>Next {next.time} {next.name}</span>
        <div className="ticker-rail">
          {CHALLENGES.map((c) => {
            const lead = HOUSES.map((h) => ({ h, v: totals[c.key][h.key] }))
              .sort((a, b) => (c.type === "time" ? a.v - b.v : b.v - a.v))[0];
            return (
              <button key={c.key} className="ticker-chip" onClick={() => go("scores")}>
                <span className="chip-dot" style={{ background: lead.h.hex }} />
                {c.name.split(" ")[0]} {lead.h.name} {showValue(c, lead.v)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= home ================= */

function Home({ go, people, totals }) {
  const wrap = useReveal();
  const counts = useMemo(() => {
    const m = {};
    HOUSES.forEach((h) => (m[h.key] = h.members));
    people.forEach((p) => { if (!SEED_PEOPLE.find((s) => s.id === p.id)) m[p.house] = (m[p.house] || 0) + 1; });
    return m;
  }, [people]);
  const totalPeople = HOUSES.reduce((a, h) => a + counts[h.key], 0);
  const checked = people.filter((p) => p.checkedIn).length;
  const routeFill = ((NOW_INDEX + 0.5) / ITINERARY.length) * 100 + "%";

  return (
    <div ref={wrap}>
      <header className="hero">
        <div className="hero-img only-landscape" style={BG("bg-hero.jpg")} />
        <div className="hero-img only-portrait" style={BG("bg-hero-p.jpg")} />
        <div className="hero-scrim" />
        <div className="hero-rays" />
        <Particles className="hero-canvas" density={40} confetti />
        <div className="shell hero-in">
          <span className="hero-eyebrow">
            <span className="live-dot" />
            Registration is open
          </span>
          <h1>
            <span>Five houses.</span>
            <span>Three challenges.</span>
            <span>One epic Saturday.</span>
          </h1>
          <p className="hero-sub">
            {EVENT.dateLong} at {EVENT.venue}. Pick your colour, show up, and let the scoreboard do the talking.
          </p>
          <div className="hero-cta">
            <button className="btn" onClick={() => go("register")}>Register your spot <span className="btn-arrow">&rarr;</span></button>
            <button className="btn btn-ghost" onClick={() => go("scores")}>Watch live scores</button>
          </div>
          <div className="hero-flags">
            {HOUSES.map((h, i) => (
              <span key={h.key} className="flag" style={{ background: h.hex, animationDelay: i * 0.22 + "s" }} />
            ))}
          </div>
        </div>
        <div className="stat-band">
          <div className="stat"><div className="num stat-v"><Counter value={totalPeople} /></div><div className="stat-l">signed up</div></div>
          <div className="stat"><div className="num stat-v"><Counter value={checked} /></div><div className="stat-l">checked in</div></div>
          <div className="stat"><div className="num stat-v">3</div><div className="stat-l">separate scoreboards</div></div>
          <div className="stat"><div className="num stat-v">5</div><div className="stat-l">houses in play</div></div>
        </div>
      </header>

      <section className="section bg-soft">
        <div className="shell">
          <div className="section-head reveal">
            <h2>The three challenges</h2>
            <p className="lede">Every challenge keeps its own scoreboard. Nothing gets added together, so you can win the obstacle course and still come last at bingo.</p>
          </div>
          <div className="chal-grid">
            {CHALLENGES.map((c, i) => {
              const lead = HOUSES.map((h) => ({ h, v: totals[c.key][h.key] }))
                .sort((a, b) => (c.type === "time" ? a.v - b.v : b.v - a.v))[0];
              return (
                <article key={c.key} className={"chal reveal pop d" + (i + 1) + (c.lead ? " chal-lead" : "")}>
                  <div>
                    <div className="chal-name">{c.name}</div>
                    <p className="chal-blurb">{c.blurb}</p>
                  </div>
                  <div>
                    <div className="chal-meta">
                      <span>{c.time}</span><span>{c.venue}</span><span>Scored in {c.metric}</span>
                    </div>
                    <div className="chal-lead-line">
                      <span className="chip-dot" style={{ background: lead.h.hex }} />
                      {lead.h.name} leads on <span className="num">{showValue(c, lead.v)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--ink)", position: "relative", overflow: "hidden" }}>
        <div className="bg-mesh" />
        <div className="shell" style={{ position: "relative", zIndex: 1 }}>
          <div className="section-head reveal" style={{ color: "#fff" }}>
            <h2>Pick a side</h2>
            <p className="lede" style={{ color: "#a9c1b4" }}>Your house is set at registration and locked for the day. Green is the committee - they run the event and still put points on the board.</p>
          </div>
          <div className="house-strip">
            {HOUSES.map((h, i) => (
              <div key={h.key} className={"house-tile reveal pop d" + (i + 1)} style={{ background: h.hex }}>
                <div className="h-name">{h.name}</div>
                <div>
                  <div className="num" style={{ fontSize: 36 }}><Counter value={counts[h.key]} /></div>
                  <div className="h-count">{h.committee ? "committee" : "members"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-soft">
        <div className="shell split" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 44 }}>
          <div className="reveal">
            <h2 style={{ fontSize: 36, marginBottom: 8 }}>How the day runs</h2>
            <p className="lede" style={{ marginBottom: 24 }}>One route, seven stops. Your QR tells you exactly which waves you are in.</p>
            <div className="route" style={{ "--route-fill": routeFill }}>
              {ITINERARY.map((s, i) => (
                <div key={s.time} className={"stop" + (i < NOW_INDEX ? " stop-done" : i === NOW_INDEX ? " stop-live" : "")}>
                  <div className="stop-time">{s.time}</div>
                  <div className="stop-name">{s.name}</div>
                  <div className="stop-note">{s.note}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal d2">
            <div className="panel" style={{ position: "sticky", top: 100 }}>
              <h3 style={{ fontSize: 24, marginBottom: 12 }}>Bring your QR</h3>
              <p style={{ color: "var(--ink-2)", fontSize: 15.5 }}>
                It lands in your inbox a week before. Screenshot it - the lobby signal is patchy and the queue moves fast.
              </p>
              <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-sm" onClick={() => go("register")}>Register</button>
                <button className="btn btn-ghost btn-sm" onClick={() => go("invite")}>Preview the invite</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ================= register ================= */

function Register({ addPerson, go }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [staffNo, setStaffNo] = useState("");
  const [house, setHouse] = useState("");
  const [category, setCategory] = useState("participant");
  const [picked, setPicked] = useState(["fitness", "obstacle", "bingo"]);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  const toggleChallenge = (k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const submit = () => {
    if (!name.trim()) return setErr("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid work email.");
    if (!house) return setErr("Pick a house.");
    setErr("");
    const token = "GHC-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const person = {
      id: "P" + Math.floor(Math.random() * 9000 + 1000),
      name: name.trim(), email: email.trim(), staffNo: staffNo.trim() || "-",
      house, category, token,
      challenges: category === "participant" ? picked : [],
      wave: category === "participant" ? 1 + Math.floor(Math.random() * 4) : null,
      checkedIn: false,
    };
    addPerson(person);
    setDone(person);
  };

  if (done) {
    const h = houseOf(done.house);
    return (
      <div className="shell section" style={{ maxWidth: 640 }}>
        <div className="trip">
          <div className="trip-band" style={{ background: h.hex }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>You are in</div>
              <div className="wide" style={{ fontSize: 33, fontWeight: 700 }}>House {h.name}</div>
            </div>
            <GrabMark size={28} />
          </div>
          <div className="trip-body">
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              <img src={qrSrc(done.token)} width="132" height="132" alt={"QR code for " + done.token} style={{ borderRadius: 14, flex: "none" }} />
              <div style={{ flex: 1, minWidth: 210 }}>
                <div className="kv"><span>Name</span><span>{done.name}</span></div>
                <div className="kv"><span>Pass</span><span>{done.token}</span></div>
                <div className="kv"><span>Role</span><span style={{ textTransform: "capitalize" }}>{done.category}</span></div>
                <div className="kv"><span>Challenges</span><span>{done.challenges.length ? done.challenges.map((k) => challengeOf(k).name).join(", ") : "Spectating"}</span></div>
              </div>
            </div>
            <p className="hint" style={{ marginTop: 18 }}>A copy is on its way to {done.email}. Show this at the lobby desk on {EVENT.dateShort}.</p>
            <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-ink btn-sm" onClick={() => go("invite")}>See the full invite</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDone(null)}>Register someone else</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell section" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 46, marginBottom: 10 }}>Register</h1>
      <p className="lede" style={{ marginBottom: 30 }}>Two minutes, and your QR pass lands in your inbox straight away.</p>
      <div className="panel">
        <label className="field"><span className="field-label">Full name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nurul Aisyah binti Rahman" /></label>
        <label className="field"><span className="field-label">Work email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@grab.com" /></label>
        <label className="field"><span className="field-label">Staff number</span>
          <input className="input" value={staffNo} onChange={(e) => setStaffNo(e.target.value)} placeholder="GRB1042" /></label>
        <div className="field">
          <span className="field-label">House</span>
          <div className="picker">
            {HOUSES.map((h) => (
              <button key={h.key} className="chip" aria-pressed={house === h.key} onClick={() => setHouse(h.key)}>
                <span className="chip-dot" style={{ background: h.hex }} />{h.name}{h.committee ? " (committee)" : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Taking part as</span>
          <div className="picker">
            {["participant", "committee", "spectator"].map((c) => (
              <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)} style={{ textTransform: "capitalize" }}>{c}</button>
            ))}
          </div>
          <p className="hint">Spectators still get a QR - it opens the schedule and the viewing areas.</p>
        </div>
        {category === "participant" && (
          <div className="field">
            <span className="field-label">Challenges you want in on</span>
            <div className="picker">
              {CHALLENGES.map((c) => (
                <button key={c.key} className="chip" aria-pressed={picked.includes(c.key)} onClick={() => toggleChallenge(c.key)}>{c.name}</button>
              ))}
            </div>
            <p className="hint">Waves are assigned by the committee once registration closes.</p>
          </div>
        )}
        {err && <p className="err">{err}</p>}
        <button className="btn" style={{ marginTop: 14, width: "100%" }} onClick={submit}>Get my QR pass</button>
      </div>
    </div>
  );
}

/* ================= invite ================= */

function Invite({ go }) {
  const demo = SEED_PEOPLE[0];
  const h = houseOf(demo.house);
  return (
    <div className="shell section" style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 46, marginBottom: 10 }}>The teaser email</h1>
      <p className="lede" style={{ marginBottom: 30 }}>Sent one week out, then again the night before. This is the exact layout.</p>
      <div className="trip">
        <div className="trip-band" style={{ background: "var(--ink)" }}>
          <span className="brand-mark" style={{ animation: "none" }}><GrabMark /></span>
          <div style={{ marginRight: "auto", marginLeft: 13 }}>
            <div className="wide" style={{ fontSize: 21, fontWeight: 700 }}>{EVENT.name} {EVENT.year}</div>
            <div style={{ fontSize: 13, color: "#8fa89a" }}>{EVENT.dateLong}</div>
          </div>
        </div>
        <div className="trip-body">
          <h2 style={{ fontSize: 33, marginBottom: 12 }}>See you Saturday, {demo.name.split(" ")[0]}.</h2>
          <p style={{ color: "var(--ink-2)", maxWidth: "58ch" }}>
            You are in House {h.name}. Doors open at 08:00 and the opening call is 09:00 sharp - houses get counted, so being late costs your side.
          </p>
          <div style={{ display: "flex", gap: 28, marginTop: 28, flexWrap: "wrap" }}>
            <div style={{ flex: "none", textAlign: "center" }}>
              <img src={qrSrc(demo.token)} width="152" height="152" alt="Entry QR code" style={{ borderRadius: 14 }} />
              <div className="num" style={{ fontSize: 15, marginTop: 9 }}>{demo.token}</div>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="route" style={{ "--route-fill": "0%" }}>
                {ITINERARY.slice(0, 5).map((s) => (
                  <div key={s.time} className="stop" style={{ padding: "10px 0" }}>
                    <div className="stop-time">{s.time}</div>
                    <div className="stop-name" style={{ fontSize: 16.5 }}>{s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 26, padding: 20, borderRadius: 18, background: "var(--grab-wash)" }}>
            <strong>What to bring</strong>
            <p style={{ color: "var(--ink-2)", fontSize: 15, marginTop: 5 }}>Sportswear in your house colour, a towel, a refillable bottle, and this QR. Lockers are on Level 1.</p>
          </div>
          <button className="btn" style={{ marginTop: 24 }} onClick={() => go("checkin")}>Try the check-in scan <span className="btn-arrow">&rarr;</span></button>
        </div>
      </div>
    </div>
  );
}

/* ================= check-in ================= */

function ScanResult({ person }) {
  const h = houseOf(person.house);
  const mine = person.challenges.map(challengeOf);
  return (
    <div className="trip" style={{ marginTop: 24 }}>
      <div className="trip-band" style={{ background: h.hex }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>Checked in - House {h.name}</div>
          <div className="wide" style={{ fontSize: 29, fontWeight: 700 }}>{person.name}</div>
        </div>
        <div className="num" style={{ fontSize: 16 }}>{person.token}</div>
      </div>
      <div className="trip-body">
        {mine.length === 0 ? (
          <>
            <h3 style={{ fontSize: 23, marginBottom: 9 }}>{person.category === "committee" ? "Committee - Green" : "Spectating today"}</h3>
            <p style={{ color: "var(--ink-2)" }}>No challenge assignment. Viewing decks are on Level 2 above Hall A and along the north edge of the field.</p>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 21, marginBottom: 5 }}>Wave {person.wave} - {mine.length} challenge{mine.length > 1 ? "s" : ""}</h3>
            <div className="route" style={{ marginTop: 16, "--route-fill": "18%" }}>
              {mine.map((c, i) => (
                <div key={c.key} className={"stop" + (i === 0 ? " stop-live" : "")}>
                  <div className="stop-time">{c.time}</div>
                  <div className="stop-name">{c.name}</div>
                  <div className="stop-note">{c.venue} - report 15 minutes early - scored in {c.metric}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="kv" style={{ marginTop: 18, borderTop: "1px solid var(--line)" }}>
          <span>Staff number</span><span>{person.staffNo}</span>
        </div>
      </div>
    </div>
  );
}

function CheckIn({ people, markCheckedIn }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [found, setFound] = useState(null);

  const lookup = useCallback((raw) => {
    const q = String(raw).trim().toUpperCase();
    if (!q) { setErr("Scan a pass or type the code."); return; }
    const p = people.find((x) => x.token.toUpperCase() === q);
    if (!p) { setFound(null); setErr("No pass matches " + q + ". Send them to the help desk."); return; }
    setErr("");
    markCheckedIn(p.id);
    setFound({ ...p, checkedIn: true });
  }, [people, markCheckedIn]);

  return (
    <div className="shell section" style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 46, marginBottom: 10 }}>Check-in</h1>
      <p className="lede" style={{ marginBottom: 28 }}>Point the scanner at the pass. Camera hook comes later - for now, type or tap a code.</p>
      <div className="panel">
        <label className="field" style={{ marginBottom: 14 }}>
          <span className="field-label">Pass code</span>
          <input className="input" value={code}
            onChange={(e) => { setCode(e.target.value); if (err) setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && lookup(code)}
            placeholder="GHC-4RD1" />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="btn" style={{ marginTop: 12 }} onClick={() => lookup(code)}>Look up pass</button>
        <p className="hint" style={{ marginTop: 20, marginBottom: 10 }}>Demo passes</p>
        <div className="picker">
          {people.slice(0, 6).map((p) => (
            <button key={p.id} className="chip" onClick={() => { setCode(p.token); lookup(p.token); }}>
              <span className="chip-dot" style={{ background: houseOf(p.house).hex }} />{p.token}
            </button>
          ))}
        </div>
      </div>
      {found && <ScanResult key={found.id + found.token} person={found} />}
    </div>
  );
}

/* ================= scoreboard ================= */

function usePrevious(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

function useBoardRanking(challenge, totals) {
  const values = totals[challenge.key];
  const isTime = challenge.type === "time";
  const sig = HOUSES.map((h) => values[h.key]).join(",");
  const prevSig = usePrevious(sig);

  const { order, rank, best, leader, runnerUp } = useMemo(() => {
    const rows = HOUSES.map((h) => ({ h, v: values[h.key] }))
      .sort((a, b) => (isTime ? a.v - b.v : b.v - a.v));
    const rk = {};
    rows.forEach((r, i) => (rk[r.h.key] = i));
    return { order: rows, rank: rk, best: rows[0].v, leader: rows[0], runnerUp: rows[1] };
  }, [values, isTime]);

  const prevRank = useRef(null);
  const prevVals = useRef(null);
  const [movers, setMovers] = useState({});
  const [bumps, setBumps] = useState({});

  useEffect(() => {
    if (prevSig !== undefined && prevSig !== sig && prevRank.current && prevVals.current) {
      const mv = {}, bp = {};
      HOUSES.forEach((h) => {
        const d = prevRank.current[h.key] - rank[h.key];
        if (d !== 0) mv[h.key] = d;
        if (values[h.key] !== prevVals.current[h.key]) {
          bp[h.key] = isTime ? "NEW BEST" : "+" + (values[h.key] - prevVals.current[h.key]);
        }
      });
      setMovers(mv);
      setBumps(bp);
      const t = setTimeout(() => { setMovers({}); setBumps({}); }, 2600);
      prevRank.current = { ...rank };
      prevVals.current = { ...values };
      return () => clearTimeout(t);
    }
    prevRank.current = { ...rank };
    prevVals.current = { ...values };
  }, [sig, prevSig, rank, values, isTime]);

  const barPct = (v) => {
    if (isTime) {
      if (!isFinite(v) || !isFinite(best)) return 6;
      return Math.max(14, (best / v) * 100);
    }
    return (v / Math.max(1, best)) * 100;
  };
  const gapText = (v) => {
    if (isTime) return isFinite(v) && isFinite(best) ? "+" + fmtTime(v - best) : "no time";
    return "-" + (best - v);
  };
  const leadText = () => {
    if (isTime) {
      if (!isFinite(runnerUp.v) || !isFinite(leader.v)) return "only clean time so far";
      const d = runnerUp.v - leader.v;
      return d > 0 ? fmtTime(d) + " faster than " + runnerUp.h.name : "level with " + runnerUp.h.name;
    }
    const d = leader.v - runnerUp.v;
    return d > 0 ? "+" + d + " clear of " + runnerUp.h.name : "tied with " + runnerUp.h.name;
  };

  return { order, rank, leader, isTime, movers, bumps, barPct, gapText, leadText };
}

function ChallengeBoard({ challenge, totals }) {
  const { order, rank, leader, isTime, movers, bumps, barPct, gapText, leadText } =
    useBoardRanking(challenge, totals);

  return (
    <div className="bigboard">
      <div className="big-champ" style={{ background: leader.h.hex, boxShadow: "0 30px 80px -34px " + leader.h.hex }}>
        {bumps[leader.h.key] && <span className="bump bump-big">{bumps[leader.h.key]}</span>}
        <div className="big-tag">{isTime ? "FASTEST ON THE CLOCK" : "HOLDING THE CROWN"}</div>
        <div className="big-champ-grid">
          <div className="big-name">{leader.h.name}</div>
          <div className="big-score num">{isTime ? fmtTime(leader.v) : <Counter value={leader.v} />}</div>
        </div>
        <div className="big-gap">{leadText()}</div>
      </div>

      <div className="big-lanes">
        {order.slice(1).map((r) => {
          const mv = movers[r.h.key];
          const gained = bumps[r.h.key];
          return (
            <div key={r.h.key} className={"big-lane" + (gained ? " lane-gained" : "")}>
              <span className="lane-fill" style={{ background: r.h.hex, width: barPct(r.v) + "%" }} />
              <span className="lane-edge" style={{ background: r.h.hex, left: "calc(" + barPct(r.v) + "% - 4px)", boxShadow: "0 0 18px " + r.h.hex }} />
              {gained && <span className="bump bump-big">{gained}</span>}
              <span className="big-rank">{rank[r.h.key] + 1}</span>
              <span className="big-lane-name">{r.h.name}</span>
              {mv ? (
                <span className={"mover " + (mv > 0 ? "mover-up" : "mover-down")}>
                  {mv > 0 ? "\u25B2" : "\u25BC"}{Math.abs(mv)}
                </span>
              ) : null}
              <span className="big-gap-pill">{gapText(r.v)}</span>
              <span className="big-lane-score num">{isTime ? fmtTime(r.v) : <Counter value={r.v} />}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverallBoard({ standings }) {
  const rows = HOUSES.map((h) => ({ h, s: standings[h.key] })).sort((a, b) => b.s.total - a.s.total);
  const leader = rows[0];
  const runnerUp = rows[1];
  const top = Math.max(1, leader.s.total);

  return (
    <div className="bigboard">
      <div className="big-champ" style={{ background: leader.h.hex, boxShadow: "0 30px 80px -34px " + leader.h.hex }}>
        <div className="big-tag">LEADING THE HOUSE CUP</div>
        <div className="big-champ-grid">
          <div className="big-name">{leader.h.name}</div>
          <div className="big-score num"><Counter value={leader.s.total} /></div>
        </div>
        <div className="big-gap">
          {leader.s.total - runnerUp.s.total > 0
            ? "+" + (leader.s.total - runnerUp.s.total) + " clear of " + runnerUp.h.name
            : "tied with " + runnerUp.h.name}
        </div>
        <div className="pip-row">
          {CHALLENGES.map((c) => (
            <span key={c.key} className="pip">{c.name.split(" ")[0]} <strong>{leader.s.per[c.key]}</strong></span>
          ))}
        </div>
      </div>

      <div className="big-lanes">
        {rows.slice(1).map((r, i) => (
          <div key={r.h.key} className="big-lane">
            <span className="lane-fill" style={{ background: r.h.hex, width: (r.s.total / top) * 100 + "%" }} />
            <span className="big-rank">{i + 2}</span>
            <span className="big-lane-name">{r.h.name}</span>
            <span className="pip-row pip-inline">
              {CHALLENGES.map((c) => (
                <span key={c.key} className="pip pip-sm">{c.name.split(" ")[0]} {r.s.per[c.key]}</span>
              ))}
            </span>
            <span className="big-gap-pill">-{leader.s.total - r.s.total}</span>
            <span className="big-lane-score num"><Counter value={r.s.total} /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

const BOARD_KEYS = ["overall"].concat(CHALLENGES.map((c) => c.key));

function Scores({ totals, standings, go }) {
  const [board, setBoard] = useState(() => {
    const h = (window.location.hash || "").replace("#board=", "");
    return BOARD_KEYS.indexOf(h) >= 0 ? h : "overall";
  });

  useEffect(() => {
    window.location.hash = "board=" + board;
  }, [board]);

  useEffect(() => {
    const onHash = () => {
      const h = (window.location.hash || "").replace("#board=", "");
      if (BOARD_KEYS.indexOf(h) >= 0) setBoard(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const isOverall = board === "overall";
  const challenge = isOverall ? null : challengeOf(board);

  const leaderOf = (c) =>
    HOUSES.map((h) => ({ h, v: totals[c.key][h.key] }))
      .sort((a, b) => (c.type === "time" ? a.v - b.v : b.v - a.v))[0];
  const cupLeader = HOUSES.map((h) => ({ h, v: standings[h.key].total })).sort((a, b) => b.v - a.v)[0];

  const activeLeader = isOverall ? cupLeader : leaderOf(challenge);

  return (
    <div className="stage stage-board">
      <div className="stage-img only-landscape" style={BG("bg-hero.jpg")} />
      <div className="stage-img only-portrait" style={BG("bg-hero-p.jpg")} />
      <div className="stage-scrim" />
      <div className="stage-mesh" />
      <Particles className="stage-canvas" density={22} />

      <div className="stage-in">
        <div className="board-switch">
          <button className={"switch-btn" + (isOverall ? " on" : "")} onClick={() => setBoard("overall")}>
            <span className="switch-dot" style={{ background: cupLeader.h.hex }} />
            Overall cup
          </button>
          {CHALLENGES.map((c) => {
            const l = leaderOf(c);
            return (
              <button key={c.key} className={"switch-btn" + (board === c.key ? " on" : "")} onClick={() => setBoard(c.key)}>
                <span className="switch-dot" style={{ background: l.h.hex }} />
                {c.name}
              </button>
            );
          })}
          <button className="switch-btn switch-exit" onClick={() => go("home")}>Exit</button>
        </div>

        <div className="board-head" style={{ borderColor: activeLeader.h.hex + "55" }}>
          <div>
            <div className="board-title">{isOverall ? "Overall cup" : challenge.name}</div>
            <div className="board-where">
              <span className="live-dot" />
              {isOverall
                ? "Rank points - 5 for winning a challenge, down to 1"
                : challenge.venue + " - " + challenge.time + " - " + challenge.metricNote}
            </div>
          </div>
          <div className="board-brand">
            <span className="wordmark">Grab</span>
            <span className="brand-sub">HOUSE CHALLENGE {EVENT.year}</span>
          </div>
        </div>

        {isOverall
          ? <OverallBoard standings={standings} />
          : <ChallengeBoard key={challenge.key} challenge={challenge} totals={totals} />}

        <div className="elsewhere">
          {(isOverall ? CHALLENGES : CHALLENGES.filter((c) => c.key !== board)).map((c) => {
            const l = leaderOf(c);
            return (
              <button key={c.key} className="else-card" onClick={() => setBoard(c.key)}>
                <span className="chip-dot" style={{ background: l.h.hex }} />
                <span className="else-what">{c.name}</span>
                <span className="else-who">{l.h.name}</span>
                <span className="num else-val">{showValue(c, l.v)}</span>
              </button>
            );
          })}
          {!isOverall && (
            <button className="else-card else-cup" onClick={() => setBoard("overall")}>
              <span className="chip-dot" style={{ background: cupLeader.h.hex }} />
              <span className="else-what">Overall cup</span>
              <span className="else-who">{cupLeader.h.name}</span>
              <span className="num else-val">{cupLeader.v}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= admin ================= */

function ScoreEntry({ totals, addScore }) {
  const [challenge, setChallenge] = useState("fitness");
  const [house, setHouse] = useState("red");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");

  const c = challengeOf(challenge);
  const isTime = c.type === "time";

  const submit = () => {
    let n;
    if (isTime) {
      n = parseTime(points);
      if (n === null) return setErr("Use M:SS:CC, for example 4:50:10");
    } else {
      n = Number(points);
      if (!points.trim() || Number.isNaN(n)) return setErr("Enter a number.");
    }
    setErr("");
    addScore({ challenge, house, points: n, note: note.trim(), by: "Marshal" });
    setFlash(
      isTime
        ? houseOf(house).name + " logged " + fmtTime(n) + " on " + c.name
        : (n > 0 ? "+" : "") + n + " to " + houseOf(house).name + " on " + c.name
    );
    setPoints(""); setNote("");
    setTimeout(() => setFlash(""), 2600);
  };

  const rows = HOUSES.map((h) => ({ h, v: totals[challenge][h.key] }))
    .sort((a, b) => (isTime ? a.v - b.v : b.v - a.v));

  return (
    <div className="split" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20 }}>
      <div className="panel">
        <h3 style={{ fontSize: 24, marginBottom: 18 }}>Award points</h3>
        <div className="field">
          <span className="field-label">Challenge</span>
          <div className="picker">
            {CHALLENGES.map((x) => (
              <button key={x.key} className="chip" aria-pressed={challenge === x.key} onClick={() => setChallenge(x.key)}>{x.name}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">House</span>
          <div className="picker">
            {HOUSES.map((h) => (
              <button key={h.key} className="chip" aria-pressed={house === h.key} onClick={() => setHouse(h.key)}>
                <span className="chip-dot" style={{ background: h.hex }} />{h.name}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span className="field-label">{c.metricNote}</span>
          <input className="input" inputMode={isTime ? "text" : "numeric"} value={points}
            onChange={(e) => { setPoints(e.target.value); if (err) setErr(""); }}
            placeholder={isTime ? "4:50:10" : "Negative numbers deduct"} />
          {isTime && <p className="hint">Minutes : seconds : hundredths. The fastest time a house logs is the one that counts.</p>}
        </label>
        <label className="field">
          <span className="field-label">Note</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Wave 2 clean run" />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="btn" style={{ width: "100%", marginTop: 10 }} onClick={submit}>Post to scoreboard</button>
        {flash && <p className="flash">{flash}</p>}
      </div>
      <div className="panel">
        <h3 style={{ fontSize: 24, marginBottom: 5 }}>{c.name}</h3>
        <p className="hint" style={{ marginBottom: 18 }}>{c.metricNote}</p>
        {rows.map((r, i) => (
          <div key={r.h.key} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 0", borderBottom: i === HOUSES.length - 1 ? 0 : "1px solid var(--line)" }}>
            <span style={{ width: 13, color: "var(--ink-3)", fontSize: 14 }}>{i + 1}</span>
            <span className="chip-dot" style={{ background: r.h.hex }} />
            <span style={{ flex: 1, fontWeight: 700 }}>{r.h.name}</span>
            <span className="num" style={{ fontSize: isTime ? 20 : 24 }}>{showValue(c, r.v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Roster({ people }) {
  const [q, setQ] = useState("");
  const rows = people.filter((p) =>
    !q.trim() ||
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.token.toLowerCase().includes(q.toLowerCase()) ||
    p.staffNo.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="panel" style={{ padding: 0 }}>
      <div style={{ padding: 20, borderBottom: "1px solid var(--line)" }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, staff number or pass code" />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="grid">
          <thead><tr><th>Name</th><th>Staff no.</th><th>House</th><th>Role</th><th>Challenges</th><th>Pass</th><th>Check-in</th></tr></thead>
          <tbody>
            {rows.map((p) => {
              const h = houseOf(p.house);
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>{p.name}</td>
                  <td>{p.staffNo}</td>
                  <td><span className="tag" style={{ background: h.hex + "22", color: h.hex }}><span className="chip-dot" style={{ background: h.hex }} />{h.name}</span></td>
                  <td style={{ textTransform: "capitalize" }}>{p.category}</td>
                  <td>{p.challenges.length ? p.challenges.map((k) => challengeOf(k).name).join(", ") : "-"}</td>
                  <td className="num" style={{ fontSize: 14 }}>{p.token}</td>
                  <td>{p.checkedIn ? <span className="tag" style={{ background: "var(--grab-wash)", color: "var(--grab-deep)" }}>In</span> : <span className="tag">Not yet</span>}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} style={{ color: "var(--ink-3)", padding: 28 }}>Nobody matches that. Try the staff number.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Ledger({ scores, removeScore }) {
  return (
    <div className="panel" style={{ padding: 0 }}>
      <div className="ledger" style={{ overflowX: "auto" }}>
        <table className="grid">
          <thead><tr><th>Challenge</th><th>House</th><th>Value</th><th>Note</th><th>By</th><th /></tr></thead>
          <tbody>
            {[...scores].reverse().map((s) => {
              const h = houseOf(s.house);
              return (
                <tr key={s.id}>
                  <td>{challengeOf(s.challenge).name}</td>
                  <td><span className="tag" style={{ background: h.hex + "22", color: h.hex }}><span className="chip-dot" style={{ background: h.hex }} />{h.name}</span></td>
                  <td className="num" style={{ fontSize: 16 }}>{showValue(challengeOf(s.challenge), s.points)}</td>
                  <td style={{ color: "var(--ink-3)" }}>{s.note || "-"}</td>
                  <td style={{ color: "var(--ink-3)" }}>{s.by}</td>
                  <td style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm" onClick={() => removeScore(s.id)}>Undo</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Admin({ people, scores, totals, addScore, removeScore }) {
  const [tab, setTab] = useState("score");
  return (
    <div className="shell section">
      <h1 style={{ fontSize: 46, marginBottom: 24 }}>Admin</h1>
      <div className="tabs" role="tablist">
        {[["score", "Scoring"], ["roster", "Roster"], ["ledger", "Score ledger"]].map(([k, label]) => (
          <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === "score" && <ScoreEntry totals={totals} addScore={addScore} />}
      {tab === "roster" && <Roster people={people} />}
      {tab === "ledger" && <Ledger scores={scores} removeScore={removeScore} />}
    </div>
  );
}

/* ================= root ================= */

export default function App() {
  const [page, setPage] = useState("home");
  const [people, setPeople] = useState(SEED_PEOPLE);
  const [scores, setScores] = useState(SEED_SCORES);

  const go = useCallback((p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: calmMotion() ? "auto" : "smooth" });
  }, []);

  const totals = useMemo(() => {
    const t = {};
    CHALLENGES.forEach((c) => {
      t[c.key] = {};
      HOUSES.forEach((h) => (t[c.key][h.key] = c.type === "time" ? Infinity : 0));
    });
    scores.forEach((s) => {
      const c = challengeOf(s.challenge);
      if (!t[s.challenge] || t[s.challenge][s.house] === undefined) return;
      if (c.type === "time") t[s.challenge][s.house] = Math.min(t[s.challenge][s.house], s.points);
      else t[s.challenge][s.house] += s.points;
    });
    return t;
  }, [scores]);

  const standings = useMemo(() => {
    const pts = {};
    HOUSES.forEach((h) => (pts[h.key] = { total: 0, per: {} }));
    CHALLENGES.forEach((c) => {
      const rows = HOUSES.map((h) => ({ h, v: totals[c.key][h.key] }))
        .sort((a, b) => (c.type === "time" ? a.v - b.v : b.v - a.v));
      rows.forEach((r, i) => {
        const p = RANK_POINTS[i] || 0;
        pts[r.h.key].per[c.key] = p;
        pts[r.h.key].total += p;
      });
    });
    return pts;
  }, [totals]);

  const addPerson = useCallback((p) => setPeople((xs) => [...xs, p]), []);
  const markCheckedIn = useCallback((id) => setPeople((xs) => xs.map((p) => (p.id === id ? { ...p, checkedIn: true } : p))), []);
  const addScore = useCallback((s) => setScores((xs) => [...xs, { ...s, id: Date.now() }]), []);
  const removeScore = useCallback((id) => setScores((xs) => xs.filter((s) => s.id !== id)), []);

  if (page === "scores") return <Scores totals={totals} standings={standings} go={go} />;

  return (
    <>
      <Nav page={page} go={go} />
      <Ticker totals={totals} go={go} />
      {page === "home" && <Home key="home" go={go} people={people} totals={totals} />}
      {page === "register" && <Register addPerson={addPerson} go={go} />}
      {page === "invite" && <Invite go={go} />}
      {page === "checkin" && <CheckIn people={people} markCheckedIn={markCheckedIn} />}
      {page === "admin" && <Admin people={people} scores={scores} totals={totals} addScore={addScore} removeScore={removeScore} />}
      <footer className="foot">
        <div className="shell" style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <span>{EVENT.name} {EVENT.year} - {EVENT.venue}</span>
          <span>Internal event site. Not a Grab consumer product.</span>
        </div>
      </footer>
    </>
  );
}
