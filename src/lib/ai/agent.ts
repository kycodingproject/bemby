import Anthropic from "@anthropic-ai/sdk";
import type { Appointment, MediaRef, Message } from "../types";
import type { Repo } from "../repo/types";
import { findOpenSlots, isSlotOpen } from "../scheduling";
import { formatSlot, localDateKey, zonedParts, zonedTimeToUtc } from "../time";
import { buildSystemPrompt } from "./prompt";

const CHAT_MODEL = process.env.BEMBY_CHAT_MODEL ?? "claude-haiku-5-5";
const VISION_MODEL = process.env.BEMBY_VISION_MODEL ?? "claude-sonnet-5-5";
const MAX_STEPS = 6;

/** Loads a stored photo as base64 for the model. Return null to describe it in text instead. */
export type MediaLoader = (ref: MediaRef) => Promise<{ data: string; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp" } | null>;

export interface AgentResult {
  message: Message | null;
  needsApproval: boolean;
  approvalReasons: string[];
  handedOff: boolean;
  appointment: Appointment | null;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description: "Find open start times for a service. Returns up to 8 options spread across days.",
    input_schema: {
      type: "object",
      properties: {
        service_id: { type: "string" },
        from_date: { type: "string", description: "YYYY-MM-DD in local time. Defaults to today." },
        days: { type: "integer", description: "How many days to search, 1-30. Default 14." },
        time_of_day: { type: "string", enum: ["morning", "afternoon", "evening", "any"] },
      },
      required: ["service_id"],
    },
  },
  {
    name: "save_client_name",
    description: "Save the client's name once they share it.",
    input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
  },
  {
    name: "request_appointment",
    description: "Send a booking request to the owner for approval. Only use a start time returned by check_availability.",
    input_schema: {
      type: "object",
      properties: {
        service_id: { type: "string" },
        start_iso: { type: "string", description: "Exact ISO start time from check_availability" },
        notes: { type: "string", description: "Short summary for the owner: what the client wants and anything notable" },
        intake_answers: { type: "object", additionalProperties: { type: "string" }, description: "Answers keyed by the service's intake labels" },
        photo_labels: { type: "array", items: { type: "string" }, description: "What each photo the client sent shows, in order, e.g. ['Current hair','Inspo']" },
      },
      required: ["service_id", "start_iso", "notes"],
    },
  },
  {
    name: "request_reschedule",
    description: "Ask the owner to move one of this client's upcoming appointments to a new open time.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string" },
        new_start_iso: { type: "string" },
        reason: { type: "string" },
      },
      required: ["appointment_id", "new_start_iso"],
    },
  },
  {
    name: "flag_for_owner",
    description: "Mark a situation the owner may want to review (discount request, off-menu service, upset client, other).",
    input_schema: {
      type: "object",
      properties: { situation: { type: "string", enum: ["discount", "off_menu", "upset", "other"] }, summary: { type: "string" } },
      required: ["situation", "summary"],
    },
  },
  {
    name: "hand_off_to_owner",
    description: "Stop replying in this conversation and alert the owner to take over. Your final message should tell the client the owner will follow up.",
    input_schema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
  },
];

