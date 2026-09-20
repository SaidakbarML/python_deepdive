const STATUS_KEY = "course-tracker-status";
const STATUSES = [
  { value: "not_watched", label: "Not watched" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

function loadStatuses() {
  try {
    return JSON.parse(localStorage.getItem(STATUS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStatus(id, value) {
  const all = loadStatuses();
  all[id] = value;
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable (private browsing, etc.) — status just won't persist.
  }
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function render(items) {
  const statuses = loadStatuses();
  const list = document.getElementById("list");
  list.innerHTML = "";

  items.forEach((item) => {
    const status = statuses[item.id] || "not_watched";

    const li = document.createElement("li");
    li.className = "item" + (status === "done" ? " done" : "");

    const a = document.createElement("a");
    a.href = item.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `${item.title}<span class="date">${formatDate(item.date)}</span>`;

    const select = document.createElement("select");
    select.className = "status-select";
    STATUSES.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.value;
      opt.textContent = s.label;
      if (s.value === status) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      saveStatus(item.id, select.value);
      li.className = "item" + (select.value === "done" ? " done" : "");
    });

    li.appendChild(a);
    li.appendChild(select);
    list.appendChild(li);
  });
}

let allItems = [];

function applyFilter() {
  const statusEl = document.getElementById("status");
  const query = document.getElementById("search").value.trim().toLowerCase();
  const filtered = query
    ? allItems.filter((item) => item.title.toLowerCase().includes(query))
    : allItems;

  if (allItems.length === 0) {
    statusEl.textContent = "No videos found yet. The server may still be syncing — refresh in a bit.";
  } else if (query) {
    statusEl.textContent = `${filtered.length} of ${allItems.length} videos`;
  } else {
    statusEl.textContent = `${allItems.length} videos`;
  }

  render(filtered);
}

async function main() {
  const statusEl = document.getElementById("status");
  try {
    const res = await fetch("/api/content");
    allItems = await res.json();
    applyFilter();
  } catch (err) {
    statusEl.textContent = "Could not load content.";
  }

  document.getElementById("search").addEventListener("input", applyFilter);
}

main();
