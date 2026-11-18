-- Clients' Instagram/TikTok profile photos (a copy kept in storage, since Instagram's photo links expire).
alter table public.clients add column if not exists avatar_path text;
alter table public.clients add column if not exists avatar_checked_at timestamptz;
