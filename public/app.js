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

function renderItem(item, statuses) {
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
  return li;
}

function render(groups) {
  const statuses = loadStatuses();
  const container = document.getElementById("list");
  container.innerHTML = "";

  groups.forEach((group) => {
    if (group.items.length === 0) return;

    const section = document.createElement("section");
    section.className = "section";

    const heading = document.createElement("h2");
    heading.className = "section-heading";
    heading.textContent = group.name;
    section.appendChild(heading);

    const ul = document.createElement("ul");
    ul.className = "list";
    group.items.forEach((item) => ul.appendChild(renderItem(item, statuses)));
    section.appendChild(ul);

    container.appendChild(section);
  });
}

let allGroups = [];

function countItems(groups) {
  return groups.reduce((sum, g) => sum + g.items.length, 0);
}

function applyFilter() {
  const statusEl = document.getElementById("status");
  const query = document.getElementById("search").value.trim().toLowerCase();
  const total = countItems(allGroups);

  const filtered = query
    ? allGroups
        .map((g) => ({ name: g.name, items: g.items.filter((i) => i.title.toLowerCase().includes(query)) }))
        .filter((g) => g.items.length > 0)
    : allGroups;

  if (total === 0) {
    statusEl.textContent = "No videos found yet. The server may still be syncing — refresh in a bit.";
  } else if (query) {
    statusEl.textContent = `${countItems(filtered)} of ${total} videos`;
  } else {
    statusEl.textContent = `${total} videos`;
  }

  render(filtered);
}

async function main() {
  const statusEl = document.getElementById("status");
  try {
    const res = await fetch("/api/content");
    allGroups = await res.json();
    applyFilter();
  } catch (err) {
    statusEl.textContent = "Could not load content.";
  }

  document.getElementById("search").addEventListener("input", applyFilter);
}

main();
