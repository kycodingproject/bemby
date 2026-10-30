"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { cents, dollars, HoursInput, hoursProblem, ServiceInput, TextingRegistrationInput } from "@/lib/validation";
import { currentBusinessId, getRepo, isDemo, resetSampleStudio } from "@/lib/repo";
import { DEMO_TEST_PHONE } from "@/lib/repo/seed";
import { deliver } from "@/lib/channels/deliver";
import { answerNow, handleInbound } from "@/lib/inbound";
import { loadStoredMedia } from "@/lib/media";
import { BACK_NOTE } from "@/lib/triggers";
import { hasActivePlan } from "@/lib/billing";
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
    body: mode === "owner" ? "You took over. Bemby is paused in this chat." : BACK_NOTE,
  });
  refresh();
}

/** The owner says this quiet chat is a client: Bemby answers now and keeps answering. */
export async function letBembyAnswer(id: string) {
  const { repo, business } = await ownedBusiness();
  const c = await repo.getConversation(id);
  if (!c || c.business_id !== business.id) return { error: "Chat not found." };
  if (c.mode !== "ai") await repo.updateConversation(id, { mode: "ai" });
  await repo.addMessage({ business_id: business.id, conversation_id: id, author: "system", media: [], status: "sent", approval_reason: null, body: `${BACK_NOTE} It will answer this person from now on.` });
  if (!isDemo() && !hasActivePlan(business)) {
    refresh();
    return { error: "Bemby is off until you pick a plan." };
  }
  try {
    await answerNow(repo, id, loadStoredMedia);
  } catch (e) {
    console.error("letBembyAnswer failed", e);
    refresh();
    return { error: "Bemby couldn't reply just now. Try again in a minute." };
  }
  refresh();
  return { ok: true };
}

export async function sendOwnerMessage(conversationId: string, body: string) {
  if (!body.trim()) return;
  await sendToClient(conversationId, body.trim().slice(0, 1200), "owner");
  refresh();
}

