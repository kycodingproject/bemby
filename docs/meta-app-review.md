# Meta App Review: what to submit for Bemby

Meta must approve Bemby before businesses other than your app's testers can connect Instagram or Messenger.
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

**pages_show_list**
> After the owner logs in with Facebook, Bemby lists the Pages they manage so they can pick the business Page whose Messenger inbox Bemby should answer.

**pages_manage_metadata**
> Used to subscribe the selected Page to Bemby's webhook so new Messenger messages are delivered to Bemby.

**pages_messaging**
> Bemby replies to customers who message the business Page on Messenger: it answers questions about services, prices and hours and collects booking details. Replies are sent within the 24-hour standard messaging window. The business owner approves every appointment and can review, edit or take over conversations at any time.

(Optional, only if you want replies after 24 hours) **Human Agent** feature
> Business owners sometimes approve an appointment or answer a question more than 24 hours after the client's last message; the human agent tag lets that owner-approved reply be delivered within 7 days.

## Screen recording script (about 2 minutes, record in English, show the real site)

Record your screen with narration or on-screen captions. Meta wants to see every permission in use, end to end.

1. **Log in** (0:00–0:10): open https://YOUR-SITE/login and sign in with the reviewer test account.
2. **Connect Instagram** (0:10–0:35): Settings → *Where clients reach you* → **Connect Instagram**. Show the Instagram permission screen, approve, and show "Connected as @yourbusiness" back in Bemby. *(shows instagram_business_basic)*
3. **Receive and answer a DM** (0:35–1:05): from a second Instagram account on your phone, DM the business: "hi! do you have anything friday for a silk press?". Show the message appearing in Bemby's **Inbox**, then Bemby's reply. Show the reply arriving in the Instagram app on the phone. *(shows instagram_business_manage_messages)*
4. **Owner control** (1:05–1:20): tap **Take over**, type a reply as the owner, send it, and show it arriving in Instagram. Then **Hand back to Bemby**.
5. **Connect Messenger** (1:20–1:40): Settings → **Connect Messenger**. Show the Facebook login and Page picker (*pages_show_list*), pick the Page, and show "Connected to [Page]". *(pages_manage_metadata subscribes the Page)*
6. **Messenger reply** (1:40–1:55): from another Facebook account, message the Page; show it in the Bemby Inbox and the reply arriving in Messenger. *(pages_messaging)*
7. **Disconnect** (1:55–2:05): Settings → **Disconnect** for Instagram to show users can remove access.

Tips: keep the URL bar visible, avoid showing real client data, and don't speed up the video.

## Reviewer instructions (paste into the submission notes)

> 1. Go to https://YOUR-SITE/login and sign in with: email `REVIEWER EMAIL`, password `REVIEWER PASSWORD`.
> 2. Settings → "Where clients reach you" → Connect Instagram (or Connect Messenger) and log in with your test account.
> 3. Send a direct message to the connected account from another account. The message appears in Bemby's Inbox and Bemby replies automatically.
> 4. In the Inbox you can approve replies, take over the conversation, and hand it back. Settings → Disconnect removes the connection.
