-- Bemby: Instagram / Messenger connections and business-number requests.
-- Run in the Supabase SQL Editor after 0001_init.sql.

-- Access tokens live in their own table with RLS on and NO policies,
-- so only the server (service role) can read them. Owners never see raw tokens.
create table if not exists public.business_channels (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  instagram_user_id text,
  instagram_username text,
  instagram_token text,
  instagram_token_expires_at timestamptz,
  messenger_page_id text,
  messenger_page_name text,
  messenger_page_token text,
  -- Facebook Pages offered after login, waiting for the owner to pick one (includes page tokens)
  pending_pages jsonb,
  updated_at timestamptz not null default now()
);
alter table public.business_channels enable row level security;

-- Friendly names shown in the dashboard (no secrets)
alter table public.businesses add column if not exists instagram_username text;
alter table public.businesses add column if not exists messenger_page_name text;

-- Business phone number: 'none' | 'requested' (asked at signup) | 'pending' (carrier review) | 'active' | 'failed'
alter table public.businesses add column if not exists texting_status text not null default 'none';
alter table public.businesses drop constraint if exists businesses_texting_status_check;
alter table public.businesses add constraint businesses_texting_status_check check (texting_status in ('none','requested','pending','active','failed'));
-- Info carriers need for registration (legal name, EIN or sole proprietor, address, contact phone)
alter table public.businesses add column if not exists texting_registration jsonb not null default '{}';
alter table public.businesses add column if not exists texting_requested_at timestamptz;
alter table public.business_channels add column if not exists pending_pages jsonb;
