-- The receptionist's name and how it introduces itself to clients.
alter table public.businesses add column if not exists assistant_name text;
alter table public.businesses add column if not exists assistant_role text not null default 'assistant';
alter table public.businesses drop constraint if exists businesses_assistant_role_check;
alter table public.businesses add constraint businesses_assistant_role_check check (assistant_role in ('assistant','booking receptionist'));
