import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { EVENT, HOUSES, DEPARTMENTS, CHALLENGES, RANK_POINTS, ITINERARY, ADMIN_PASSWORD, STAFF_PIN } from "./config";
import * as db from "./store";

/* ================= helpers ================= */

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
const houseOf = (k) => HOUSES.find((h) => h.key === k) || HOUSES[0];
const challengeOf = (k) => CHALLENGES.find((c) => c.key === k) || CHALLENGES[0];
const BG = (n) => ({ backgroundImage: "url(" + (process.env.PUBLIC_URL || "") + "/" + n + ")" });
const calmMotion = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
const stamp = (iso) => (iso ? new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const passUrl = (token) => window.location.origin + window.location.pathname + "#/pass/" + token;

/* ================= routing (hash based, so pass links survive a refresh) ================= */

function readRoute() {
  const parts = (window.location.hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
  return { page: parts[0] || "home", arg: parts[1] ? decodeURIComponent(parts[1]) : "" };
}

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((page, arg) => {
    window.location.hash = "/" + page + (arg ? "/" + encodeURIComponent(arg) : "");
    window.scrollTo({ top: 0, behavior: calmMotion() ? "auto" : "smooth" });
  }, []);
  return [route, go];
}

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
  const items = [["home", "Home"], ["rsvp", "RSVP"], ["pass", "My pass"], ["scores", "Live scores"], ["staff", "Staff"], ["admin", "Admin"]];
  const active = page === "checkin" || page === "gift" ? "staff" : page;
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
            <button key={k} className={"nav-link" + (k === "rsvp" ? " nav-cta" : "")} aria-current={active === k ? "page" : undefined} onClick={() => go(k)}>{label}</button>
          ))}
        </div>
      </div>
    </nav>
  );
}

function Ticker({ totals, go }) {
  const now = ITINERARY[2];
  const next = ITINERARY[3];
  return (
    <div className="ticker">
      <div className="shell ticker-in">
        <span className="live-dot" />
        <span className="ticker-now">{db.MODE === "demo" ? "Demo mode" : "Live"}: {now.name}</span>
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

/* ================= QR ================= */

function QrImg({ token, size = 220, className, style }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(passUrl(token), { width: size * 2, margin: 1, color: { dark: "#06180e", light: "#ffffff" } })
      .then((u) => live && setSrc(u))
      .catch(() => {});
    return () => { live = false; };
  }, [token, size]);
  return src
    ? <img src={src} width={size} height={size} alt={"QR pass " + token} className={className} style={{ borderRadius: 14, ...style }} />
    : <div style={{ width: size, height: size, borderRadius: 14, background: "var(--paper-2)", ...style }} />;
}

async function downloadPass(person) {
  const h = houseOf(person.house);
  const qr = await QRCode.toDataURL(passUrl(person.token), { width: 640, margin: 1 });
  const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = qr; });
  const W = 900, H = 1300;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  x.fillStyle = h.hex; x.fillRect(0, 0, W, 250);
  x.fillStyle = "#fff";
  x.font = "600 34px Archivo, Arial, sans-serif"; x.fillText(EVENT.name.toUpperCase() + " " + EVENT.year, 60, 90);
  x.font = "800 86px Archivo, Arial, sans-serif"; x.fillText("House " + h.name, 60, 195);
  x.drawImage(img, 130, 310, 640, 640);
  x.fillStyle = "#06180e"; x.textAlign = "center";
  x.font = "800 52px Archivo, Arial, sans-serif"; x.fillText(person.name, W / 2, 1040, W - 80);
  x.font = "500 34px Archivo, Arial, sans-serif"; x.fillStyle = "#2b4235";
  x.fillText(person.department + "  -  " + person.token, W / 2, 1100, W - 80);
  x.fillText(EVENT.dateLong, W / 2, 1170, W - 80);
  x.fillText(EVENT.venue, W / 2, 1220, W - 80);
  const a = document.createElement("a");
  a.href = cv.toDataURL("image/png");
  a.download = "grab-pass-" + person.token + ".png";
  a.click();
}

/* ================= slide to claim ================= */

