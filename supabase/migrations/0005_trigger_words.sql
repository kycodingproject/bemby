-- Extra words (besides the built-in booking words and service names) that let Bemby answer a chat.
alter table public.businesses add column if not exists trigger_words text[] not null default '{}';
