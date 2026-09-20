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

app.use(express.static(path.join(__dirname, "public")));

function loadContent() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

app.get("/api/content", (req, res) => {
  res.json(loadContent());
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