function SlideToClaim({ label = "Slide to claim", onComplete, disabled }) {
  const track = useRef(null);
  const [x, setX] = useState(0);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = useRef(0);
  const max = () => (track.current ? track.current.clientWidth - 64 : 1);

  const down = (e) => {
    if (disabled || busy) return;
    setDrag(true);
    start.current = e.clientX - x;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drag) return;
    setX(Math.max(0, Math.min(max(), e.clientX - start.current)));
  };
  const up = async () => {
    if (!drag) return;
    setDrag(false);
    if (x >= max() * 0.9) {
      setX(max());
      setBusy(true);
      try { await onComplete(); } finally { setBusy(false); setX(0); }
    } else setX(0);
  };
  const pct = x / Math.max(1, max());

  return (
    <div ref={track} className={"slider" + (disabled ? " slider-off" : "")}>
      <span className="slider-fill" style={{ width: x + 64 }} />
      <span className="slider-label" style={{ opacity: 1 - pct }}>{busy ? "Claiming..." : label}</span>
      <button
        type="button" aria-label={label} className="slider-knob"
        style={{ transform: "translateX(" + x + "px)", transition: drag ? "none" : "transform .35s var(--bounce)" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onKeyDown={(e) => { if (!disabled && !busy && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onComplete(); } }}
      >&rarr;</button>
    </div>
  );
}

/* ================= camera scanner ================= */

function Scanner({ onCode, busy }) {
  const video = useRef(null);
  const canvas = useRef(null);
  const [on, setOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [code, setCode] = useState("");
  const last = useRef({ v: "", t: 0 });
  const cb = useRef(onCode);
  cb.current = onCode;

  const stop = useCallback(() => {
    const v = video.current;
    if (v && v.srcObject) { v.srcObject.getTracks().forEach((t) => t.stop()); v.srcObject = null; }
    setOn(false);
  }, []);

  const start = async () => {
    setCamErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.current.srcObject = stream;
      await video.current.play();
      setOn(true);
    } catch (e) {
      setCamErr("Camera not available. Allow camera access or type the pass code below.");
    }
  };

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (!on) return;
    let raf;
    const tick = () => {
      const v = video.current, c = canvas.current;
      if (v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
        c.width = v.videoWidth; c.height = v.videoHeight;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(v, 0, 0, c.width, c.height);
        const hit = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: "dontInvert" });
        const t = Date.now();
        if (hit && hit.data && (hit.data !== last.current.v || t - last.current.t > 4000)) {
          last.current = { v: hit.data, t };
          if (navigator.vibrate) navigator.vibrate(80);
          cb.current(hit.data);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  return (
    <div className="panel">
      <div className="scan-view">
        <video ref={video} playsInline muted className="scan-video" style={{ opacity: on ? 1 : 0 }} />
        <canvas ref={canvas} style={{ display: "none" }} />
        {on ? <span className="scan-frame" /> : (
          <div className="scan-idle">
            <GrabMark size={42} />
            <span>Point the camera at the guest's QR pass</span>
          </div>
        )}
      </div>
      <button className={"btn" + (on ? " btn-ghost" : "")} style={{ width: "100%", marginTop: 14 }} onClick={on ? stop : start}>
        {on ? "Stop camera" : "Start camera"}
      </button>
      {camErr && <p className="err" style={{ marginTop: 10 }}>{camErr}</p>}
      <div className="manual">
        <input className="input" value={code} onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) { onCode(code); setCode(""); } }}
          placeholder="Or type code, e.g. GRB-7K2QXM" />
        <button className="btn btn-ink" disabled={busy || !code.trim()} onClick={() => { onCode(code); setCode(""); }}>Look up</button>
      </div>
    </div>
  );
}

/* ================= home ================= */

