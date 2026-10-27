import "server-only";
import type { Repo } from "./repo/types";
import type { Appointment, Business, Goal } from "./types";
import { localDateKey, zonedParts, zonedTimeToUtc } from "./time";

const XP_PER_BOOKING = 20;
const XP_PER_LEVEL = 1000;
const LEVEL_NAMES = ["Getting started", "Rising", "Regular", "Booking Pro", "Booked Solid", "Legend"];

export async function countNeedsYou(repo: Repo, businessId: string) {
  const convos = await repo.listConversations(businessId);
  let n = 0;
  for (const c of convos) {
    if (c.mode === "needs_owner") { n++; continue; }
    const msgs = await repo.listMessages(c.id, 5);
    if (msgs.some((m) => m.status === "pending_approval")) n++;
  }
  return n;
}

function monthRange(business: Business, now: Date) {
  const p = zonedParts(now, business.timezone);
  const start = zonedTimeToUtc(p.year, p.month, 1, "00:00", business.timezone);
  const next = p.month === 12 ? { y: p.year + 1, m: 1 } : { y: p.year, m: p.month + 1 };
  const end = zonedTimeToUtc(next.y, next.m, 1, "00:00", business.timezone);
  return { start, end, label: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: business.timezone }).format(now) };
}

export function goalProgress(goal: Goal, appts: Appointment[], business: Business) {
  if (goal.metric === "manual") return goal.manual_progress;
  return appts.filter((a) => {
    const d = localDateKey(a.starts_at, business.timezone);
    return a.source === "ai" && a.status === "confirmed" && d >= goal.period_start && d <= goal.period_end;
  }).length;
}

export async function homeData(repo: Repo, businessId: string, now = new Date()) {
  const business = (await repo.getBusiness(businessId))!;
  const { start, end, label } = monthRange(business, now);
  const all = await repo.listAppointments(businessId, new Date(now.getTime() - 400 * 86400_000).toISOString(), new Date(now.getTime() + 400 * 86400_000).toISOString());
  const aiConfirmed = all.filter((a) => a.source === "ai" && a.status === "confirmed");
  const bookedThisMonth = aiConfirmed.filter((a) => new Date(a.starts_at) >= start && new Date(a.starts_at) < end).length;
  const goals = await repo.listGoals(businessId);
  const monthGoal = goals.find((g) => g.metric === "ai_bookings")?.target ?? 30;

  const xp = aiConfirmed.length * XP_PER_BOOKING;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;

  // Streak: consecutive days (ending today or yesterday) that had at least one Bemby booking on the calendar.
  const days = new Set(aiConfirmed.map((a) => localDateKey(a.starts_at, business.timezone)));
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const key = localDateKey(new Date(now.getTime() - i * 86400_000), business.timezone);
    if (days.has(key)) streak++;
    else if (i > 0) break;
  }

  const convos = await repo.listConversations(businessId);
  const active = convos.filter((c) => now.getTime() - new Date(c.last_message_at).getTime() < 7 * 86400_000);
  const byChannel = { sms: 0, instagram: 0, messenger: 0 };
  active.forEach((c) => byChannel[c.channel]++);
  const pending = all.filter((a) => a.status === "requested" && new Date(a.starts_at) > now).length;
  const needsYou = await countNeedsYou(repo, businessId);

  const badges = [
    { label: "First Bemby booking", earned: aiConfirmed.length >= 1 },
    { label: "10 Bemby bookings", earned: aiConfirmed.length >= 10 },
    { label: "50 Bemby bookings", earned: aiConfirmed.length >= 50 },
    { label: "5-day streak", earned: streak >= 5 },
  ];

  return {
    business,
    monthLabel: label,
    bookedThisMonth,
    monthGoal,
    xp,
    xpIntoLevel: xp % XP_PER_LEVEL,
    xpPerLevel: XP_PER_LEVEL,
    level,
    levelName: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)],
    streak,
    activeChats: active.length,
    byChannel,
    pending,
    needsYou,
    badges,
    goals: goals.map((g) => ({ ...g, progress: goalProgress(g, all, business) })),
  };
}
