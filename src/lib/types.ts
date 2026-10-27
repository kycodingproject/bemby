export type Channel = "sms" | "instagram" | "messenger";
export type Autonomy = "auto" | "approve_all" | "situational";
export type AskFirstKey = "new_client" | "reschedule" | "discount" | "off_menu" | "upset" | "every_booking";
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Business {
  id: string;
  name: string;
  owner_name: string;
  business_type: string;
  timezone: string;
  phone_number: string | null;
  instagram_account_id: string | null;
  messenger_page_id: string | null;
  autonomy: Autonomy;
  ask_first: Record<AskFirstKey, boolean>;
  paused: boolean;
  /** Seconds to wait after the client's last message before replying (0 = right away). Missing until migration 0004 runs. */
  reply_delay_seconds?: number;
  hours: Partial<Record<DayKey, { start: string; end: string }[]>>;
  buffer_minutes: number;
  min_notice_hours: number;
  policies: string;
  plan: string;
  monthly_text_limit: number;
  instagram_username?: string | null;
  messenger_page_name?: string | null;
  texting_status?: "none" | "requested" | "pending" | "active" | "failed";
  texting_registration?: TextingRegistration | Record<string, never>;
  texting_requested_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}

/** What carriers need to approve a business for texting (A2P 10DLC). */
export interface TextingRegistration {
  legal_name: string;
  ein: string | null; // null = sole proprietor
  street: string;
  city: string;
  state: string;
  zip: string;
  contact_phone: string; // sole proprietors get a verification code here
  contact_email: string;
}

export interface IntakeItem {
  key: string;
  label: string;
  type: "photo" | "text";
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  price_cents: number | null;
  price_note: string | null;
  duration_minutes: number;
  deposit_cents: number;
  intake: IntakeItem[];
  active: boolean;
}

export interface Client {
  id: string;
  business_id: string;
  name: string | null;
  phone: string | null;
  instagram_id: string | null;
  messenger_id: string | null;
  notes: string;
  sms_opt_out: boolean;
}

export interface Conversation {
  id: string;
  business_id: string;
  client_id: string;
  channel: Channel;
  mode: "ai" | "owner" | "needs_owner";
  topic: string | null;
  last_message_at: string;
}

export interface MediaRef {
  /** Storage path, or a data: URL in demo mode */
  path: string;
  content_type: string;
  label?: string;
}

export interface Message {
  id: string;
  business_id: string;
  conversation_id: string;
  author: "client" | "ai" | "owner" | "system";
  body: string;
  media: MediaRef[];
  status: "sent" | "received" | "pending_approval" | "discarded" | "failed";
  approval_reason: string | null;
  provider_message_id?: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  client_id: string;
  service_id: string | null;
  conversation_id: string | null;
  starts_at: string;
  ends_at: string;
  status: "requested" | "confirmed" | "declined" | "cancelled";
  kind: "new" | "reschedule";
  replaces_appointment_id: string | null;
  source: "ai" | "owner" | "sync";
  price_cents: number | null;
  notes: string;
  intake: Record<string, string>;
  photos: MediaRef[];
  created_at: string;
}

export interface Goal {
  id: string;
  business_id: string;
  label: string;
  metric: "ai_bookings" | "manual";
  target: number;
  manual_progress: number;
  period_start: string;
  period_end: string;
  reward_xp: number;
}

export interface Special {
  id: string;
  business_id: string;
  service_id: string | null;
  deal: string;
  starts_on: string;
  ends_on: string;
  mention_in_chats: boolean;
  caption: string;
}