function Home({ go, people, totals }) {
  const wrap = useReveal();
  const counts = useMemo(() => {
    const m = {};
    HOUSES.forEach((h) => (m[h.key] = 0));
    people.forEach((p) => { m[p.house] = (m[p.house] || 0) + 1; });
    return m;
  }, [people]);
  const checked = people.filter((p) => p.checkedInAt).length;
  const routeFill = ((2 + 0.5) / ITINERARY.length) * 100 + "%";

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
            RSVP is open
          </span>
          <h1>
            <span>Four houses.</span>
            <span>Three challenges.</span>
            <span>One epic Saturday.</span>
          </h1>
          <p className="hero-sub">
            {EVENT.dateLong} at {EVENT.venue}. RSVP, pick your colour, and your QR pass gets you in and gets you your door gift.
          </p>
          <div className="hero-cta">
            <button className="btn" onClick={() => go("rsvp")}>RSVP now <span className="btn-arrow">&rarr;</span></button>
            <button className="btn btn-ghost" onClick={() => go("scores")}>Watch live scores</button>
          </div>
          <div className="hero-flags">
            {HOUSES.map((h, i) => (
              <span key={h.key} className="flag" style={{ background: h.hex, animationDelay: i * 0.22 + "s" }} />
            ))}
          </div>
        </div>
        <div className="stat-band">
          <div className="stat"><div className="num stat-v"><Counter value={people.length} /></div><div className="stat-l">RSVP'd</div></div>
          <div className="stat"><div className="num stat-v"><Counter value={checked} /></div><div className="stat-l">checked in</div></div>
          <div className="stat"><div className="num stat-v">3</div><div className="stat-l">challenges</div></div>
          <div className="stat"><div className="num stat-v">4</div><div className="stat-l">houses in play</div></div>
        </div>
      </header>

      <section className="section bg-soft">
        <div className="shell">
          <div className="section-head reveal">
            <h2>How it works</h2>
            <p className="lede">Three steps from invite to door gift. No paper, no lists at the door.</p>
          </div>
          <div className="chal-grid steps-grid">
            {[
              ["1", "RSVP", "Name, department, email, phone and your house. Takes under a minute.", "rsvp", "RSVP now"],
              ["2", "Scan in", "Show your QR pass at the lobby desk. Staff scan it and you are checked in.", "pass", "Find my pass"],
              ["3", "Claim your gift", "At the gift counter, slide to claim. One gift per pass - it locks once claimed.", "pass", "Open my pass"],
            ].map(([n, t, b, to, cta], i) => (
              <article key={n} className={"chal reveal pop d" + (i + 1) + (i === 0 ? " chal-lead" : "")}>
                <div>
                  <div className="step-n num">{n}</div>
                  <div className="chal-name">{t}</div>
                  <p className="chal-blurb">{b}</p>
                </div>
                <div><button className={"btn btn-sm" + (i === 0 ? "" : " btn-ghost")} onClick={() => go(to)}>{cta}</button></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--ink)", position: "relative", overflow: "hidden" }}>
        <div className="bg-mesh" />
        <div className="shell" style={{ position: "relative", zIndex: 1 }}>
          <div className="section-head reveal" style={{ color: "#fff" }}>
            <h2>Pick a side</h2>
            <p className="lede" style={{ color: "#a9c1b4" }}>Your house is set when you RSVP and locked for the day. Wear your colour.</p>
          </div>
          <div className="house-strip">
            {HOUSES.map((h, i) => (
              <div key={h.key} className={"house-tile reveal pop d" + (i + 1)} style={{ background: h.hex }}>
                <div className="h-name">{h.name}</div>
                <div>
                  <div className="num" style={{ fontSize: 36 }}><Counter value={counts[h.key]} /></div>
                  <div className="h-count">members</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-soft">
        <div className="shell">
          <div className="section-head reveal">
            <h2>The three challenges</h2>
            <p className="lede">Every challenge keeps its own scoreboard, then rank points roll up into the overall cup.</p>
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

      <section className="section">
        <div className="shell split" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 44 }}>
          <div className="reveal">
            <h2 style={{ fontSize: 36, marginBottom: 8 }}>How the day runs</h2>
            <p className="lede" style={{ marginBottom: 24 }}>One route, seven stops.</p>
            <div className="route" style={{ "--route-fill": routeFill }}>
              {ITINERARY.map((s, i) => (
                <div key={s.time} className={"stop" + (i < 2 ? " stop-done" : i === 2 ? " stop-live" : "")}>
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
                It is on screen the moment you RSVP and in your inbox. Save it to your photos - the lobby signal is patchy and the queue moves fast.
              </p>
              <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-sm" onClick={() => go("rsvp")}>RSVP</button>
                <button className="btn btn-ghost btn-sm" onClick={() => go("pass")}>Find my pass</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ================= RSVP ================= */

function Rsvp({ go }) {
  const [f, setF] = useState({ name: "", department: "", email: "", house: "", phone: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e && e.target ? e.target.value : e })); if (err) setErr(""); };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr("Enter your full name.");
    if (!f.department) return setErr("Select your department.");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr("Enter a valid email.");
    if (!f.house) return setErr("Select your house.");
    if (f.phone.replace(/\D/g, "").length < 8) return setErr("Enter a valid phone number.");
    setBusy(true);
    try {
      const { person, duplicate } = await db.register(f);
      if (!duplicate) {
        const h = houseOf(person.house);
        fetch("/api/send-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: person.email, name: person.name, token: person.token, house: h.name, houseHex: h.hex, department: person.department, passUrl: passUrl(person.token), event: EVENT }),
        }).catch(() => {});
      }
      try { localStorage.setItem("grab_my_pass", person.token); } catch (x) { /* ignore */ }
      go("pass", person.token + (duplicate ? "~dup" : "~new"));
    } catch (x) {
      setErr("Could not save your RSVP. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell section" style={{ maxWidth: 640 }}>
      <span className="eyebrow-pill"><span className="live-dot" /> {EVENT.dateShort} - {EVENT.venue}</span>
      <h1 style={{ fontSize: 46, margin: "14px 0 10px" }}>RSVP</h1>
      <p className="lede" style={{ marginBottom: 30 }}>Under a minute. Your QR pass appears straight after and a copy goes to your inbox.</p>
      <form className="panel" onSubmit={submit} noValidate>
        <label className="field"><span className="field-label">Full name</span>
          <input className="input" value={f.name} onChange={set("name")} autoComplete="name" placeholder="Nurul Aisyah binti Rahman" /></label>
        <label className="field"><span className="field-label">Department</span>
          <select className="input" value={f.department} onChange={set("department")}>
            <option value="" disabled>Select your department</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select></label>
        <label className="field"><span className="field-label">Email</span>
          <input className="input" type="email" value={f.email} onChange={set("email")} autoComplete="email" placeholder="name@grab.com" /></label>
        <div className="field">
          <span className="field-label">Your house</span>
          <div className="house-pick">
            {HOUSES.map((h) => (
              <button type="button" key={h.key} className="house-opt" aria-pressed={f.house === h.key}
                style={{ "--h": h.hex }} onClick={() => set("house")(h.key)}>
                <span className="house-swatch" />{h.name}
              </button>
            ))}
          </div>
        </div>
        <label className="field"><span className="field-label">Phone number</span>
          <input className="input" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" placeholder="+60 12-345 6789" /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn" type="submit" disabled={busy} style={{ marginTop: 14, width: "100%" }}>
          {busy ? "Saving..." : <>Confirm my RSVP <span className="btn-arrow">&rarr;</span></>}
        </button>
        <p className="hint" style={{ marginTop: 14, textAlign: "center" }}>
          Already RSVP'd? <button type="button" className="linkish" onClick={() => go("pass")}>Find your pass</button>
        </p>
      </form>
    </div>
  );
}

/* ================= pass ================= */

function FindPass({ go, note }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState(note || "");
  const [busy, setBusy] = useState(false);
  let saved = null;
  try { saved = localStorage.getItem("grab_my_pass"); } catch (e) { /* ignore */ }

  const find = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setErr("Enter the email you RSVP'd with.");
    setBusy(true);
    try {
      const p = await db.findByEmail(email);
      if (p) go("pass", p.token);
      else setErr("No RSVP found for that email.");
    } catch (x) { setErr("Could not look that up. Try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="shell section" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 46, marginBottom: 10 }}>My pass</h1>
      <p className="lede" style={{ marginBottom: 28 }}>Enter the email you used to RSVP and we will pull up your QR.</p>
      <form className="panel" onSubmit={find}>
        <label className="field"><span className="field-label">Email</span>
          <input className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="name@grab.com" /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn" style={{ width: "100%", marginTop: 8 }} disabled={busy}>{busy ? "Looking..." : "Show my pass"}</button>
        {saved && <button type="button" className="btn btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => go("pass", saved)}>Open the pass saved on this phone</button>}
        <p className="hint" style={{ marginTop: 14, textAlign: "center" }}>Not registered yet? <button type="button" className="linkish" onClick={() => go("rsvp")}>RSVP here</button></p>
      </form>
    </div>
  );
}

function StatusRow({ person }) {
  return (
    <div className="status-row">
      <span className={"status" + (person.checkedInAt ? " status-ok" : "")}>
        {person.checkedInAt ? "Checked in " + clock(person.checkedInAt) : "Not checked in"}
      </span>
      <span className={"status" + (person.giftClaimedAt ? " status-gift" : "")}>
        {person.giftClaimedAt ? "Gift claimed " + clock(person.giftClaimedAt) : "Gift not claimed"}
      </span>
    </div>
  );
}

function Pass({ arg, people, go, toast }) {
  const [token, flag] = arg.split("~");
  const person = people.find((p) => p.token === db.normToken(token));
  if (!token) return <FindPass go={go} />;
  if (!person) return <FindPass go={go} note="That pass code was not found." />;
  const h = houseOf(person.house);

  const claim = async () => {
    const r = await db.claimGift(person.token);
    if (r.ok) toast("Door gift claimed. Enjoy!", "ok");
    else if (r.already) toast("This pass has already claimed its gift.", "bad");
    else if (r.notCheckedIn) toast("Check in at the lobby first.", "bad");
  };

  return (
    <div className="shell section" style={{ maxWidth: 640 }}>
      {flag === "new" && <div className="banner banner-ok">You're in, {person.name.split(" ")[0]}! Save this pass - a copy is on its way to {person.email}.</div>}
      {flag === "dup" && <div className="banner">This email has already RSVP'd. Here is the existing pass.</div>}
      <div className="trip pass-card">
        <div className="trip-band" style={{ background: h.hex }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{EVENT.name} {EVENT.year}</div>
            <div className="wide" style={{ fontSize: 33, fontWeight: 700 }}>House {h.name}</div>
          </div>
          <GrabMark size={30} />
        </div>
        <div className="trip-body">
          <div className="pass-qr">
            <QrImg token={person.token} size={220} />
            <div className="num pass-token">{person.token}</div>
          </div>
          <StatusRow person={person} />
          <div className="kv"><span>Name</span><span>{person.name}</span></div>
          <div className="kv"><span>Department</span><span>{person.department}</span></div>
          <div className="kv"><span>Email</span><span>{person.email}</span></div>
          <div className="kv"><span>Phone</span><span>{person.phone}</span></div>
          <div className="kv"><span>When</span><span>{EVENT.dateShort}, doors {EVENT.doorsOpen}</span></div>

          <div className="gift-box">
            <strong>{EVENT.gift}</strong>
            {person.giftClaimedAt ? (
              <div className="claimed-stamp">CLAIMED <span>{stamp(person.giftClaimedAt)}</span></div>
            ) : person.checkedInAt ? (
              <>
                <p className="hint" style={{ margin: "6px 0 14px" }}>Only slide in front of the gift counter staff. One gift per pass - this cannot be undone.</p>
                <SlideToClaim label="Slide to claim gift" onComplete={claim} />
              </>
            ) : (
              <p className="hint" style={{ marginTop: 6 }}>Unlocks after you check in at the lobby desk.</p>
            )}
          </div>

          <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-ink btn-sm" onClick={() => downloadPass(person)}>Save pass image</button>
            <button className="btn btn-ghost btn-sm" onClick={() => go("scores")}>Live scores</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= staff: check-in & gift counter ================= */

function PinGate({ children, title }) {
  const [ok, setOk] = useState(() => { try { return sessionStorage.getItem("grab_staff") === "1"; } catch (e) { return false; } });
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  if (ok) return children;
  const enter = (e) => {
    e.preventDefault();
    if (pin === STAFF_PIN || pin === ADMIN_PASSWORD) {
      try { sessionStorage.setItem("grab_staff", "1"); } catch (x) { /* ignore */ }
      setOk(true);
    } else setErr("Wrong PIN.");
  };
  return (
    <div className="shell section" style={{ maxWidth: 440 }}>
      <h1 style={{ fontSize: 40, marginBottom: 10 }}>{title}</h1>
      <p className="lede" style={{ marginBottom: 24 }}>Staff only. Enter the event PIN.</p>
      <form className="panel" onSubmit={enter}>
        <input className="input" type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setErr(""); }} placeholder="PIN" autoFocus />
        {err && <p className="err" style={{ marginTop: 10 }}>{err}</p>}
        <button className="btn" style={{ width: "100%", marginTop: 14 }}>Unlock</button>
        {db.MODE === "demo" && <p className="hint" style={{ marginTop: 12 }}>Demo PIN: {STAFF_PIN}</p>}
      </form>
    </div>
  );
}

function StaffHome({ go, people }) {
  const checked = people.filter((p) => p.checkedInAt).length;
  const gifts = people.filter((p) => p.giftClaimedAt).length;
  return (
    <div className="shell section" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 46, marginBottom: 10 }}>Staff stations</h1>
      <p className="lede" style={{ marginBottom: 28 }}>Open one station per device. Everything syncs live.</p>
      <div className="station-grid">
        <button className="station" onClick={() => go("checkin")}>
          <span className="station-n num">{checked}<small>/{people.length}</small></span>
          <span className="station-t">Lobby check-in</span>
          <span className="hint">Scan QR to mark arrival</span>
        </button>
        <button className="station station-gift" onClick={() => go("gift")}>
          <span className="station-n num">{gifts}<small>/{checked}</small></span>
          <span className="station-t">Gift counter</span>
          <span className="hint">Scan QR, slide to redeem once</span>
        </button>
      </div>
    </div>
  );
}

function PersonCard({ person, tone, headline, children }) {
  const h = houseOf(person.house);
  return (
    <div className={"trip result result-" + tone} style={{ marginTop: 20 }}>
      <div className="trip-band" style={{ background: h.hex }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.92 }}>House {h.name} - {person.department}</div>
          <div className="wide" style={{ fontSize: 29, fontWeight: 700 }}>{person.name}</div>
        </div>
        <div className="num" style={{ fontSize: 15 }}>{person.token}</div>
      </div>
      <div className="trip-body">
        <div className={"result-head result-head-" + tone}>{headline}</div>
        {children}
      </div>
    </div>
  );
}

function CheckInStation({ go }) {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const onCode = async (raw) => {
    setBusy(true);
    try {
      const r = await db.checkIn(raw);
      setRes(r.person ? r : { missing: db.normToken(raw) });
    } catch (e) { setRes({ error: true }); }
    finally { setBusy(false); }
  };
  return (
    <div className="shell section" style={{ maxWidth: 640 }}>
      <button className="linkish" onClick={() => go("staff")}>&larr; Stations</button>
      <h1 style={{ fontSize: 42, margin: "8px 0 20px" }}>Lobby check-in</h1>
      <Scanner onCode={onCode} busy={busy} />
      {res && res.person && (
        <PersonCard key={res.person.token + res.already} person={res.person} tone={res.already ? "warn" : "ok"}
          headline={res.already ? "Already checked in at " + clock(res.person.checkedInAt) : "Welcome! Checked in"}>
          <StatusRow person={res.person} />
          <p className="hint" style={{ marginTop: 10 }}>Next stop: the gift counter.</p>
        </PersonCard>
      )}
      {res && res.missing !== undefined && <div className="banner banner-bad" style={{ marginTop: 20 }}>No RSVP matches {res.missing || "that code"}. Send the guest to the help desk.</div>}
      {res && res.error && <div className="banner banner-bad" style={{ marginTop: 20 }}>Connection problem - try again.</div>}
    </div>
  );
}

function GiftStation({ go, people, toast }) {
  const [token, setToken] = useState("");
  const [missing, setMissing] = useState("");
  const [busy, setBusy] = useState(false);
  const person = token ? people.find((p) => p.token === token) : null;

  const onCode = async (raw) => {
    const t = db.normToken(raw);
    setBusy(true);
    try {
      const p = await db.findByToken(t);
      if (p) { setToken(p.token); setMissing(""); }
      else { setToken(""); setMissing(t); }
    } catch (e) { setMissing(t); }
    finally { setBusy(false); }
  };
  const claim = async () => {
    const r = await db.claimGift(token);
    if (r.ok) toast("Gift redeemed for " + r.person.name, "ok");
    else if (r.already) toast("Already claimed!", "bad");
  };
  const checkInNow = async () => { await db.checkIn(token); };

  return (
    <div className="shell section" style={{ maxWidth: 640 }}>
      <button className="linkish" onClick={() => go("staff")}>&larr; Stations</button>
      <h1 style={{ fontSize: 42, margin: "8px 0 20px" }}>Gift counter</h1>
      <Scanner onCode={onCode} busy={busy} />
      {missing && <div className="banner banner-bad" style={{ marginTop: 20 }}>No RSVP matches {missing}.</div>}
      {person && (person.giftClaimedAt ? (
        <PersonCard key={person.token + "c"} person={person} tone="bad" headline="ALREADY CLAIMED">
          <div className="claimed-stamp claimed-big">CLAIMED <span>{stamp(person.giftClaimedAt)}</span></div>
          <p className="hint" style={{ marginTop: 10 }}>Do not hand over another gift.</p>
        </PersonCard>
      ) : !person.checkedInAt ? (
        <PersonCard key={person.token + "n"} person={person} tone="warn" headline="Not checked in yet">
          <p className="hint" style={{ marginBottom: 14 }}>The guest skipped the lobby desk. Check them in here, then redeem.</p>
          <button className="btn btn-ink" onClick={checkInNow}>Check in now</button>
        </PersonCard>
      ) : (
        <PersonCard key={person.token + "r"} person={person} tone="ok" headline="Ready to redeem">
          <SlideToClaim label="Slide to redeem gift" onComplete={claim} />
          <p className="hint" style={{ marginTop: 10 }}>Hand over the gift once this card turns to CLAIMED.</p>
        </PersonCard>
      ))}
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
                  {mv > 0 ? "▲" : "▼"}{Math.abs(mv)}
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

function Scores({ totals, standings, go, arg }) {
  const board = BOARD_KEYS.indexOf(arg) >= 0 ? arg : "overall";
  const setBoard = (b) => go("scores", b);
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
                ? "Rank points - " + RANK_POINTS[0] + " for winning a challenge, down to 1"
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

function AdminLogin({ onOk }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      try { sessionStorage.setItem("grab_admin", "1"); sessionStorage.setItem("grab_staff", "1"); } catch (x) { /* ignore */ }
      onOk();
    } else setErr("Wrong password.");
  };
  return (
    <div className="shell section" style={{ maxWidth: 440 }}>
      <h1 style={{ fontSize: 46, marginBottom: 10 }}>Admin</h1>
      <p className="lede" style={{ marginBottom: 24 }}>Guest list, check-in and gift status, scoring.</p>
      <form className="panel" onSubmit={submit}>
        <input className="input" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="Admin password" autoFocus />
        {err && <p className="err" style={{ marginTop: 10 }}>{err}</p>}
        <button className="btn" style={{ width: "100%", marginTop: 14 }}>Sign in</button>
        {db.MODE === "demo" && <p className="hint" style={{ marginTop: 12 }}>Demo password: {ADMIN_PASSWORD}</p>}
      </form>
    </div>
  );
}

function Overview({ people }) {
  const total = people.length;
  const checked = people.filter((p) => p.checkedInAt).length;
  const gifts = people.filter((p) => p.giftClaimedAt).length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const byDept = DEPARTMENTS.map((d) => ({ d, n: people.filter((p) => p.department === d).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  const maxDept = Math.max(1, ...byDept.map((x) => x.n));
  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="num kpi-v"><Counter value={total} /></div><div className="kpi-l">RSVP'd</div></div>
        <div className="kpi"><div className="num kpi-v"><Counter value={checked} /></div><div className="kpi-l">Checked in <b>{pct(checked, total)}%</b></div></div>
        <div className="kpi"><div className="num kpi-v"><Counter value={gifts} /></div><div className="kpi-l">Gifts claimed <b>{pct(gifts, checked)}%</b></div></div>
        <div className="kpi"><div className="num kpi-v"><Counter value={total - checked} /></div><div className="kpi-l">Yet to arrive</div></div>
      </div>
      <div className="split" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20, marginTop: 20 }}>
        <div className="panel">
          <h3 style={{ fontSize: 22, marginBottom: 16 }}>By house</h3>
          {HOUSES.map((h) => {
            const mine = people.filter((p) => p.house === h.key);
            const inn = mine.filter((p) => p.checkedInAt).length;
            return (
              <div key={h.key} className="bar-row">
                <span className="bar-label"><span className="chip-dot" style={{ background: h.hex }} />{h.name}</span>
                <span className="bar"><span style={{ width: pct(mine.length, Math.max(1, total)) + "%", background: h.hex }} /></span>
                <span className="num bar-n">{inn}/{mine.length}</span>
              </div>
            );
          })}
          <p className="hint" style={{ marginTop: 8 }}>Checked in / RSVP'd</p>
        </div>
        <div className="panel">
          <h3 style={{ fontSize: 22, marginBottom: 16 }}>By department</h3>
          {byDept.length === 0 && <p className="hint">No RSVPs yet.</p>}
          {byDept.map((x) => (
            <div key={x.d} className="bar-row">
              <span className="bar-label">{x.d}</span>
              <span className="bar"><span style={{ width: (x.n / maxDept) * 100 + "%", background: "var(--grab)" }} /></span>
              <span className="num bar-n">{x.n}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function exportCsv(rows) {
  const head = ["Name", "Department", "Email", "Phone", "House", "Pass code", "RSVP at", "Checked in at", "Gift claimed at"];
  const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const lines = [head.map(q).join(",")].concat(rows.map((p) =>
    [p.name, p.department, p.email, p.phone, houseOf(p.house).name, p.token, stamp(p.createdAt), stamp(p.checkedInAt), stamp(p.giftClaimedAt)].map(q).join(",")));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "grab-rsvp-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
}

function Roster({ people, go, toast }) {
  const [q, setQ] = useState("");
  const [house, setHouse] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const rows = people.filter((p) => {
    const s = q.trim().toLowerCase();
    if (s && ![p.name, p.email, p.token, p.phone].some((v) => String(v).toLowerCase().includes(s))) return false;
    if (house && p.house !== house) return false;
    if (dept && p.department !== dept) return false;
    if (status === "in" && !p.checkedInAt) return false;
    if (status === "out" && p.checkedInAt) return false;
    if (status === "gift" && !p.giftClaimedAt) return false;
    if (status === "nogift" && (!p.checkedInAt || p.giftClaimedAt)) return false;
    return true;
  }).slice().reverse();

  const act = async (fn, msg) => { try { await fn(); toast(msg, "ok"); } catch (e) { toast("Failed - try again", "bad"); } };

  return (
    <div className="panel" style={{ padding: 0 }}>
      <div className="roster-tools">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone or pass code" />
        <select className="input" value={house} onChange={(e) => setHouse(e.target.value)}>
          <option value="">All houses</option>
          {HOUSES.map((h) => <option key={h.key} value={h.key}>{h.name}</option>)}
        </select>
        <select className="input" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          <option value="in">Checked in</option>
          <option value="out">Not arrived</option>
          <option value="gift">Gift claimed</option>
          <option value="nogift">In, gift pending</option>
        </select>
        <button className="btn btn-ink btn-sm" onClick={() => exportCsv(rows)}>Export CSV ({rows.length})</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="grid">
          <thead><tr><th>Name</th><th>Department</th><th>Contact</th><th>House</th><th>Pass</th><th>Check-in</th><th>Gift</th><th /></tr></thead>
          <tbody>
            {rows.map((p) => {
              const h = houseOf(p.house);
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>{p.name}</td>
                  <td>{p.department}</td>
                  <td style={{ fontSize: 14 }}>{p.email}<br /><span style={{ color: "var(--ink-3)" }}>{p.phone}</span></td>
                  <td><span className="tag" style={{ background: h.hex + "22", color: h.hex }}><span className="chip-dot" style={{ background: h.hex }} />{h.name}</span></td>
                  <td className="num" style={{ fontSize: 14 }}><button className="linkish" onClick={() => go("pass", p.token)}>{p.token}</button></td>
                  <td>{p.checkedInAt ? <span className="tag" style={{ background: "var(--grab-wash)", color: "var(--grab-deep)" }}>{clock(p.checkedInAt)}</span> : <span className="tag">Not yet</span>}</td>
                  <td>{p.giftClaimedAt ? <span className="tag tag-gift">{clock(p.giftClaimedAt)}</span> : <span className="tag">-</span>}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {p.checkedInAt
                      ? <button className="btn btn-ghost btn-xs" onClick={() => act(() => db.updatePerson(p.id, { checkedInAt: null, giftClaimedAt: null }), "Check-in reset")}>Undo in</button>
                      : <button className="btn btn-ghost btn-xs" onClick={() => act(() => db.checkIn(p.token), "Checked in")}>Check in</button>}
                    {p.giftClaimedAt && <button className="btn btn-ghost btn-xs" onClick={() => window.confirm("Reset the gift claim for " + p.name + "?") && act(() => db.updatePerson(p.id, { giftClaimedAt: null }), "Gift reset")}>Reset gift</button>}
                    <button className="btn btn-ghost btn-xs btn-danger" onClick={() => window.confirm("Delete " + p.name + "'s RSVP?") && act(() => db.deletePerson(p.id), "Deleted")}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={8} style={{ color: "var(--ink-3)", padding: 28 }}>Nobody matches those filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreEntry({ totals, toast }) {
  const [challenge, setChallenge] = useState("fitness");
  const [house, setHouse] = useState("red");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const c = challengeOf(challenge);
  const isTime = c.type === "time";

  const submit = async () => {
    let n;
    if (isTime) {
      n = parseTime(points);
      if (n === null) return setErr("Use M:SS:CC, for example 4:50:10");
    } else {
      n = Number(points);
      if (!points.trim() || Number.isNaN(n)) return setErr("Enter a number.");
    }
    setErr("");
    try {
      await db.addScore({ challenge, house, points: n, note: note.trim(), by: "Marshal" });
      toast(isTime
        ? houseOf(house).name + " logged " + fmtTime(n) + " on " + c.name
        : (n > 0 ? "+" : "") + n + " to " + houseOf(house).name + " on " + c.name, "ok");
      setPoints(""); setNote("");
    } catch (e) { setErr("Could not save. Try again."); }
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

function Ledger({ scores, toast }) {
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
                  <td style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm" onClick={() => db.removeScore(s.id).then(() => toast("Score removed", "ok"))}>Undo</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Admin({ people, scores, totals, go, toast }) {
  const [ok, setOk] = useState(() => { try { return sessionStorage.getItem("grab_admin") === "1"; } catch (e) { return false; } });
  const [tab, setTab] = useState("overview");
  if (!ok) return <AdminLogin onOk={() => setOk(true)} />;
  const logout = () => { try { sessionStorage.removeItem("grab_admin"); sessionStorage.removeItem("grab_staff"); } catch (e) { /* ignore */ } setOk(false); };
  return (
    <div className="shell section">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <h1 style={{ fontSize: 46, marginRight: "auto" }}>Admin</h1>
        {db.MODE === "demo" && <button className="btn btn-ghost btn-sm" onClick={() => window.confirm("Reset all demo data?") && db.resetDemo()}>Reset demo data</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => go("staff")}>Staff stations</button>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
      </div>
      <div className="tabs" role="tablist">
        {[["overview", "Overview"], ["roster", "Guests (" + people.length + ")"], ["score", "Scoring"], ["ledger", "Score ledger"]].map(([k, label]) => (
          <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === "overview" && <Overview people={people} />}
      {tab === "roster" && <Roster people={people} go={go} toast={toast} />}
      {tab === "score" && <ScoreEntry totals={totals} toast={toast} />}
      {tab === "ledger" && <Ledger scores={scores} toast={toast} />}
    </div>
  );
}

/* ================= root ================= */

export default function App() {
  const [route, go] = useRoute();
  const [people, setPeople] = useState([]);
  const [scores, setScores] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [toastMsg, setToastMsg] = useState(null);

  const refresh = useCallback(() => {
    db.loadAll()
      .then((d) => { setPeople(d.people); setScores(d.scores); setLoaded(true); setLoadErr(""); })
      .catch(() => setLoadErr("Can't reach the database. Retrying..."));
  }, []);

  useEffect(() => {
    refresh();
    return db.subscribe(refresh);
  }, [refresh]);

  const toast = useCallback((text, tone) => {
    setToastMsg({ text, tone, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2800);
    return () => clearTimeout(t);
  }, [toastMsg]);

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

  const { page, arg } = route;
  const toastEl = toastMsg && <div key={toastMsg.id} className={"toast toast-" + (toastMsg.tone || "ok")} role="status">{toastMsg.text}</div>;

  if (page === "scores") return <><Scores totals={totals} standings={standings} go={go} arg={arg} />{toastEl}</>;

  let body;
  if (!loaded && page !== "home" && page !== "rsvp") body = <div className="shell section"><p className="lede">{loadErr || "Loading..."}</p></div>;
  else if (page === "rsvp") body = <Rsvp go={go} />;
  else if (page === "pass") body = <Pass key={arg} arg={arg} people={people} go={go} toast={toast} />;
  else if (page === "staff") body = <PinGate title="Staff stations"><StaffHome go={go} people={people} /></PinGate>;
  else if (page === "checkin") body = <PinGate title="Lobby check-in"><CheckInStation go={go} /></PinGate>;
  else if (page === "gift") body = <PinGate title="Gift counter"><GiftStation go={go} people={people} toast={toast} /></PinGate>;
  else if (page === "admin") body = <Admin people={people} scores={scores} totals={totals} go={go} toast={toast} />;
  else body = <Home key="home" go={go} people={people} totals={totals} />;

  return (
    <>
      <Nav page={page} go={go} />
      <Ticker totals={totals} go={go} />
      {loadErr && loaded && <div className="banner banner-bad" style={{ borderRadius: 0, margin: 0 }}>{loadErr}</div>}
      {body}
      {toastEl}
      <footer className="foot">
        <div className="shell" style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <span>{EVENT.name} {EVENT.year} - {EVENT.venue}</span>
          <span>{db.MODE === "demo" ? "Demo mode - data is stored on this device only." : "Internal event site."}</span>
        </div>
      </footer>
    </>
  );
}
