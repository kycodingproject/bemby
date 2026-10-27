# Bemby

Bemby is an AI receptionist for service businesses (hair stylists, estheticians, tattoo artists, nail techs, lash artists, barbers). Each business gets a dedicated number. Bemby answers texts and DMs, collects what the business needs (like current and inspo photos), offers open times, and sends booking requests to the owner to approve.

## What's built

| Area | Status |
|---|---|
| Dashboard: Home (goals, XP, streaks), Inbox, Calendar, Specials, Settings | Working, on demo data |
| AI booking agent (Claude): availability, booking requests, reschedules, hand-off, photo intake | Working |
| Approval rules: reply on its own / ask first / depends on the situation | Working |
| Owner take-over and edit-before-send | Working |
| Texting via Twilio (incoming webhook, outgoing replies, photo storage, STOP handling) | Built, needs Twilio keys |
| Database schema with row-level security (Supabase) | Built, needs a Supabase project |
| Sign-in and onboarding | Next |
| Instagram and Messenger | Next |
| Stripe billing ($19 first month, then $39) | Next |
| Google / Apple calendar sync | Next |
| Vagaro | After launch |

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY to let Bemby reply in the demo
npm run dev
```

Open http://localhost:3000. Without Supabase keys the site runs on built-in sample data (Kiara Hair Studio). In the Inbox, the **Try Bemby** box lets you text the studio as if you were a client.

Check the booking logic without any keys:

```bash
npx tsx scripts/test-agent.mts
```

## How it fits together

- `src/lib/ai/` — Bemby's instructions (`prompt.ts`) and the tool loop (`agent.ts`)
- `src/lib/scheduling.ts` — open times from business hours, buffers, notice and existing bookings
- `src/lib/inbound.ts` — what happens when any client message arrives
- `src/lib/channels/deliver.ts` — sending replies (Twilio today)
- `src/lib/repo/` — data access: Supabase in production, in-memory for the demo
- `src/app/api/webhooks/twilio` — Twilio posts incoming texts here
- `supabase/migrations/` — database schema

## Plans

| Plan | Price | Includes |
|---|---|---|
| Trial | $4.99 first month | Instagram & Messenger DMs |
| Bemby Social | $19.99 / month | Instagram & Messenger DMs |
| Bemby Pro | $39.99 / month | Social + business phone number and texting (1,000 texts/month) |

Prices live in `src/lib/plans.ts`.

## Costs (per business, per month, estimated)

- Every plan: AI replies about $0.20–$2 depending on volume and photos; Stripe fees ~3%.
- Pro only: Twilio number $1.15 + carrier campaign fee (~$2–10) + about 1¢ per text, plus a one-time ~$19.50 carrier registration.
