import type { Repo } from "./repo/types";
import type { Business, TrainingQuestion } from "./types";
import { localDateKey } from "./time";

/** Questions a day from the starter bank. Questions from real chats always show on top of this. */
export const DAILY_TASKS = 3;
export const XP_PER_ANSWER = 10;

const GENERAL = [
  "What forms of payment do you take (card, cash, Cash App, Zelle)?",
  "Do you take walk-ins, or is it appointment only?",
  "What happens if a client is running late?",
  "What's your cancellation and no-show policy?",
  "Can clients bring a friend or their kids to the appointment?",
  "Do you offer any first-time client or referral discounts?",
  "Do you sell gift cards?",
  "How should clients reach you if they have an emergency on the day?",
];

/** Things clients ask each kind of business that aren't on the service menu. */
const BY_TYPE: Record<string, string[]> = {
  hair: [
    "Should clients come with clean or dirty hair?",
    "Do you charge extra for long or thick hair? How much?",
    "Do you work with box-dyed or previously colored hair?",
    "Is a consultation needed before color? Is it free?",
    "Do you do color correction?",
    "Do you offer extensions? Which types?",
    "Do you work with curly or textured hair?",
    "Do you do kids' haircuts?",
    "How often should clients come back for a trim or touch-up?",
    "What aftercare do you recommend after color or a silk press?",
  ],
  barber: [
    "How long is a typical wait for walk-ins?",
    "Do you do kids' cuts, and how much?",
    "Do you do designs or hair art?",
    "Do you do house calls?",
    "Do you do beard enhancements or fill-ins?",
    "Are you open on Sundays or early mornings?",
    "How often should clients come in for a lineup?",
  ],
  esthetics: [
    "Which facial do you recommend for a first-time client?",
    "Can clients get a facial while pregnant?",
    "Should clients stop using retinol before an appointment? How long before?",
    "Is there downtime after a peel?",
    "Can clients wear makeup after a treatment?",
    "How long does hair need to be for waxing?",
    "Do you offer packages or memberships?",
    "Do you work with men too?",
  ],
  lashes: [
    "Should clients come with clean lashes and no makeup?",
    "How many lashes need to be left for it to count as a fill?",
    "Do you do fills on another artist's work? Is there an extra charge?",
    "Do you do a patch test for clients sensitive to glue?",
    "When can clients get their lashes wet after an appointment?",
    "Can clients get lashes while pregnant?",
    "Do you remove sets from other artists? How much?",
  ],
  tattoo: [
    "What's your shop minimum?",
    "Does the deposit go toward the tattoo?",
    "When will clients see their design before the appointment?",
    "Do you do cover-ups?",
    "What styles do you specialize in?",
    "Can clients use numbing cream?",
    "Do clients need to bring ID? What's your minimum age?",
    "What aftercare do you recommend?",
    "Do you do free touch-ups? Within how long?",
  ],
  nails: [
    "Do you do fills on another tech's work?",
    "Do you charge extra for nail art? How is it priced?",
    "Do you remove gel or acrylic from another salon? How much?",
    "How long does a full set usually last?",
    "Should clients come with bare nails?",
    "Do you do pedicures, and do you sanitize the tubs between clients?",
  ],
};

export function starterQuestions(businessType: string) {
  return [...(BY_TYPE[businessType] ?? []), ...GENERAL];
}

/** First visit: fill in the question bank for this kind of business. */
export async function ensureStarterQuestions(repo: Repo, business: Business) {
  const existing = await repo.listTraining(business.id);
  if (existing.some((q) => q.source === "starter")) return existing;
  const have = new Set(existing.map((q) => q.question.toLowerCase()));
  const fresh = starterQuestions(business.business_type).filter((q) => !have.has(q.toLowerCase()));
  for (const [i, question] of fresh.entries()) {
    await repo.addTraining({ business_id: business.id, question, source: "starter", conversation_id: null, sort: i }).catch(() => null);
  }
  return repo.listTraining(business.id);
}

/** What the Home card shows today. */
export function trainingToday(all: TrainingQuestion[], business: Business, now = new Date()) {
  const today = localDateKey(now, business.timezone);
  const starters = all.filter((q) => q.source === "starter");
  const answeredToday = starters.filter((q) => q.status === "answered" && q.answered_at && localDateKey(q.answered_at, business.timezone) === today).length;
  const fromChats = all.filter((q) => q.source === "from_chat" && q.status === "open").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const openStarters = starters.filter((q) => q.status === "open").sort((a, b) => a.sort - b.sort);
  const left = Math.max(0, DAILY_TASKS - answeredToday);
  const done = starters.filter((q) => q.status !== "open").length;
  const answered = all.filter((q) => q.status === "answered").length;
  return {
    tasks: [...fromChats, ...openStarters.slice(0, left)],
    answeredToday,
    doneForToday: left === 0 && fromChats.length === 0,
    allStartersDone: openStarters.length === 0,
    progress: starters.length ? done / starters.length : 1,
    answered,
    total: starters.length,
  };
}

/** The owner's answers, for the AI's instructions. */
export function knowledgeText(all: TrainingQuestion[]) {
  const lines = all
    .filter((q) => q.status === "answered" && q.answer?.trim())
    .sort((a, b) => (a.answered_at ?? "").localeCompare(b.answered_at ?? ""))
    .map((q) => `- Q: ${q.question}\n  A: ${q.answer!.trim().slice(0, 600)}`);
  let text = "";
  for (const l of lines.reverse()) {
    if (text.length + l.length > 8000) break; // newest answers win if there are a lot
    text = `${l}\n${text}`;
  }
  return text.trim();
}

/** The AI hit a question it couldn't answer: ask the owner, so next time it can. */
export async function learnFromChat(repo: Repo, businessId: string, conversationId: string, question: string) {
  const q = question.trim().replace(/\s+/g, " ").slice(0, 200);
  if (q.length < 8) return;
  const all = await repo.listTraining(businessId);
  const key = q.toLowerCase().replace(/[?.!]+$/, "");
  const same = all.find((x) => x.question.toLowerCase().replace(/[?.!]+$/, "") === key);
  if (same) {
    // Already answered: nothing to do. Skipped or open: bring it back to the top.
    if (same.status !== "answered") await repo.updateTraining(same.id, { status: "open", source: "from_chat", conversation_id: conversationId });
    return;
  }
  await repo.addTraining({ business_id: businessId, question: q.endsWith("?") ? q : `${q}?`, source: "from_chat", conversation_id: conversationId, sort: 0 }).catch(() => null);
}