/** Text your own Bemby as a pretend client (from a test number that never receives real texts). */
export async function simulateClientMessage(body: string, photoLabels: string[] = []) {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Add ANTHROPIC_API_KEY in Vercel to let Bemby reply." };
  const { repo, business } = await ownedBusiness();
  try {
    await handleInbound({
      repo, businessId: business.id, channel: "sms", from: DEMO_TEST_PHONE, body: body.slice(0, 1000),
      media: photoLabels.map((label) => ({ path: `demo:${label}`, content_type: "image/jpeg", label })),
      replyDelaySeconds: 0,
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

export async function updateSettings(patch: { autonomy?: Autonomy; paused?: boolean; ask_first?: Partial<Record<AskFirstKey, boolean>>; reply_delay_seconds?: number; trigger_words?: string[] }) {
  const { repo, business } = await ownedBusiness();
  const next: Partial<Business> = {};
  if (patch.autonomy && ["auto", "approve_all", "situational"].includes(patch.autonomy)) next.autonomy = patch.autonomy;
  if (typeof patch.paused === "boolean") next.paused = patch.paused;
  if (patch.ask_first) next.ask_first = { ...business.ask_first, ...patch.ask_first };
  if (Array.isArray(patch.trigger_words)) {
    next.trigger_words = [...new Set(patch.trigger_words.map((w) => String(w).trim().toLowerCase().slice(0, 40)).filter((w) => w.length >= 2))].slice(0, 50);
  }
  if (typeof patch.reply_delay_seconds === "number" && [0, 30, 60, 120].includes(patch.reply_delay_seconds)) next.reply_delay_seconds = patch.reply_delay_seconds;
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

// ---------- Business profile (Settings) ----------

export async function saveBusinessDetails(input: { name: string; ownerName: string; assistantName: string; assistantRole: string }) {
  const { repo, business } = await ownedBusiness();
  const name = input.name.trim().slice(0, 80);
  const ownerName = input.ownerName.trim().slice(0, 40);
  const assistantName = input.assistantName.trim().slice(0, 30);
  if (!name || !ownerName) return { error: "Add your business name and first name." };
  if (!assistantName) return { error: "Give your receptionist a name." };
  const assistantRole = input.assistantRole === "booking receptionist" ? "booking receptionist" : "assistant";
  await repo.updateBusiness(business.id, { name, owner_name: ownerName, assistant_name: assistantName, assistant_role: assistantRole });
  refresh();
  return { ok: true };
}

export async function saveServices(raw: unknown) {
  const { repo, business } = await ownedBusiness();
  const parsed = z.array(ServiceInput).min(1, "Keep at least one service").max(40).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your services." };
  const existing = await repo.listServices(business.id);
  const keep = new Set<string>();
  for (const [i, s] of parsed.data.entries()) {
    const fields = {
      name: s.name, price_cents: cents(s.price), duration_minutes: s.minutes,
      deposit_cents: cents(s.deposit) ?? 0, intake: s.intake, active: true, sort: i,
    };
    if (s.id && existing.some((e) => e.id === s.id)) {
      await repo.updateService(s.id, fields);
      keep.add(s.id);
    } else {
      const created = await repo.createService({ ...fields, business_id: business.id, price_note: null });
      keep.add(created.id);
    }
  }
  // Removed services are hidden, not deleted, so past appointments keep their service name.
  for (const e of existing) if (!keep.has(e.id)) await repo.updateService(e.id, { active: false });
  refresh();
  const saved = await repo.listServices(business.id);
  return {
    ok: true,
    services: saved.map((x) => ({ id: x.id, name: x.name, price: dollars(x.price_cents), minutes: x.duration_minutes, deposit: x.deposit_cents ? dollars(x.deposit_cents) : "", intake: x.intake })),
  };
}

export async function saveHours(input: { hours: unknown; minNoticeHours: number; bufferMinutes: number; policies: string }) {
  const { repo, business } = await ownedBusiness();
  const parsed = HoursInput.safeParse(input.hours);
  if (!parsed.success) return { error: "Check your opening hours." };
  const problem = hoursProblem(parsed.data);
  if (problem) return { error: problem };
  await repo.updateBusiness(business.id, {
    hours: parsed.data,
    min_notice_hours: Math.max(0, Math.min(168, Math.round(input.minNoticeHours))),
    buffer_minutes: Math.max(0, Math.min(120, Math.round(input.bufferMinutes))),
    policies: String(input.policies ?? "").slice(0, 2000).trim(),
  });
  refresh();
  return { ok: true };
}

// ---------- Channels ----------

export async function disconnectChannel(kind: "instagram" | "messenger") {
  const { repo, business } = await ownedBusiness();
  if (isDemo()) return;
  const { saveChannelSecrets } = await import("@/lib/channels/meta");
  if (kind === "instagram") {
    await saveChannelSecrets(business.id, { instagram_user_id: null, instagram_username: null, instagram_token: null, instagram_token_expires_at: null });
    await repo.updateBusiness(business.id, { instagram_account_id: null, instagram_username: null });
  } else {
    await saveChannelSecrets(business.id, { messenger_page_id: null, messenger_page_name: null, messenger_page_token: null, pending_pages: null });
    await repo.updateBusiness(business.id, { messenger_page_id: null, messenger_page_name: null });
  }
  refresh();
}

export async function chooseMessengerPage(pageId: string) {
  const { business } = await ownedBusiness();
  const { getChannelSecrets } = await import("@/lib/channels/meta");
  const { linkMessengerPage } = await import("@/lib/channels/link");
  const secrets = await getChannelSecrets(business.id);
  const page = secrets?.pending_pages?.find((p) => p.id === pageId);
  if (!page) return { error: "That Page list expired. Tap Connect Messenger again." };
  try {
    await linkMessengerPage(business.id, page);
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh();
  return { ok: true };
}

// ---------- Business phone number ----------

export async function requestBusinessNumber(raw: unknown) {
  const { repo, business } = await ownedBusiness();
  if (isDemo()) return { error: "Sign in to your own account to request a number." };
  const parsed = TextingRegistrationInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  await repo.updateBusiness(business.id, {
    texting_status: "requested",
    texting_registration: { ...parsed.data, ein: parsed.data.ein || null },
    texting_requested_at: new Date().toISOString(),
  });
  refresh();
  return { ok: true };
}

// ---------- Delete account ----------

export async function deleteAccount(confirm: string) {
  if (confirm.trim().toUpperCase() !== "DELETE") return { error: 'Type DELETE to confirm.' };
  if (isDemo()) return { error: "The sample studio can't be deleted. Use Reset demo data in the Inbox instead." };
  const { business } = await ownedBusiness();
  const { serviceRoleClient } = await import("@/lib/repo/supabase");
  const { currentUser, authClient } = await import("@/lib/auth");
  const sb = serviceRoleClient();
  const user = await currentUser();

  // 1. Stop billing right away.
  if (business.stripe_subscription_id) {
    try {
      const { stripe } = await import("@/lib/billing");
      await stripe().subscriptions.cancel(business.stripe_subscription_id);
    } catch (e) {
      console.error("cancel subscription on delete failed", e);
    }
  }
  // 2. Delete client photos.
  try {
    const bucket = sb.storage.from("client-photos");
    for (let i = 0; i < 50; i++) {
      const { data } = await bucket.list(business.id, { limit: 1000 });
      if (!data?.length) break;
      await bucket.remove(data.map((f) => `${business.id}/${f.name}`));
    }
  } catch (e) {
    console.error("photo cleanup failed", e);
  }
  // 3. Delete the business; services, clients, conversations, messages, appointments, goals, specials and tokens cascade.
  const { error } = await sb.from("businesses").delete().eq("id", business.id);
  if (error) return { error: `Couldn't delete: ${error.message}` };
  // 4. Delete the login itself.
  if (user) {
    await (await authClient()).auth.signOut().catch(() => undefined);
    await sb.auth.admin.deleteUser(user.id).catch((e) => console.error("auth delete failed", e));
  }
  redirect("/signup?deleted=1");
}
