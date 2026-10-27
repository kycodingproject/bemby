import type { Appointment, Business, Channel, Client, Conversation, Goal, Message, Service, Special } from "../types";

/** Everything Bemby reads and writes. Two implementations: Supabase (real) and in-memory (demo). */
export interface Repo {
  // businesses
  getBusiness(id: string): Promise<Business | null>;
  getBusinessByPhone(phone: string): Promise<Business | null>;
  getBusinessByChannelAccount(channel: "instagram" | "messenger", accountId: string): Promise<Business | null>;
  updateBusiness(id: string, patch: Partial<Business>): Promise<Business>;

  // services & specials
  listServices(businessId: string): Promise<Service[]>;
  createService(s: Omit<Service, "id"> & { sort?: number }): Promise<Service>;
  updateService(id: string, patch: Partial<Service> & { sort?: number }): Promise<Service>;
  listActiveSpecials(businessId: string, onDate: string): Promise<Special[]>;
  listSpecials(businessId: string): Promise<Special[]>;
  createSpecial(s: Omit<Special, "id">): Promise<Special>;

  // clients
  getClient(id: string): Promise<Client | null>;
  findOrCreateClient(businessId: string, channel: Channel, handle: string): Promise<Client>;
  updateClient(id: string, patch: Partial<Client>): Promise<Client>;
  listClients(businessId: string): Promise<Client[]>;

  // conversations & messages
  findOrCreateConversation(businessId: string, clientId: string, channel: Channel): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  listConversations(businessId: string): Promise<Conversation[]>;
  updateConversation(id: string, patch: Partial<Conversation>): Promise<Conversation>;
  listMessages(conversationId: string, limit?: number): Promise<Message[]>;
  addMessage(m: Omit<Message, "id" | "created_at"> & { provider_message_id?: string }): Promise<Message>;
  updateMessage(id: string, patch: Partial<Message>): Promise<Message>;
  getMessage(id: string): Promise<Message | null>;

  // appointments
  listAppointments(businessId: string, fromIso: string, toIso: string): Promise<Appointment[]>;
  listClientAppointments(clientId: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | null>;
  createAppointment(a: Omit<Appointment, "id" | "created_at">): Promise<Appointment>;
  updateAppointment(id: string, patch: Partial<Appointment>): Promise<Appointment>;

  // goals
  listGoals(businessId: string): Promise<Goal[]>;
  createGoal(g: Omit<Goal, "id">): Promise<Goal>;
}
