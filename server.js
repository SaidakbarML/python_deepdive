require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const { sync } = require("./sync");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const DATA_FILE = path.join(__dirname, "data", "content.json");
const SECTIONS_FILE = path.join(__dirname, "data", "sections.json");

app.use(express.static(path.join(__dirname, "public")));

function loadContent() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function loadSectionDefs() {
  try {
    return JSON.parse(fs.readFileSync(SECTIONS_FILE, "utf8"));
  } catch {
    return [];
  }
}

// Videos are stored as one flat, chronologically-ordered list (upload order).
// sections.json describes each course part and, within it, how many videos in
// a row belong to each named section. Anything left over after all known
// parts/sections are consumed (course parts we don't have a breakdown for
// yet) is kept together at the end so nothing gets dropped.
function groupContent(items, partDefs) {
  const parts = [];
  let cursor = 0;

  for (const partDef of partDefs) {
    const sections = [];
    for (const def of partDef.sections) {
      const slice = items.slice(cursor, cursor + def.count);
      if (slice.length === 0) break;
      sections.push({ name: def.name, items: slice });
      cursor += def.count;
    }
    if (sections.length > 0) {
      parts.push({ part: partDef.part, sections });
    }
  }

  if (cursor < items.length) {
    parts.push({ part: "🎓 Ungrouped", sections: [{ name: "📂 Ungrouped", items: items.slice(cursor) }] });
  }

  return parts;
}

app.get("/api/content", (req, res) => {
  const items = loadContent();
  const partDefs = loadSectionDefs();
  res.json(groupContent(items, partDefs));
});

app.post("/api/sync", async (req, res) => {
  if (!ADMIN_KEY || req.query.key !== ADMIN_KEY) {
    return res.status(403).json({ error: "forbidden" });
  }
  try {
    const items = await sync();
    res.json({ ok: true, count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  if (!process.env.TG_SESSION) {
    console.log('No TG_SESSION set yet — run "npm run login" then "npm run sync".');
    return;
  }

  // Populate the list on boot (disk is not guaranteed to persist on free hosts).
  sync().catch((err) => console.error("Initial sync failed:", err.message));

  cron.schedule(process.env.SYNC_CRON || "0 */6 * * *", () => {
    sync().catch((err) => console.error("Scheduled sync failed:", err.message));
  });
});
