-- Real customer notifications. The /account/notifications page has been
-- a placeholder this whole time ("TBD whether we build this out"). This
-- gives it a real backing table plus a trigger that actually populates
-- it: whenever an appointment's status changes, the customer who owns
-- it (if any — walk-ins have no account to notify) gets a notification
-- row automatically. No app code has to remember to call anything; it
-- fires wherever the status update comes from (Appointment Management,
-- the realtime board, wherever).

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_customer_id_idx on public.notifications (customer_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Customers read their own notifications" on public.notifications;
create policy "Customers read their own notifications"
  on public.notifications for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists "Customers mark their own notifications read" on public.notifications;
create policy "Customers mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- No INSERT policy for customers/authenticated on purpose — the only
-- writer is the trigger below, which runs as security definer (bypasses
-- RLS). Customers should never be able to fabricate their own
-- notifications.

create or replace function public.notify_appointment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_message text;
  v_date text;
begin
  -- Walk-ins have no customer account — nothing to notify.
  if new.customer_id is null then
    return new;
  end if;
  -- Only fire on an actual status change, not every column update.
  if old.status = new.status then
    return new;
  end if;

  v_date := to_char(new.scheduled_date, 'FMMonth FMDD, YYYY');

  case new.status
    when 'confirmed' then
      v_title := 'Appointment confirmed';
      v_message := 'Your appointment on ' || v_date || ' has been confirmed.';
    when 'checked_in' then
      v_title := 'Your pet has checked in';
      v_message := 'We''ve received your pet for your appointment on ' || v_date || ' and are getting started.';
    when 'completed' then
      v_title := 'Ready for pickup!';
      v_message := 'Your pet is all done and ready to go home.';
    when 'cancelled' then
      v_title := 'Appointment cancelled';
      v_message := 'Your appointment on ' || v_date || ' was cancelled.';
    else
      v_title := 'Appointment update';
      v_message := 'Your appointment on ' || v_date || ' is now ' || new.status || '.';
  end case;

  insert into public.notifications (customer_id, appointment_id, title, message)
  values (new.customer_id, new.id, v_title, v_message);

  return new;
end;
$$;

drop trigger if exists trg_notify_appointment_status_change on public.appointments;
create trigger trg_notify_appointment_status_change
  after update of status on public.appointments
  for each row
  execute function public.notify_appointment_status_change();
