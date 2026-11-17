-- Where clients go. Sent to clients when their booking is confirmed.
alter table public.businesses add column if not exists address text;
-- Extra directions, e.g. "Suite 4, ring the buzzer" or "Parking in the back".
alter table public.businesses add column if not exists address_note text;
-- true: the receptionist can share the address with anyone who asks.
-- false (home studios): only sent once a booking is confirmed.
alter table public.businesses add column if not exists address_public boolean not null default true;
