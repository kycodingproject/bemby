# TikTok DMs: getting approved and switching it on

Bemby's TikTok code is built, but TikTok must approve the app before it works.
Replace `YOUR-SITE` with your permanent address (for example `bemby-app.vercel.app`).

## What to know first

- Works only with **TikTok Business accounts** (free to switch in the TikTok app: Settings → Account → Switch to Business Account).
- Not available for accounts registered in the EU/EEA, Switzerland or the UK.
- The client has to message first. Bemby can reply for **48 hours** after their last message.
- US accounts can send **text only** (Bemby can still read photos clients send).

## 1. Create the app

1. Sign up at https://developers.tiktok.com and verify your email.
2. Go to https://business-api.tiktok.com/portal/apps → **Create an app**.
3. Fill in:
   - App name: `Bemby`
   - Description: see "What to write" below
   - Icon: `public/bemby-app-icon-1024.png`
   - Terms of Service URL: `https://YOUR-SITE/terms`
   - Privacy Policy URL: `https://YOUR-SITE/privacy`
   - Redirect URL (advertiser/TikTok account redirect): `https://YOUR-SITE/api/connect/tiktok/callback`

## 2. Apply for the Business Messaging API

In the app, open **Business Messaging API** and apply. Under **Scope of permission** enable **TikTok Accounts**, including:
`user.info.basic`, `user.info.username`, `user.info.stats`, `user.info.profile`, `user.account.type`, `user.insights`,
`message.list.read`, `message.list.send`, `message.list.manage`.

### What to write

> Bemby is a receptionist for appointment-based small businesses (hair stylists, lash and brow artists, estheticians,
> tattoo artists, barbers). Business owners connect their own TikTok Business account. When a customer sends the
> business a direct message asking about services, prices or availability, Bemby replies on the business's behalf
> using the business's own service menu and hours, collects booking details, and sends an appointment request to the
> owner to approve. Bemby only replies to messages customers send first and only within TikTok's 48-hour window.
> Owners can read every conversation, take over at any time, and disconnect in Settings, which deletes their tokens.
> We do not sell data or use messages for advertising. Privacy policy: https://YOUR-SITE/privacy

Approval usually takes a few days, sometimes longer.

## 3. After approval: switch it on

1. In the TikTok app page, copy the **App ID** and **Secret**.
2. In Vercel → bemby → Settings → Environment Variables add `TIKTOK_APP_ID` and `TIKTOK_APP_SECRET` (mark the secret as Secret). Redeploy.
3. In Supabase → SQL Editor, run `supabase/migrations/0007_tiktok.sql`.
4. In Bemby → Settings → Where clients reach you, a **Connect TikTok** row appears. Connect your TikTok Business account.
   (Connecting also tells TikTok to send DMs to `https://YOUR-SITE/api/webhooks/tiktok`.)
5. In the TikTok app: Settings → Privacy → Direct messages → allow **Everyone**, so new clients' DMs aren't held as requests.
6. Test: from another TikTok account, DM the business "can I book an appointment friday?".

If nothing shows up, check Vercel → Logs for `tiktok webhook`.
