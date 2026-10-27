-- Bemby: Stripe billing. Run in the Supabase SQL Editor after 0002_channels.sql.

alter table public.businesses add column if not exists stripe_customer_id text unique;
alter table public.businesses add column if not exists stripe_subscription_id text unique;
-- Mirrors Stripe: 'none' (never paid) | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' ...
alter table public.businesses add column if not exists subscription_status text not null default 'none';
alter table public.businesses add column if not exists current_period_end timestamptz;
alter table public.businesses add column if not exists cancel_at_period_end boolean not null default false;
