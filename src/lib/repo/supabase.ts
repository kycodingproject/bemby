import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, Business, Channel, Client, Conversation, Goal, Message, Service, Special } from "../types";
import type { Repo } from "./types";

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/**
 * Supabase-backed repo. Server code (webhooks, AI) uses the service-role key, which bypasses
 * row level security, so every query here filters by business_id explicitly.
 */
export class SupabaseRepo implements Repo {
  constructor(private sb: SupabaseClient) {}

  async getBusiness(id: string) {
    return must(await this.sb.from("businesses").select("*").eq("id", id).maybeSingle()) as Business | null;
  }
  async getBusinessByPhone(phone: string) {
    return must(await this.sb.from("businesses").select("*").eq("phone_number", phone).maybeSingle()) as Business | null;
  }
  async getBusinessByChannelAccount(channel: "instagram" | "messenger", accountId: string) {
    const col = channel === "instagram" ? "instagram_account_id" : "messenger_page_id";
    return must(await this.sb.from("businesses").select("*").eq(col, accountId).maybeSingle()) as Business | null;
  }
  async updateBusiness(id: string, patch: Partial<Business>) {
    return must(await this.sb.from("businesses").update(patch).eq("id", id).select().single()) as Business;
  }

  async listServices(businessId: string) {
    return must(await this.sb.from("services").select("*").eq("business_id", businessId).eq("active", true).order("sort")) as Service[];
  }
  async listActiveSpecials(businessId: string, onDate: string) {
    return must(
      await this.sb.from("specials").select("*").eq("business_id", businessId).eq("mention_in_chats", true).lte("starts_on", onDate).gte("ends_on", onDate),
    ) as Special[];
  }
  async listSpecials(businessId: string) {
    return must(await this.sb.from("specials").select("*").eq("business_id", businessId).order("starts_on", { ascending: false })) as Special[];
  }
  async createSpecial(s: Omit<Special, "id">) {
    return must(await this.sb.from("specials").insert(s).select().single()) as Special;
  }

  async getClient(id: string) {
    return must(await this.sb.from("clients").select("*").eq("id", id).maybeSingle()) as Client | null;
  }
  async findOrCreateClient(businessId: string, channel: Channel, handle: string) {
    const col = channel === "sms" ? "phone" : channel === "instagram" ? "instagram_id" : "messenger_id";
    const found = must(await this.sb.from("clients").select("*").eq("business_id", businessId).eq(col, handle).maybeSingle()) as Client | null;
    if (found) return found;
    return must(await this.sb.from("clients").insert({ business_id: businessId, [col]: handle }).select().single()) as Client;
  }
  async updateClient(id: string, patch: Partial<Client>) {
    return must(await this.sb.from("clients").update(patch).eq("id", id).select().single()) as Client;
  }
  async listClients(businessId: string) {
    return must(await this.sb.from("clients").select("*").eq("business_id", businessId)) as Client[];
  }

  async findOrCreateConversation(businessId: string, clientId: string, channel: Channel) {
    const found = must(
      await this.sb.from("conversations").select("*").eq("business_id", businessId).eq("client_id", clientId).eq("channel", channel).maybeSingle(),
    ) as Conversation | null;
    if (found) return found;
    return must(await this.sb.from("conversations").insert({ business_id: businessId, client_id: clientId, channel }).select().single()) as Conversation;
  }
  async getConversation(id: string) {
    return must(await this.sb.from("conversations").select("*").eq("id", id).maybeSingle()) as Conversation | null;
  }
  async listConversations(businessId: string) {
    return must(await this.sb.from("conversations").select("*").eq("business_id", businessId).order("last_message_at", { ascending: false })) as Conversation[];
  }
  async updateConversation(id: string, patch: Partial<Conversation>) {
    return must(await this.sb.from("conversations").update(patch).eq("id", id).select().single()) as Conversation;
  }
  async listMessages(conversationId: string, limit = 50) {
    const rows = must(
      await this.sb.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(limit),
    ) as Message[];
    return rows.reverse();
  }
  async addMessage(m: Omit<Message, "id" | "created_at"> & { provider_message_id?: string }) {
    const row = must(await this.sb.from("messages").insert(m).select().single()) as Message;
    await this.sb.from("conversations").update({ last_message_at: row.created_at }).eq("id", m.conversation_id);
    return row;
  }
  async updateMessage(id: string, patch: Partial<Message>) {
    return must(await this.sb.from("messages").update(patch).eq("id", id).select().single()) as Message;
  }
  async getMessage(id: string) {
    return must(await this.sb.from("messages").select("*").eq("id", id).maybeSingle()) as Message | null;
  }

  async listAppointments(businessId: string, fromIso: string, toIso: string) {
    return must(
      await this.sb.from("appointments").select("*").eq("business_id", businessId).gte("ends_at", fromIso).lte("starts_at", toIso).order("starts_at"),
    ) as Appointment[];
  }
  async listClientAppointments(clientId: string) {
    return must(await this.sb.from("appointments").select("*").eq("client_id", clientId).order("starts_at")) as Appointment[];
  }
  async getAppointment(id: string) {
    return must(await this.sb.from("appointments").select("*").eq("id", id).maybeSingle()) as Appointment | null;
  }
  async createAppointment(a: Omit<Appointment, "id" | "created_at">) {
    return must(await this.sb.from("appointments").insert(a).select().single()) as Appointment;
  }
  async updateAppointment(id: string, patch: Partial<Appointment>) {
    return must(await this.sb.from("appointments").update(patch).eq("id", id).select().single()) as Appointment;
  }

  async listGoals(businessId: string) {
    return must(await this.sb.from("goals").select("*").eq("business_id", businessId).order("created_at")) as Goal[];
  }
  async createGoal(g: Omit<Goal, "id">) {
    return must(await this.sb.from("goals").insert(g).select().single()) as Goal;
  }
}

export function serviceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}
