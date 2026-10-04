const OWNER = "ketan1406";
const REPO = "mlt-iitm";
const BRANCH = "main";
const FOLDER = "Graded-Assignments";

const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FOLDER}?ref=${BRANCH}`;
// jsDelivr serves PDFs with the right headers, so they render inside an iframe.
const cdnUrl = (name) =>
  `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/${FOLDER}/${encodeURIComponent(name)}`;
const blobUrl = (name) =>
  `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${FOLDER}/${encodeURIComponent(name)}`;

const list = document.getElementById("list");
const statusEl = document.getElementById("status");
const filter = document.getElementById("filter");
const frame = document.getElementById("frame");
const bar = document.getElementById("bar");
const empty = document.getElementById("empty");
const titleEl = document.getElementById("title");
const openLink = document.getElementById("open");
const dlLink = document.getElementById("download");

let files = [];

function weekNumber(name) {
  const m = name.match(/W-?(\d+)/i);
  return m ? parseInt(m[1], 10) : 999;
}
function label(name) {
  const n = weekNumber(name);
  return n === 999 ? name.replace(/\.pdf$/i, "") : `Week ${n}`;
}

function render() {
  const q = filter.value.trim().toLowerCase();
  list.innerHTML = "";
  const shown = files.filter((f) => label(f.name).toLowerCase().includes(q));
  shown.forEach((f) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.textContent = label(f.name);
    b.dataset.name = f.name;
    if (frame.dataset.current === f.name) b.setAttribute("aria-current", "true");
    b.addEventListener("click", () => openFile(f.name));
    li.appendChild(b);
    list.appendChild(li);
  });
  statusEl.textContent = shown.length ? "" : "No week matches that.";
}

function openFile(name) {
  frame.dataset.current = name;
  frame.src = cdnUrl(name);
  frame.hidden = false;
  empty.hidden = true;
  bar.hidden = false;
  titleEl.textContent = label(name);
  openLink.href = cdnUrl(name);
  dlLink.href = cdnUrl(name);
  dlLink.setAttribute("download", name);
  list.querySelectorAll("button").forEach((b) => {
    b.toggleAttribute("aria-current", b.dataset.name === name);
    if (b.dataset.name === name) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
}

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
    if (!files.length) {
      statusEl.textContent = "No PDFs found in that folder.";
      return;
    }
    render();
  } catch (err) {
    statusEl.textContent = err.message || "Couldn't load the list. Check your connection.";
  }
}

filter.addEventListener("input", render);
load();
