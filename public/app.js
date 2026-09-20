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

function partItemCount(part) {
  return part.sections.reduce((sum, s) => sum + s.items.length, 0);
}

function countDone(items, statuses) {
  return items.filter((item) => statuses[item.id] === "done").length;
}

function renderProgressBar(done, total) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const wrap = document.createElement("div");
  wrap.className = "progress";
  wrap.innerHTML = `
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    <div class="progress-text">${pct}% complete — ${done} of ${total} videos done</div>
  `;
  return wrap;
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
    refresh();
  });

  li.appendChild(a);
  li.appendChild(select);
  return li;
}

function render(parts) {
  const statuses = loadStatuses();
  const container = document.getElementById("list");
  container.innerHTML = "";

  parts.forEach((part) => {
    const items = part.sections.flatMap((s) => s.items);
    if (items.length === 0) return;

    const partEl = document.createElement("section");
    partEl.className = "part";

    const heading = document.createElement("h2");
    heading.className = "part-heading";
    heading.textContent = part.part;
    partEl.appendChild(heading);

    partEl.appendChild(renderProgressBar(countDone(items, statuses), items.length));

    part.sections.forEach((section) => {
      if (section.items.length === 0) return;

      const sectionEl = document.createElement("div");
      sectionEl.className = "section";

      const sectionHeading = document.createElement("h3");
      sectionHeading.className = "section-heading";
      sectionHeading.textContent = section.name;
      sectionEl.appendChild(sectionHeading);

      const ul = document.createElement("ul");
      ul.className = "list";
      section.items.forEach((item) => ul.appendChild(renderItem(item, statuses)));
      sectionEl.appendChild(ul);

      partEl.appendChild(sectionEl);
    });

    container.appendChild(partEl);
  });
}

let allParts = [];

function countAllItems(parts) {
  return parts.reduce((sum, p) => sum + partItemCount(p), 0);
}

function renderOverallProgress() {
  const total = countAllItems(allParts);
  const statuses = loadStatuses();
  const allItems = allParts.flatMap((p) => p.sections.flatMap((s) => s.items));
  const done = countDone(allItems, statuses);

  const holder = document.getElementById("overall-progress");
  holder.innerHTML = "";
  if (total > 0) holder.appendChild(renderProgressBar(done, total));
}

function applyFilter() {
  const statusEl = document.getElementById("status");
  const query = document.getElementById("search").value.trim().toLowerCase();
  const total = countAllItems(allParts);

  const filtered = query
    ? allParts
        .map((p) => ({
          part: p.part,
          sections: p.sections
            .map((s) => ({ name: s.name, items: s.items.filter((i) => i.title.toLowerCase().includes(query)) }))
            .filter((s) => s.items.length > 0),
        }))
        .filter((p) => p.sections.length > 0)
    : allParts;

  const filteredTotal = countAllItems(filtered);

  if (total === 0) {
    statusEl.textContent = "No videos found yet. The server may still be syncing — refresh in a bit.";
  } else if (query) {
    statusEl.textContent = `${filteredTotal} of ${total} videos`;
  } else {
    statusEl.textContent = `${total} videos`;
  }

  render(filtered);
}

function refresh() {
  applyFilter();
  renderOverallProgress();
}

async function main() {
  const statusEl = document.getElementById("status");
  try {
    const res = await fetch("/api/content");
    allParts = await res.json();
    refresh();
  } catch (err) {
    statusEl.textContent = "Could not load content.";
  }

  document.getElementById("search").addEventListener("input", applyFilter);
}

main();
