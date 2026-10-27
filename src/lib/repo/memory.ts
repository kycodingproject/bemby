import type { Appointment, Business, Channel, Client, Conversation, Goal, Message, Service, Special } from "../types";
import type { Repo } from "./types";
import { seedDemo } from "./seed";

export interface MemoryDb {
  businesses: Business[];
  services: Service[];
  clients: Client[];
  conversations: Conversation[];
  messages: Message[];
  appointments: Appointment[];
  goals: Goal[];
  specials: Special[];
}

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function patchRow<T extends { id: string }>(rows: T[], id: string, patch: Partial<T>): T {
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) throw new Error(`not found: ${id}`);
  rows[i] = { ...rows[i], ...patch, id };
  return rows[i];
}

/** In-memory store used for the demo and tests. Lives on globalThis so dev hot-reloads keep it. */
export class MemoryRepo implements Repo {
  constructor(public db: MemoryDb) {}

  async getBusiness(id: string) { return this.db.businesses.find((b) => b.id === id) ?? null; }
  async getBusinessByPhone(phone: string) { return this.db.businesses.find((b) => b.phone_number === phone) ?? null; }
  async getBusinessByChannelAccount(channel: "instagram" | "messenger", accountId: string) {
    return this.db.businesses.find((b) => (channel === "instagram" ? b.instagram_account_id : b.messenger_page_id) === accountId) ?? null;
  }
  async updateBusiness(id: string, patch: Partial<Business>) { return patchRow(this.db.businesses, id, patch); }

  async listServices(businessId: string) { return this.db.services.filter((s) => s.business_id === businessId && s.active); }
  async listActiveSpecials(businessId: string, onDate: string) {
    return this.db.specials.filter((s) => s.business_id === businessId && s.mention_in_chats && s.starts_on <= onDate && s.ends_on >= onDate);
  }
  async listSpecials(businessId: string) { return this.db.specials.filter((s) => s.business_id === businessId); }
  async createSpecial(s: Omit<Special, "id">) { const row = { ...s, id: uid() }; this.db.specials.push(row); return row; }

  async getClient(id: string) { return this.db.clients.find((c) => c.id === id) ?? null; }
  async findOrCreateClient(businessId: string, channel: Channel, handle: string) {
    const key = channel === "sms" ? "phone" : channel === "instagram" ? "instagram_id" : "messenger_id";
    let c = this.db.clients.find((x) => x.business_id === businessId && x[key] === handle);
    if (!c) {
      c = { id: uid(), business_id: businessId, name: null, phone: null, instagram_id: null, messenger_id: null, notes: "", sms_opt_out: false, [key]: handle };
      this.db.clients.push(c);
    }
    return c;
  }
  async updateClient(id: string, patch: Partial<Client>) { return patchRow(this.db.clients, id, patch); }
  async listClients(businessId: string) { return this.db.clients.filter((c) => c.business_id === businessId); }

  async findOrCreateConversation(businessId: string, clientId: string, channel: Channel) {
    let c = this.db.conversations.find((x) => x.business_id === businessId && x.client_id === clientId && x.channel === channel);
    if (!c) {
      c = { id: uid(), business_id: businessId, client_id: clientId, channel, mode: "ai", topic: null, last_message_at: now() };
      this.db.conversations.push(c);
    }
    return c;
  }
  async getConversation(id: string) { return this.db.conversations.find((c) => c.id === id) ?? null; }
  async listConversations(businessId: string) {
    return this.db.conversations.filter((c) => c.business_id === businessId).sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
  }
  async updateConversation(id: string, patch: Partial<Conversation>) { return patchRow(this.db.conversations, id, patch); }
  async listMessages(conversationId: string, limit = 50) {
    return this.db.messages.filter((m) => m.conversation_id === conversationId).sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-limit);
  }
  async addMessage(m: Omit<Message, "id" | "created_at">) {
    const row: Message = { ...m, id: uid(), created_at: now() };
    this.db.messages.push(row);
    await this.updateConversation(m.conversation_id, { last_message_at: row.created_at });
    return row;
  }
  async updateMessage(id: string, patch: Partial<Message>) { return patchRow(this.db.messages, id, patch); }
  async getMessage(id: string) { return this.db.messages.find((m) => m.id === id) ?? null; }

  async listAppointments(businessId: string, fromIso: string, toIso: string) {
    return this.db.appointments
      .filter((a) => a.business_id === businessId && a.ends_at >= fromIso && a.starts_at <= toIso)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }
  async listClientAppointments(clientId: string) {
    return this.db.appointments.filter((a) => a.client_id === clientId).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }
  async getAppointment(id: string) { return this.db.appointments.find((a) => a.id === id) ?? null; }
  async createAppointment(a: Omit<Appointment, "id" | "created_at">) {
    const row: Appointment = { ...a, id: uid(), created_at: now() };
    this.db.appointments.push(row);
    return row;
  }
  async updateAppointment(id: string, patch: Partial<Appointment>) { return patchRow(this.db.appointments, id, patch); }

  async listGoals(businessId: string) { return this.db.goals.filter((g) => g.business_id === businessId); }
  async createGoal(g: Omit<Goal, "id">) { const row = { ...g, id: uid() }; this.db.goals.push(row); return row; }
}

const g = globalThis as unknown as { __bembyDemo?: MemoryRepo };
export function demoRepo() {
  if (!g.__bembyDemo) g.__bembyDemo = new MemoryRepo(seedDemo(new Date()));
  return g.__bembyDemo;
}
export function resetDemo() {
  g.__bembyDemo = new MemoryRepo(seedDemo(new Date()));
  return g.__bembyDemo;
}