export async function runBemby(opts: {
  repo: Repo;
  conversationId: string;
  now?: Date;
  anthropic?: Anthropic;
  loadMedia?: MediaLoader;
}): Promise<AgentResult> {
  const { repo } = opts;
  const now = opts.now ?? new Date();
  const none: AgentResult = { message: null, needsApproval: false, approvalReasons: [], handedOff: false, appointment: null };

  const conversation = await repo.getConversation(opts.conversationId);
  if (!conversation) throw new Error("conversation not found");
  const business = await repo.getBusiness(conversation.business_id);
  if (!business || business.paused || conversation.mode !== "ai") return none;
  let client = (await repo.getClient(conversation.client_id))!;
  const services = await repo.listServices(business.id);
  const specials = await repo.listActiveSpecials(business.id, localDateKey(now, business.timezone));
  const clientAppts = await repo.listClientAppointments(client.id);
  const pastVisits = clientAppts.filter((a) => a.status === "confirmed" && new Date(a.starts_at) < now).length;
  const upcoming = clientAppts.filter((a) => (a.status === "confirmed" || a.status === "requested") && new Date(a.starts_at) >= now);

  const history = (await repo.listMessages(conversation.id, 40)).filter((m) => m.status === "sent" || m.status === "received");
  if (!history.length || history[history.length - 1].author !== "client") return none;

  // Build alternating user/assistant turns. Owner replies appear as assistant turns so Bemby keeps context.
  const turns: Anthropic.MessageParam[] = [];
  let usedImages = false;
  const recentClientMedia: MediaRef[] = [];
  for (const m of history) {
    if (m.author === "system") continue;
    const role = m.author === "client" ? "user" : "assistant";
    const blocks: Anthropic.ContentBlockParam[] = [];
    if (m.author === "client" && m.media.length) {
      for (const ref of m.media) {
        recentClientMedia.push(ref);
        const img = opts.loadMedia ? await opts.loadMedia(ref) : null;
        if (img) {
          blocks.push({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
          usedImages = true;
        } else {
          blocks.push({ type: "text", text: `[Client sent a photo${ref.label ? `: ${ref.label}` : ""}]` });
        }
      }
    }
    const text = m.author === "owner" ? `(${business.owner_name} replied personally) ${m.body}` : m.body;
    if (text.trim()) blocks.push({ type: "text", text });
    if (!blocks.length) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === role) (last.content as Anthropic.ContentBlockParam[]).push(...blocks);
    else turns.push({ role, content: blocks });
  }
  if (turns[0]?.role === "assistant") turns.unshift({ role: "user", content: "(conversation started)" });

  const system = buildSystemPrompt({ business, services, specials, client, conversation, pastVisits, upcoming, now });
  const anthropic = opts.anthropic ?? new Anthropic();
  const flags = new Set<string>();
  let appointment: Appointment | null = null;
  let rescheduled = false;
  let handedOff = false;
  let reply = "";

  const tz = business.timezone;
  async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
      case "check_availability": {
        const service = services.find((s) => s.id === input.service_id);
        if (!service) return "Unknown service_id.";
        let from = now;
        if (typeof input.from_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.from_date)) {
          const [y, mo, d] = input.from_date.split("-").map(Number);
          from = zonedTimeToUtc(y, mo, d, "00:00", tz);
        }
        const days = Math.min(30, Math.max(1, Number(input.days) || 14));
        const appts = await repo.listAppointments(business!.id, from.toISOString(), new Date(from.getTime() + (days + 1) * 86400_000).toISOString());
        let slots = findOpenSlots({ business: business!, service, appointments: appts, now, from, days, limit: 40 });
        const tod = input.time_of_day;
        if (tod && tod !== "any") {
          slots = slots.filter((s) => {
            const h = zonedParts(s.start, tz).hour;
            return tod === "morning" ? h < 12 : tod === "afternoon" ? h >= 12 && h < 17 : h >= 17;
          });
        }
        slots = slots.slice(0, 8);
        if (!slots.length) return "No openings in that range. Try other dates, or offer to have the owner reach out.";
        return slots.map((s) => `${s.start.toISOString()} = ${formatSlot(s.start, tz)}`).join("\n");
      }
      case "save_client_name": {
        const name = String(input.name ?? "").trim().slice(0, 80);
        if (name) client = await repo.updateClient(client.id, { name });
        return "Saved.";
      }
      case "request_appointment": {
        const service = services.find((s) => s.id === input.service_id);
        if (!service) return "Unknown service_id.";
        const start = new Date(String(input.start_iso));
        if (isNaN(start.getTime())) return "Invalid start_iso.";
        const appts = await repo.listAppointments(business!.id, new Date(start.getTime() - 86400_000).toISOString(), new Date(start.getTime() + 86400_000).toISOString());
        const check = isSlotOpen({ business: business!, service, appointments: appts, start, now });
        if (!check.ok) return `That time is not available (${check.reason}). Check availability again and offer other options.`;
        const labels = Array.isArray(input.photo_labels) ? (input.photo_labels as string[]) : [];
        const photos = recentClientMedia.slice(-Math.max(labels.length, 0) || undefined).map((p, i) => ({ ...p, label: labels[i] ?? p.label ?? "Photo" }));
        appointment = await repo.createAppointment({
          business_id: business!.id, client_id: client.id, service_id: service.id, conversation_id: conversation!.id,
          starts_at: start.toISOString(), ends_at: check.end.toISOString(), status: "requested", kind: "new",
          replaces_appointment_id: null, source: "ai", price_cents: service.price_cents,
          notes: String(input.notes ?? "").slice(0, 1000),
          intake: (input.intake_answers as Record<string, string>) ?? {},
          photos: labels.length ? photos : recentClientMedia,
        });
        await repo.updateConversation(conversation!.id, { topic: service.name });
        return `Request sent to ${business!.owner_name} for ${formatSlot(start, tz)}. It is NOT confirmed yet.`;
      }
      case "request_reschedule": {
        const orig = upcoming.find((a) => a.id === input.appointment_id);
        if (!orig) return "That appointment id is not one of this client's upcoming appointments.";
        const service = services.find((s) => s.id === orig.service_id);
        if (!service) return "Could not find the service for that appointment. Hand off to the owner.";
        const start = new Date(String(input.new_start_iso));
        const appts = await repo.listAppointments(business!.id, new Date(start.getTime() - 86400_000).toISOString(), new Date(start.getTime() + 86400_000).toISOString());
        const check = isSlotOpen({ business: business!, service, appointments: appts, start, now, ignoreAppointmentId: orig.id });
        if (!check.ok) return `That time is not available (${check.reason}).`;
        appointment = await repo.createAppointment({
          business_id: business!.id, client_id: client.id, service_id: service.id, conversation_id: conversation!.id,
          starts_at: start.toISOString(), ends_at: check.end.toISOString(), status: "requested", kind: "reschedule",
          replaces_appointment_id: orig.id, source: "ai", price_cents: orig.price_cents,
          notes: `Wants to move from ${formatSlot(orig.starts_at, tz)}. ${String(input.reason ?? "")}`.trim(),
          intake: orig.intake, photos: orig.photos,
        });
        rescheduled = true;
        await repo.updateConversation(conversation!.id, { topic: "Reschedule" });
        return `Reschedule request sent to ${business!.owner_name}. The original time stays until it is approved.`;
      }
      case "flag_for_owner":
        flags.add(String(input.situation));
        return "Flagged for the owner.";
      case "hand_off_to_owner":
        handedOff = true;
        await repo.updateConversation(conversation!.id, { mode: "needs_owner" });
        return "The owner has been alerted. Write one short final message telling the client the owner will follow up.";
      default:
        return "Unknown tool.";
    }
  }

  const messages = [...turns];
  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await anthropic.messages.create({
      model: usedImages ? VISION_MODEL : CHAT_MODEL,
      max_tokens: 600,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
    });
    const text = res.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join(" ").trim();
    const calls = res.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !calls.length) {
      reply = text;
      break;
    }
    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of calls) {
      let out: string;
      try {
        out = await runTool(call.name, (call.input ?? {}) as Record<string, unknown>);
      } catch (e) {
        out = `Error: ${(e as Error).message}`;
      }
      results.push({ type: "tool_result", tool_use_id: call.id, content: out });
    }
    messages.push({ role: "user", content: results });
  }
  if (!reply) reply = `Thanks! Let me check with ${business.owner_name} and get right back to you.`;

  // Decide whether this reply can go out on its own.
  const reasons: string[] = [];
  if (business.autonomy === "approve_all") reasons.push("You review every reply");
  if (business.autonomy === "situational") {
    const r = business.ask_first;
    if (r.new_client && pastVisits === 0) reasons.push("New client");
    if (r.reschedule && rescheduled) reasons.push("Reschedule");
    if (r.discount && flags.has("discount")) reasons.push("Discount request");
    if (r.off_menu && flags.has("off_menu")) reasons.push("Service not on your menu");
    if (r.upset && flags.has("upset")) reasons.push("Client seems upset");
    if (r.every_booking && appointment) reasons.push("New booking");
  }
  const needsApproval = reasons.length > 0;
  const message = await repo.addMessage({
    business_id: business.id,
    conversation_id: conversation.id,
    author: "ai",
    body: reply.slice(0, 1200),
    media: [],
    status: needsApproval ? "pending_approval" : "sent",
    approval_reason: needsApproval ? reasons.join(", ") : null,
  });
  return { message, needsApproval, approvalReasons: reasons, handedOff, appointment };
}
