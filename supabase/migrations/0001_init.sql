-- Bemby initial schema
-- Run in Supabase SQL editor or with `supabase db push`.

create extension if not exists "pgcrypto";

-- One row per business (a stylist, esthetician, tattoo artist, ...)
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  owner_name text not null,
  business_type text not null default 'hair',
  timezone text not null default 'America/Los_Angeles',
  -- Dedicated Bemby number (E.164, e.g. +13105550123)
  phone_number text unique,
  twilio_number_sid text,
  instagram_account_id text unique,
  messenger_page_id text unique,
  -- 'auto' | 'approve_all' | 'situational'
  autonomy text not null default 'situational' check (autonomy in ('auto','approve_all','situational')),
  -- which situations need approval in 'situational' mode
  ask_first jsonb not null default '{"new_client":true,"reschedule":true,"discount":true,"off_menu":true,"upset":true,"every_booking":false}',
  paused boolean not null default false,
  -- {"mon":[{"start":"09:00","end":"18:00"}], "tue":[...], ...}; missing day = closed
  hours jsonb not null default '{}',
  buffer_minutes int not null default 15,
  min_notice_hours int not null default 12,
  policies text not null default '',
  plan text not null default 'trial',
  monthly_text_limit int not null default 500,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  price_cents int,
  price_note text,                      -- e.g. "starts at", "+$20 for long hair"
  duration_minutes int not null default 60,
  deposit_cents int not null default 0,
  -- what Bemby collects before booking: [{"key":"current_photo","label":"A photo of their hair now","type":"photo"}, ...]
  intake jsonb not null default '[]',
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text,
  phone text,
  instagram_id text,
  messenger_id text,
  notes text not null default '',
  sms_opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  unique (business_id, phone),
  unique (business_id, instagram_id),
  unique (business_id, messenger_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  channel text not null check (channel in ('sms','instagram','messenger')),
  -- 'ai' = Bemby replying, 'owner' = owner took over, 'needs_owner' = Bemby handed off
  mode text not null default 'ai' check (mode in ('ai','owner','needs_owner')),
  topic text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (business_id, client_id, channel)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author text not null check (author in ('client','ai','owner','system')),
  body text not null default '',
  -- [{"path":"client-photos/...","content_type":"image/jpeg"}]
  media jsonb not null default '[]',
  -- 'sent' | 'received' | 'pending_approval' | 'discarded' | 'failed'
  status text not null default 'sent',
  approval_reason text,
  provider_message_id text unique,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- 'requested' waits for owner; 'confirmed'; 'declined'; 'cancelled'
  status text not null default 'requested' check (status in ('requested','confirmed','declined','cancelled')),
  kind text not null default 'new' check (kind in ('new','reschedule')),
  replaces_appointment_id uuid references public.appointments(id) on delete set null,
  source text not null default 'ai' check (source in ('ai','owner','sync')),
  price_cents int,
  notes text not null default '',          -- Bemby's summary for the owner
  intake jsonb not null default '{}',      -- answers to the service's intake questions
  photos jsonb not null default '[]',      -- [{"label":"Current hair","path":"..."}]
  external_calendar_id text,
  created_at timestamptz not null default now()
);
create index appointments_business_time on public.appointments (business_id, starts_at);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null,
  -- 'ai_bookings' counts confirmed Bemby bookings in the period; 'manual' is updated by hand
  metric text not null default 'ai_bookings' check (metric in ('ai_bookings','manual')),
  target int not null check (target > 0),
  manual_progress int not null default 0,
  period_start date not null,
  period_end date not null,
  reward_xp int not null default 100,
  created_at timestamptz not null default now()
);

create table public.specials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  deal text not null,                       -- "20% off"
  starts_on date not null,
  ends_on date not null,
  mention_in_chats boolean not null default true,
  caption text not null default '',
  created_at timestamptz not null default now()
);

-- Row level security: an owner can only see their own business data.
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.appointments enable row level security;
alter table public.goals enable row level security;
alter table public.specials enable row level security;

create policy "own business" on public.businesses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.owns_business(b uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = b and owner_id = auth.uid());
$$;

create policy "own rows" on public.services for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "own rows" on public.clients for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "own rows" on public.conversations for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "own rows" on public.messages for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "own rows" on public.appointments for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "own rows" on public.goals for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "own rows" on public.specials for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- Private bucket for client photos (current hair, inspo, placement, ...)
insert into storage.buckets (id, name, public) values ('client-photos', 'client-photos', false)
  on conflict (id) do nothing;

create policy "owner reads own photos" on storage.objects for select
  using (bucket_id = 'client-photos' and public.owns_business((storage.foldername(name))[1]::uuid));
