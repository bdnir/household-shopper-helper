
create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  group_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.push_subscriptions to anon, authenticated;
grant all on public.push_subscriptions to service_role;

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_all on public.push_subscriptions
  for all to anon, authenticated using (true) with check (true);

create index push_subscriptions_group_id_idx on public.push_subscriptions(group_id);
create index push_subscriptions_member_id_idx on public.push_subscriptions(member_id);

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://jdosqolydtmspejyyjvm.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('message_id', NEW.id)
  );
  return NEW;
end;
$$;

drop trigger if exists on_new_message_notify on public.messages;
create trigger on_new_message_notify
after insert on public.messages
for each row execute function public.notify_new_message();
