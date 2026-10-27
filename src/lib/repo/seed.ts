import type { Appointment, Business, Client, Conversation, Message, Service } from "../types";
import { addDaysLocal, zonedParts, zonedTimeToUtc } from "../time";
import type { MemoryDb } from "./memory";

export const DEMO_BUSINESS_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_TEST_PHONE = "+15555550100";

const photo = (label: string) => ({ path: `demo:${label}`, content_type: "image/jpeg", label });

/** Sample business so the site works before any accounts are connected. Dates are relative to `now`. */
export function seedDemo(now: Date): MemoryDb {
  const tz = "America/Los_Angeles";
  const business: Business = {
    id: DEMO_BUSINESS_ID,
    name: "Kiara Hair Studio",
    owner_name: "Kiara",
    business_type: "hair",
    timezone: tz,
    phone_number: "+13105550123",
    instagram_account_id: "demo-ig",
    instagram_username: "kiarahairstudio",
    messenger_page_id: null,
    autonomy: "situational",
    ask_first: { new_client: false, reschedule: true, discount: true, off_menu: true, upset: true, every_booking: false },
    paused: false,
    reply_delay_seconds: 60,
    hours: Object.fromEntries(
      (["mon", "tue", "wed", "thu", "fri", "sat"] as const).map((d) => [d, [{ start: d === "sat" ? "08:00" : "09:00", end: d === "sat" ? "16:00" : "18:00" }]]),
    ),
    buffer_minutes: 15,
    min_notice_hours: 12,
    policies: "A $40 deposit holds knotless braid appointments. 24-hour notice for cancellations. Come with hair detangled and product-free. Studio is in Inglewood; the exact address is sent after booking.",
    plan: "pro",
    monthly_text_limit: 1000,
  };

  const s = (id: string, name: string, price: number, mins: number, deposit: number, intake: Service["intake"]): Service => ({
    id, business_id: business.id, name, price_cents: price * 100, price_note: null, duration_minutes: mins, deposit_cents: deposit * 100, intake, active: true,
  });
  const hairPhotos: Service["intake"] = [
    { key: "current_photo", label: "A photo of their hair right now", type: "photo" },
    { key: "inspo_photo", label: "An inspo photo of the look they want", type: "photo" },
    { key: "hair_length", label: "Current hair length", type: "text" },
  ];
  const services: Service[] = [
    s("00000000-0000-4000-8000-000000000101", "Silk press", 95, 150, 0, [...hairPhotos, { key: "color_history", label: "Any color or chemical treatment in the last 6 months", type: "text" }]),
    s("00000000-0000-4000-8000-000000000102", "Medium knotless braids", 220, 360, 40, [
      { key: "length", label: "Length they want (shoulder, mid-back, waist)", type: "text" },
      { key: "inspo_photo", label: "An inspo photo", type: "photo" },
      { key: "hair_provided", label: "Whether they are bringing their own braiding hair", type: "text" },
    ]),
    s("00000000-0000-4000-8000-000000000103", "Trim", 35, 45, 0, []),
    s("00000000-0000-4000-8000-000000000104", "Wash + blowout", 55, 60, 0, [{ key: "current_photo", label: "A photo of their hair right now", type: "photo" }]),
    s("00000000-0000-4000-8000-000000000105", "Sew-in", 180, 180, 0, [
      { key: "inspo_photo", label: "An inspo photo", type: "photo" },
      { key: "bundles", label: "Bundle length and whether they already have them", type: "text" },
    ]),
  ];

  const clients: Client[] = [];
  const client = (name: string, ch: { phone?: string; ig?: string; fb?: string }) => {
    const c: Client = { id: crypto.randomUUID(), business_id: business.id, name, phone: ch.phone ?? null, instagram_id: ch.ig ?? null, messenger_id: ch.fb ?? null, notes: "", sms_opt_out: false };
    clients.push(c);
    return c;
  };
  const amara = client("Amara K.", { phone: "+13105550111" });
  const dee = client("Dee W.", { phone: "+13105550112" });
  const nia = client("Nia P.", { ig: "nia.p" });
  const lauren = client("Lauren B.", { phone: "+13105550114" });
  const kendra = client("Kendra S.", { ig: "kendra.s" });
  const tay = client("Tay M.", { fb: "tay.m" });
  const jasmine = client("Jasmine R.", { ig: "jasmine.r" });
  const marcus = client("Marcus T.", { phone: "+13105550118" });

  const today = zonedParts(now, tz);
  const at = (dayOffset: number, hhmm: string) => {
    const d = addDaysLocal(today.year, today.month, today.day, dayOffset);
    return { d, date: zonedTimeToUtc(d.year, d.month, d.day, hhmm, tz) };
  };
  const appointments: Appointment[] = [];
  const appt = (c: Client, svc: Service, dayOffset: number, hhmm: string, extra: Partial<Appointment> = {}) => {
    const { d, date } = at(dayOffset, hhmm);
    if (d.dayKey === "sun") return null;
    const a: Appointment = {
      id: crypto.randomUUID(), business_id: business.id, client_id: c.id, service_id: svc.id, conversation_id: null,
      starts_at: date.toISOString(), ends_at: new Date(date.getTime() + svc.duration_minutes * 60_000).toISOString(),
      status: "confirmed", kind: "new", replaces_appointment_id: null, source: "ai", price_cents: svc.price_cents,
      notes: "", intake: {}, photos: [], created_at: now.toISOString(), ...extra,
    };
    appointments.push(a);
    return a;
  };
  const [silk, knotless, trim, blowout, sewin] = services;
  const past: [Client, Service, number, string, Partial<Appointment>?][] = [
    [amara, knotless, -24, "09:00", { notes: "Medium knotless, mid-back, color 1B. Brought her own hair. Deposit paid." }],
    [dee, trim, -23, "10:00", { source: "owner" }],
    [nia, silk, -23, "13:00", { notes: "Wants it straight with body. No color.", photos: [photo("Current hair"), photo("Inspo")] }],
    [lauren, blowout, -19, "09:30"],
    [kendra, sewin, -17, "10:00", { notes: "Leave-out sew-in, 22 inch bundles, middle part." }],
    [tay, blowout, -16, "10:00"],
    [nia, silk, -10, "11:00", { photos: [photo("Current hair"), photo("Inspo")] }],
    [lauren, trim, -5, "16:00"],
    [kendra, blowout, -3, "10:00"],
    [dee, silk, -2, "12:00", { source: "owner" }],
    [amara, knotless, -1, "09:00", { notes: "Same as last time: medium knotless, mid-back, 1B." }],
  ];
  const future: [Client, Service, number, string, Partial<Appointment>?][] = [
    [dee, trim, 0, "10:00", { source: "owner" }],
    [nia, silk, 0, "13:00", { notes: "Wants it straight with lots of body. Last press about 6 weeks ago.", photos: [photo("Current hair"), photo("Inspo")] }],
    [lauren, blowout, 1, "09:30", { notes: "Blowout with a little bend at the ends." }],
    [kendra, sewin, 3, "10:00", { notes: "Leave-out sew-in, 22 inch bundles. Already bought the bundles.", photos: [photo("Inspo")] }],
  ];
  for (const [c, svc, o, t, x] of [...past, ...future]) appt(c, svc, o, t, x);

  // Tay has an appointment in 4 days and asked to move it; Jasmine's new silk press is waiting for approval.
  const tayAppt = appt(tay, blowout, 4, "10:00") ?? appt(tay, blowout, 5, "10:00")!;
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  const convo = (c: Client, channel: Conversation["channel"], topic: string, mode: Conversation["mode"], msgs: [Message["author"], string, Message["media"]?][], minsAgo: number) => {
    const cv: Conversation = { id: crypto.randomUUID(), business_id: business.id, client_id: c.id, channel, mode, topic, last_message_at: new Date(now.getTime() - minsAgo * 60_000).toISOString() };
    conversations.push(cv);
    msgs.forEach(([author, body, media], i) =>
      messages.push({
        id: crypto.randomUUID(), business_id: business.id, conversation_id: cv.id, author, body, media: media ?? [],
        status: author === "client" ? "received" : "sent", approval_reason: null,
        created_at: new Date(now.getTime() - (minsAgo + (msgs.length - i) * 2) * 60_000).toISOString(),
      }),
    );
    return cv;
  };

  const jasSlot = at(3, "14:00").d.dayKey === "sun" ? at(4, "14:00") : at(3, "14:00");
  const jasConvo = convo(jasmine, "instagram", "Silk press", "ai", [
    ["client", "hiii do you have anything open this week for a silk press?"],
    ["ai", "Hi Jasmine! Yes, I have a few openings. Which day works best for you?"],
    ["client", "later this week, afternoon"],
    ["ai", "Can you send a photo of your hair right now and an inspo pic of the look you want? It helps Kiara plan your time."],
    ["client", "", [photo("Current hair"), photo("Inspo")]],
    ["ai", "Got them, thank you! I sent your silk press request to Kiara. You'll get a message as soon as it's confirmed."],
  ], 25);
  appointments.push({
    id: crypto.randomUUID(), business_id: business.id, client_id: jasmine.id, service_id: silk.id, conversation_id: jasConvo.id,
    starts_at: jasSlot.date.toISOString(), ends_at: new Date(jasSlot.date.getTime() + silk.duration_minutes * 60_000).toISOString(),
    status: "requested", kind: "new", replaces_appointment_id: null, source: "ai", price_cents: silk.price_cents,
    notes: "Shoulder-length natural hair, wants it bone straight with movement like the inspo photo. About a 1 inch trim. No color in the last year. First visit, found Kiara on Instagram.",
    intake: { hair_length: "Shoulder length", color_history: "None in the last year" },
    photos: [photo("Current hair"), photo("Inspo")], created_at: now.toISOString(),
  });

  const tayConvo = convo(tay, "messenger", "Reschedule", "ai", [
    ["client", "hey can i move my appt? something came up"],
    ["ai", "No problem, Tay! Let me check with Kiara and get right back to you."],
  ], 60);
  const tayNew = at(6, "12:00").d.dayKey === "sun" ? at(7, "12:00") : at(6, "12:00");
  appointments.push({
    id: crypto.randomUUID(), business_id: business.id, client_id: tay.id, service_id: blowout.id, conversation_id: tayConvo.id,
    starts_at: tayNew.date.toISOString(), ends_at: new Date(tayNew.date.getTime() + 60 * 60_000).toISOString(),
    status: "requested", kind: "reschedule", replaces_appointment_id: tayAppt.id, source: "ai", price_cents: blowout.price_cents,
    notes: "Something came up on her original day. This new time works for her. Returning client, 6th visit.",
    intake: {}, photos: [], created_at: now.toISOString(),
  });

  convo(marcus, "sms", "Price question", "ai", [
    ["client", "how much for medium knotless? mid back"],
    ["ai", "Medium knotless at mid-back length is $220 and takes about 6 hours. A $40 deposit holds your spot. Want me to look at dates?"],
    ["client", "yeah anything next weekend"],
  ], 8);

  const month = `${today.year}-${String(today.month).padStart(2, "0")}`;
  const lastDay = new Date(Date.UTC(today.year, today.month, 0)).getUTCDate();
  return {
    businesses: [business],
    services,
    clients,
    conversations,
    messages,
    appointments,
    specials: [],
    goals: [
      { id: crypto.randomUUID(), business_id: business.id, label: "Book 30 appointments with Bemby this month", metric: "ai_bookings", target: 30, manual_progress: 0, period_start: `${month}-01`, period_end: `${month}-${lastDay}`, reward_xp: 300 },
      { id: crypto.randomUUID(), business_id: business.id, label: "Win back 10 past clients", metric: "manual", target: 10, manual_progress: 4, period_start: `${month}-01`, period_end: `${month}-${lastDay}`, reward_xp: 150 },
    ],
  };
}
