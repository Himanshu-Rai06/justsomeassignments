const OWNER = "ketan1406";
const REPO = "mlt-iitm";
const BRANCH = "main";
const FOLDER = "Graded-Assignments";

const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FOLDER}?ref=${BRANCH}`;
// jsDelivr serves PDFs with the right headers, so they render inside an iframe.
const cdnUrl = (name) =>
  `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/${FOLDER}/${encodeURIComponent(name)}`;

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const list = $("list"), statusEl = $("status"), filter = $("filter"), progress = $("progress");
const frame = $("frame"), bar = $("bar"), empty = $("empty"), viewer = $("viewer");
const titleEl = $("title"), openLink = $("open"), dlLink = $("download"), doneBox = $("doneBox");
const hint = $("hint"), canvas = $("canvas"), ctx = canvas.getContext("2d");

let files = [];
let current = null;

/* ---------- saved state (theme + which weeks are done) ---------- */
function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
function recall(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
let done = new Set(JSON.parse(recall("mlt-done") || "[]"));

function setDone(name, value) {
  value ? done.add(name) : done.delete(name);
  store("mlt-done", JSON.stringify([...done]));
  render();
  if (current === name) doneBox.checked = value;
}

/* ---------- helpers ---------- */
function weekNumber(name) {
  const m = name.match(/W-?(\d+)/i);
  return m ? parseInt(m[1], 10) : 999;
}
function label(name) {
  const n = weekNumber(name);
  return n === 999 ? name.replace(/\.pdf$/i, "") : `Week ${n}`;
}
function shortLabel(name) {
  const n = weekNumber(name);
  return n === 999 ? name.slice(0, 3) : `W${n}`;
}

/* ---------- list ---------- */
function render() {
  const q = filter.value.trim().toLowerCase();
  list.innerHTML = "";
  const shown = files.filter((f) => label(f.name).toLowerCase().includes(q));
  shown.forEach((f) => {
    const li = document.createElement("li");
    if (done.has(f.name)) li.className = "is-done";

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = done.has(f.name);
    box.setAttribute("aria-label", `Mark ${label(f.name)} as done`);
    box.addEventListener("change", () => setDone(f.name, box.checked));

    const b = document.createElement("button");
    b.textContent = label(f.name);
    b.dataset.name = f.name;
    if (current === f.name) b.setAttribute("aria-current", "true");
    b.addEventListener("click", () => openFile(f.name));

    li.append(box, b);
    list.appendChild(li);
  });
  statusEl.textContent = files.length && !shown.length ? "No week matches that." : statusEl.textContent;
  progress.textContent = files.length ? `${done.size} of ${files.length} done` : "";
}

/* ---------- viewer ---------- */
function openFile(name) {
  current = name;
  frame.src = cdnUrl(name);
  frame.hidden = false;
  empty.hidden = true;
  bar.hidden = false;
  viewer.classList.add("open");
  titleEl.textContent = label(name);
  openLink.href = cdnUrl(name);
  dlLink.href = cdnUrl(name);
  dlLink.setAttribute("download", name);
  doneBox.checked = done.has(name);
  list.querySelectorAll("button").forEach((b) => {
    b.dataset.name === name ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current");
  });
}
function closeViewer() {
  current = null;
  frame.src = "about:blank";
  frame.hidden = true;
  empty.hidden = false;
  bar.hidden = true;
  viewer.classList.remove("open");
  render();
}
doneBox.addEventListener("change", () => current && setDone(current, doneBox.checked));
$("close").addEventListener("click", closeViewer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && root.dataset.theme === "bubbles" && current) closeViewer();
});

/* ---------- themes ---------- */
function setTheme(t) {
  root.dataset.theme = t;
  store("mlt-theme", t);
  document.querySelectorAll(".themes button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.theme === t)));
  if (t === "bubbles") { if (current) closeViewer(); startBubbles(); }
  else stopBubbles();
}
document.querySelectorAll(".themes button").forEach((b) =>
  b.addEventListener("click", () => setTheme(b.dataset.theme)));

/* ---------- bubbles ---------- */
const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let bubbles = [], raf = 0, W = 0, H = 0, hover = null;
const ptr = { x: -999, y: -999 };

function sizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  W = rect.width; H = rect.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function buildBubbles() {
  const speed = calm ? 0.4 : 1.6;
  bubbles = files.map((f) => {
    const n = weekNumber(f.name);
    const r = 34 + ((n * 37) % 30);          // different sizes, same each visit
    return {
      name: f.name, n, r,
      x: r + Math.random() * Math.max(1, W - 2 * r),
      y: r + Math.random() * Math.max(1, H - 2 * r),
      vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed,
    };
  });
}
function bubbleAt(x, y) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    if (Math.hypot(b.x - x, b.y - y) <= b.r) return b;
  }
  return null;
}
function step() {
  hover = bubbleAt(ptr.x, ptr.y);
  const max = calm ? 0.6 : 2.6;
  for (const b of bubbles) {
    if (b === hover) { b.vx *= 0.88; b.vy *= 0.88; }
    else {
      const dx = b.x - ptr.x, dy = b.y - ptr.y, d = Math.hypot(dx, dy), reach = b.r + 60;
      if (d < reach && d > 0 && !calm) {
        const f = ((reach - d) / reach) * 0.5;
        b.vx += (dx / d) * f; b.vy += (dy / d) * f;
      }
      b.vx += (Math.random() - 0.5) * 0.03; b.vy += (Math.random() - 0.5) * 0.03;
    }
    b.vx *= 0.995; b.vy *= 0.995;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > max) { b.vx = (b.vx / sp) * max; b.vy = (b.vy / sp) * max; }
    b.x += b.vx; b.y += b.vy;
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
    if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
    if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
  }
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const a = bubbles[i], c = bubbles[j];
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + c.r;
      if (d < min) {
        const nx = dx / d, ny = dy / d, push = (min - d) / 2;
        a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
        const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        if (rel < 0) {
          a.vx += rel * nx; a.vy += rel * ny; c.vx -= rel * nx; c.vy -= rel * ny;
        }
      }
    }
  }
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const b of bubbles) {
    const isDone = done.has(b.name);
    const rr = b.r * (b === hover ? 1.08 : 1);
    const hue = isDone ? 150 : 185 + ((b.n * 29) % 110);
    const g = ctx.createRadialGradient(b.x - rr * 0.35, b.y - rr * 0.35, rr * 0.1, b.x, b.y, rr);
    g.addColorStop(0, `hsla(${hue},90%,90%,.95)`);
    g.addColorStop(1, `hsla(${hue},70%,55%,.55)`);
    ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.stroke();
    ctx.fillStyle = "#0a2f40";
    ctx.font = `600 ${Math.round(rr * 0.4)}px Fredoka, sans-serif`;
    ctx.fillText(shortLabel(b.name), b.x, b.y - (isDone ? rr * 0.08 : 0));
    if (isDone) {
      ctx.font = `700 ${Math.round(rr * 0.3)}px Nunito, sans-serif`;
      ctx.fillText("✓", b.x, b.y + rr * 0.42);
    }
  }
}
function loop() { step(); draw(); raf = requestAnimationFrame(loop); }
function startBubbles() {
  cancelAnimationFrame(raf);
  if (!files.length) return;
  sizeCanvas(); buildBubbles(); loop();
}
function stopBubbles() { cancelAnimationFrame(raf); }

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
}
canvas.addEventListener("pointermove", (e) => { pointerPos(e); canvas.style.cursor = hover ? "pointer" : "default"; });
canvas.addEventListener("pointerleave", () => { ptr.x = ptr.y = -999; });
canvas.addEventListener("pointerdown", (e) => {
  pointerPos(e);
  const b = bubbleAt(ptr.x, ptr.y);
  if (b) openFile(b.name);
});
window.addEventListener("resize", () => {
  if (root.dataset.theme !== "bubbles") return;
  sizeCanvas();
  bubbles.forEach((b) => { b.x = Math.min(b.x, W - b.r); b.y = Math.min(b.y, H - b.r); });
});

/* ---------- load ---------- */
function fail(msg) { statusEl.textContent = msg; hint.textContent = msg; }

async function load() {
  try {
    const res = await fetch(API);
    if (!res.ok) {
      throw new Error(res.status === 403
        ? "GitHub's request limit was hit. Try again in a few minutes."
        : `GitHub returned an error (${res.status}).`);
    }
    const data = await res.json();
    files = data
      .filter((f) => f.type === "file" && /\.pdf$/i.test(f.name))
      .sort((a, b) => weekNumber(a.name) - weekNumber(b.name));
    if (!files.length) return fail("No PDFs found in that folder.");
    statusEl.textContent = "";
    render();
    if (root.dataset.theme === "bubbles") startBubbles();
  } catch (err) {
    fail(err.message || "Couldn't load the list. Check your connection.");
  }
}

filter.addEventListener("input", render);
setTheme(recall("mlt-theme") || "graph");
load();
