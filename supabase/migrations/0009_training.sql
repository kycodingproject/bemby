-- "Train your receptionist": questions for the owner to answer. Answers are added to what the AI knows.
create table if not exists public.training_questions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  question text not null,
  answer text,
  -- 'starter' = from Bemby's question bank, 'from_chat' = a client asked something the AI didn't know
  source text not null default 'starter' check (source in ('starter','from_chat')),
  conversation_id uuid references public.conversations(id) on delete set null,
  status text not null default 'open' check (status in ('open','answered','skipped')),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists training_questions_business_idx on public.training_questions (business_id, status);
create unique index if not exists training_questions_unique_q on public.training_questions (business_id, lower(question));

alter table public.training_questions enable row level security;
drop policy if exists "owner manages training" on public.training_questions;
create policy "owner manages training" on public.training_questions for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));
