-- TikTok DMs (TikTok Business Messaging API).
alter table public.businesses add column if not exists tiktok_account_id text unique;
alter table public.businesses add column if not exists tiktok_username text;

-- A TikTok client is identified by their conversation with the business.
alter table public.clients add column if not exists tiktok_id text;
create unique index if not exists clients_business_tiktok_key on public.clients (business_id, tiktok_id);

alter table public.conversations drop constraint if exists conversations_channel_check;
alter table public.conversations add constraint conversations_channel_check check (channel in ('sms','instagram','messenger','tiktok'));

-- Tokens (server only; this table has no public policies)
alter table public.business_channels add column if not exists tiktok_open_id text;
alter table public.business_channels add column if not exists tiktok_username text;
alter table public.business_channels add column if not exists tiktok_access_token text;
alter table public.business_channels add column if not exists tiktok_refresh_token text;
alter table public.business_channels add column if not exists tiktok_token_expires_at timestamptz;
alter table public.business_channels add column if not exists tiktok_refresh_expires_at timestamptz;
