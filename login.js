// One-time interactive login. Run this yourself with `npm run login`,
// directly in your own terminal — not pasted through any chat — so your
// Telegram login code and 2FA password never leave your machine.
//
// It logs in to YOUR Telegram account (using the API credentials from
// my.telegram.org) and prints a long "session string". Paste that string
// into .env as TG_SESSION. After that, login.js is never needed again;
// the server reuses the saved session.
require("dotenv").config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;

if (!apiId || !apiHash) {
  console.error("Set TG_API_ID and TG_API_HASH in .env first.");
  process.exit(1);
}

(async () => {
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => process.env.TG_PHONE || (await input.text("Phone number: ")),
    phoneCode: async () => await input.text("Login code Telegram just sent you: "),
    password: async () => await input.text("Telegram 2FA password (leave blank if you don't have one): "),
    onError: (err) => console.error(err),
  });

  console.log("\nLogged in successfully. Add this to your .env as TG_SESSION:\n");
  console.log(client.session.save());
  console.log("\nKeep this value secret — it grants full access to your Telegram account.");

  await client.disconnect();
  process.exit(0);
})();
