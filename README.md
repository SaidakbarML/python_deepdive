# Course Tracker

Lists the video posts from a Telegram channel on a simple webpage. Clicking a
lesson opens that exact video inside Telegram. Each lesson has a status
dropdown (Not watched / In progress / Done) saved in your browser.

## How it works

- `login.js` — run **once**, by you, in your own terminal. Logs in to your
  Telegram account and prints a session string.
- `sync.js` — uses that session to read the channel's message history and
  pull out every video (message id, caption as title, date, and a direct
  `t.me/<channel>/<id>` link).
- `server.js` — Express app. Serves the webpage, serves the video list as
  JSON, and re-syncs the channel automatically every few hours (schedule set
  by `SYNC_CRON`).
- Watch status is **not** stored on the server — it's saved in the visitor's
  browser (`localStorage`). That's intentional: free hosting tiers wipe the
  server's disk on redeploy/restart, but data in the browser survives that.
  It also means status doesn't sync across devices — say if you want that
  and I'll add a small database instead.

## 1. One-time Telegram login (do this yourself, not through an AI chat)

Your API ID and API hash are already filled into `.env`. Do **not** type
your Telegram login code or 2FA password into a chat with anyone or
anything — including an AI assistant. Run this directly in your own
terminal instead:

```bash
cd course-tracker
npm install
npm run login
```

It will ask for the login code Telegram just sent you, and your 2FA
password if you have one set. When it finishes it prints a long
`TG_SESSION` value — copy that into `.env` (replace the empty `TG_SESSION=`
line). That session string is equivalent to being logged into your account,
so keep `.env` private (it's already git-ignored).

## 2. Pull the video list

```bash
npm run sync
```

This writes `data/content.json`. You can rerun it any time; it also runs
automatically on server start and on the `SYNC_CRON` schedule.

## 3. Run it locally

```bash
npm start
```

Open http://localhost:3000.

## Deploying for free

**Render.com (recommended, easiest)**

1. Push this folder to a GitHub repo (make sure `.env` is *not* committed —
   `.gitignore` already excludes it).
2. On Render: New → Web Service → connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add environment variables from your local `.env` (`TG_API_ID`,
   `TG_API_HASH`, `TG_PHONE`, `TG_CHANNEL`, `TG_SESSION`, `ADMIN_KEY`, etc.)
   in Render's dashboard — don't put them in the repo.
5. Free web services on Render sleep after ~15 minutes idle and wake up
   slowly on the next request, and the disk is not persistent across
   deploys. Neither matters much here: the app re-syncs from Telegram on
   every boot, and status lives in the browser, not on disk.

**If you want it to never sleep:** the only *actually* free-forever,
always-on option is a small VM on a cloud "always free" tier — Oracle
Cloud's Always Free VM or Google Cloud's e2-micro free tier. That needs a
bit more setup (SSH in, install Node, run the app with `pm2` or a systemd
service) but has no sleep/cold-start and no time limit. Ask if you want a
walkthrough for either.

## Notes / caveats

- Uses the `telegram` (GramJS) package to log in as your own account (not a
  bot) — this is required to read a channel's full message history. GramJS
  itself is archived upstream (no longer actively maintained) but is still
  the most widely used and stable library for this; there's a community
  fork (`teleproto`) if GramJS ever breaks against a future Telegram API
  change.
- Only messages containing a video are listed; the first line of the
  caption is used as the title (falls back to "Video #<id>" if there's no
  caption).
- `POST /api/sync?key=<ADMIN_KEY>` lets you trigger a manual re-sync without
  waiting for the cron schedule.
