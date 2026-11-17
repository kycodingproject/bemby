# Meta App Review: what to submit for Bemby

Meta must approve Bemby before businesses other than your app's testers can connect Instagram.
Replace `YOUR-SITE` with your real address (for example `bemby-xyz.vercel.app`).

## Before you submit

- [ ] Fill in your legal name and support email (Vercel env vars `NEXT_PUBLIC_LEGAL_OPERATOR`, `NEXT_PUBLIC_CONTACT_EMAIL`, optionally `NEXT_PUBLIC_LEGAL_STATE`), redeploy, and check https://YOUR-SITE/privacy shows them.
- [ ] Remove `SITE_PASSWORD` from Vercel (sign-in now protects the dashboard) so reviewers can open the site. Redeploy.
- [ ] Create a reviewer test account on Bemby (email + password) with a finished setup and an active plan (Stripe test mode is fine).
- [ ] Complete **Business Verification** for your Meta Business portfolio (Meta asks for business documents; this can take a few days).

## App settings (App settings → Basic)

| Field | Value |
|---|---|
| App icon | `public/bemby-app-icon-1024.png` |
| Privacy policy URL | https://YOUR-SITE/privacy |
| Terms of service URL | https://YOUR-SITE/terms |
| User data deletion | Data deletion callback URL: https://YOUR-SITE/api/meta/data-deletion (or instructions URL: https://YOUR-SITE/data-deletion) |
| Category | Business and pages |
| App domain | YOUR-SITE |

Instagram API (Business login settings):
- Deauthorize callback URL: https://YOUR-SITE/api/meta/deauthorize
- Data deletion request URL: https://YOUR-SITE/api/meta/data-deletion

## Permissions to request (Advanced Access) and what to write

**instagram_business_basic**
> Bemby shows the business owner which Instagram professional account is connected (username) and uses the account ID to route incoming direct messages to the right business inbox.

**instagram_business_manage_messages**
> Bemby is an AI receptionist for appointment-based businesses (hair stylists, estheticians, tattoo artists). When a client sends a direct message, Bemby reads it, answers questions using the business's own services, prices and hours, collects booking details (including photos the client sends), and replies within Meta's 24-hour window. Every appointment is sent to the business owner to approve. Owners can review conversations, approve or edit replies before they send, and take over any conversation in the Bemby inbox.

(Optional, only if you want replies after 24 hours) **Human Agent** feature
> Business owners sometimes approve an appointment or answer a question more than 24 hours after the client's last message; the human agent tag lets that owner-approved reply be delivered within 7 days.

## Screen recording script (about 90 seconds, record in English, show the real site)

Record your screen with narration or on-screen captions. Meta wants to see every permission in use, end to end.

1. **Log in** (0:00–0:10): open https://YOUR-SITE/login and sign in with the reviewer test account.
2. **Connect Instagram** (0:10–0:35): Settings → *Where clients reach you* → **Connect Instagram**. Show the Instagram permission screen, approve, and show "Connected as @yourbusiness" back in Bemby. *(shows instagram_business_basic)*
3. **Receive and answer a DM** (0:35–1:05): from a second Instagram account on your phone, DM the business: "hi! do you have anything friday for a silk press?". Show the message appearing in Bemby's **Inbox**, then Bemby's reply. Show the reply arriving in the Instagram app on the phone. *(shows instagram_business_manage_messages)*
4. **Owner control** (1:05–1:20): tap **Take over**, type a reply as the owner, send it, and show it arriving in Instagram. Then **Hand back to Bemby**.
5. **Disconnect** (1:20–1:30): Settings → **Disconnect** for Instagram to show users can remove access.

Tips: keep the URL bar visible, avoid showing real client data, and don't speed up the video.

## Reviewer instructions (paste into the submission notes)

> 1. Go to https://YOUR-SITE/login and sign in with: email `REVIEWER EMAIL`, password `REVIEWER PASSWORD`.
> 2. Settings → "Where clients reach you" → Connect Instagram and log in with your test account.
> 3. Send a direct message to the connected account from another account. The message appears in Bemby's Inbox and Bemby replies automatically.
> 4. In the Inbox you can approve replies, take over the conversation, and hand it back. Settings → Disconnect removes the connection.
