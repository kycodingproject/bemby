-- How long Bemby waits after a client's last message before replying (lets clients finish typing).
alter table public.businesses add column if not exists reply_delay_seconds int not null default 60;
alter table public.businesses drop constraint if exists businesses_reply_delay_check;
alter table public.businesses add constraint businesses_reply_delay_check check (reply_delay_seconds between 0 and 180);
