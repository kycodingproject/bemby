-- Time the owner blocked off on the Bemby calendar (a day off, a vacation, a lunch break).
create table if not exists public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists time_blocks_business_idx on public.time_blocks (business_id, starts_at);

alter table public.time_blocks enable row level security;
drop policy if exists "owner manages blocks" on public.time_blocks;
create policy "owner manages blocks" on public.time_blocks for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
