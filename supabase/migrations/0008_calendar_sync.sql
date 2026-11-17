-- Calendar sync: links to the owner's Google/Apple/Outlook calendars (their events count as busy),
-- and a secret for the private link that shows Bemby bookings in those calendars.
alter table public.businesses add column if not exists calendar_feeds jsonb not null default '[]';
alter table public.businesses add column if not exists calendar_all_day_blocks boolean not null default true;
alter table public.businesses add column if not exists calendar_token text unique;
