"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { currentBusinessId, getRepo, isDemo, resetSampleStudio } from "@/lib/repo";
import { DEMO_TEST_PHONE } from "@/lib/repo/seed";
import { deliver } from "@/lib/channels/deliver";
import { handleInbound } from "@/lib/inbound";
import { formatSlot } from "@/lib/time";
import type { AskFirstKey, Autonomy, Business } from "@/lib/types";

async function ownedBusiness() {
  const repo = getRepo();
  const id = await currentBusinessId();
  const business = (await repo.getBusiness(id))!;
  return { repo, business };
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Post a message from Bemby/the owner into a conversation and send it to the client. */
async function sendToClient(conversationId: string, body: string, author: "ai" | "owner") {
  const { repo, business } = await ownedBusiness();
  const conversation = await repo.getConversation(conversationId);
  if (!conversation || conversation.business_id !== business.id) throw new Error("Not found");
  const msg = await repo.addMessage({ business_id: business.id, conversation_id: conversation.id, author, body, media: [], status: "sent", approval_reason: null });
  return deliver(repo, conversation, msg);
}

// ---------- Appointments ----------

export async function approveAppointment(id: string) {
  const { repo, business } = await ownedBusiness();
  const appt = await repo.getAppointment(id);
  if (!appt || appt.business_id !== business.id || appt.status !== "requested") return;
  await repo.updateAppointment(id, { status: "confirmed" });
  if (appt.replaces_appointment_id) await repo.updateAppointment(appt.replaces_appointment_id, { status: "cancelled" });
  const client = await repo.getClient(appt.client_id);
  const service = (await repo.listServices(business.id)).find((s) => s.id === appt.service_id);
  if (appt.conversation_id) {
    const first = client?.name?.split(" ")[0];
    const what = service?.name.toLowerCase() ?? "appointment";
    const when = formatSlot(appt.starts_at, business.timezone);
    const body =
      appt.kind === "reschedule"
        ? `${first ? `Hi ${first}! ` : ""}You're all set. ${business.owner_name} moved your ${what} to ${when}. See you then!`
        : `${first ? `Hi ${first}! ` : ""}${business.owner_name} confirmed your ${what} for ${when}. See you then!`;
    await sendToClient(appt.conversation_id, body, "ai");
  }
  refresh();
}

export async function declineAppointment(id: string) {
  const { repo, business } = await ownedBusiness();
  const appt = await repo.getAppointment(id);
  if (!appt || appt.business_id !== business.id || appt.status !== "requested") return;
  await repo.updateAppointment(id, { status: "declined" });
  if (appt.conversation_id) {
    const body =
      appt.kind === "reschedule"
        ? `Sorry, ${business.owner_name} can't do that new time. Your original appointment is still on. Want me to look for another time?`
        : `Sorry, ${business.owner_name} isn't able to take that time. Want me to find you another opening?`;
    await sendToClient(appt.conversation_id, body, "ai");
  }
  refresh();
}

// ---------- Inbox ----------

export async function approveMessage(id: string, editedBody?: string) {
  const { repo, business } = await ownedBusiness();
  const msg = await repo.getMessage(id);
  if (!msg || msg.business_id !== business.id || msg.status !== "pending_approval") return;
  const conversation = (await repo.getConversation(msg.conversation_id))!;
  const updated = await repo.updateMessage(id, { body: editedBody?.trim() || msg.body, status: "sent", approval_reason: null });
  await deliver(repo, conversation, updated);
  refresh();
}

export async function discardMessage(id: string) {
  const { repo, business } = await ownedBusiness();
  const msg = await repo.getMessage(id);
  if (!msg || msg.business_id !== business.id) return;
  await repo.updateMessage(id, { status: "discarded" });
  refresh();
}

export async function setConversationMode(id: string, mode: "ai" | "owner") {
  const { repo, business } = await ownedBusiness();
  const c = await repo.getConversation(id);
  if (!c || c.business_id !== business.id) return;
  await repo.updateConversation(id, { mode });
  await repo.addMessage({
    business_id: business.id, conversation_id: id, author: "system", media: [], status: "sent", approval_reason: null,
    body: mode === "owner" ? "You took over. Bemby is paused in this chat." : "Bemby is back on this chat.",
  });
  refresh();
}

export async function sendOwnerMessage(conversationId: string, body: string) {
  if (!body.trim()) return;
  await sendToClient(conversationId, body.trim().slice(0, 1200), "owner");
  refresh();
}

/** Demo only: text Bemby as if you were a client, to try it out before connecting a real number. */
export async function simulateClientMessage(body: string, photoLabels: string[] = []) {
  if (!isDemo()) throw new Error("Only available in demo mode");
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Add ANTHROPIC_API_KEY to .env.local to let Bemby reply." };
  const { repo, business } = await ownedBusiness();
  try {
    await handleInbound({
      repo, businessId: business.id, channel: "sms", from: DEMO_TEST_PHONE, body: body.slice(0, 1000),
      media: photoLabels.map((label) => ({ path: `demo:${label}`, content_type: "image/jpeg", label })),
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}

export async function resetDemoData() {
  if (!isDemo()) return;
  await resetSampleStudio();
  refresh();
}

// ---------- Settings ----------

export async function updateSettings(patch: { autonomy?: Autonomy; paused?: boolean; ask_first?: Partial<Record<AskFirstKey, boolean>> }) {
  const { repo, business } = await ownedBusiness();
  const next: Partial<Business> = {};
  if (patch.autonomy && ["auto", "approve_all", "situational"].includes(patch.autonomy)) next.autonomy = patch.autonomy;
  if (typeof patch.paused === "boolean") next.paused = patch.paused;
  if (patch.ask_first) next.ask_first = { ...business.ask_first, ...patch.ask_first };
  await repo.updateBusiness(business.id, next);
  refresh();
}

// ---------- Goals ----------

export async function addGoal(label: string, target: number) {
  const { repo, business } = await ownedBusiness();
  const clean = label.trim().slice(0, 120);
  const t = Math.max(1, Math.min(10000, Math.round(target)));
  if (!clean) return;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  await repo.createGoal({
    business_id: business.id, label: clean, metric: /book/i.test(clean) ? "ai_bookings" : "manual", target: t, manual_progress: 0,
    period_start: `${y}-${mm}-01`, period_end: `${y}-${mm}-${last}`, reward_xp: t * 10,
  });
  refresh();
}

// ---------- Specials ----------

export async function draftSpecialCaption(input: { serviceName: string; deal: string; dates: string; vibe: "hype" | "classy" | "sweet" }) {
  const { business } = await ownedBusiness();
  const fallback = `${input.deal} ${input.serviceName.toLowerCase()}, ${input.dates}. Spots are limited, so DM me or text my booking line and my assistant will get you scheduled.`;
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  const res = await new Anthropic().messages.create({
    model: process.env.BEMBY_CHAT_MODEL ?? "claude-haiku-5-5",
    max_tokens: 300,
    system: `You write short Instagram captions for ${business.name}, a ${business.business_type} business run by ${business.owner_name}. Write in first person as ${business.owner_name}. 2 to 4 short lines, no hashtags, at most one emoji. End by telling people to DM or text the booking line. Return only the caption.`,
    messages: [{ role: "user", content: `Special: ${input.deal} on ${input.serviceName}. Dates: ${input.dates}. Vibe: ${input.vibe}.` }],
  });
  const text = res.content.find((c) => c.type === "text");
  return text && text.type === "text" ? text.text.trim() : fallback;
}

export async function saveSpecial(input: { serviceId: string | null; deal: string; startsOn: string; endsOn: string; caption: string; mention: boolean }) {
  const { repo, business } = await ownedBusiness();
  if (!input.deal.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endsOn)) return;
  await repo.createSpecial({
    business_id: business.id, service_id: input.serviceId, deal: input.deal.trim().slice(0, 80),
    starts_on: input.startsOn, ends_on: input.endsOn, mention_in_chats: input.mention, caption: input.caption.slice(0, 1000),
  });
  refresh();
}
