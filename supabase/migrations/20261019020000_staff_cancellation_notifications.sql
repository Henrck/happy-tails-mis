-- Back up the database and apply in staging before production.
-- Existing UUID appointment IDs and existing notification triggers remain unchanged.
begin;
create table if not exists public.appointment_staff_cancellations (
 appointment_id uuid primary key references public.appointments(id) on delete cascade,
 reason text not null check (char_length(btrim(reason)) between 5 and 500),
 cancelled_by uuid not null,
 cancelled_at timestamptz not null default now()
);
alter table public.appointment_staff_cancellations enable row level security;
drop policy if exists "Customer reads own staff cancellations" on public.appointment_staff_cancellations;
create policy "Customer reads own staff cancellations" on public.appointment_staff_cancellations
 for select to authenticated using (exists (select 1 from public.appointments a where a.id=appointment_id and a.customer_id=auth.uid()));
drop policy if exists "Staff reads cancellations" on public.appointment_staff_cancellations;
create policy "Staff reads cancellations" on public.appointment_staff_cancellations
 for select to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role::text in ('admin','superadmin')));

create or replace function public.happytails_staff_cancel_appointment(p_appointment_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_role text; v_appt public.appointments%rowtype; v_reason text := btrim(p_reason);
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select role::text into v_role from public.profiles where id=auth.uid();
 if v_role not in ('admin','superadmin') or v_role is null then raise exception 'Only authorized staff may cancel appointments' using errcode='42501'; end if;
 if v_reason is null or char_length(v_reason) not between 5 and 500 then raise exception 'Enter a reason between 5 and 500 characters'; end if;
 select * into v_appt from public.appointments where id=p_appointment_id for update;
 if not found then raise exception 'Appointment not found'; end if;
 if v_appt.status::text not in ('pending','confirmed') then raise exception 'Only pending or confirmed appointments can be cancelled'; end if;
 update public.appointments set status='cancelled' where id=p_appointment_id;
 insert into public.appointment_staff_cancellations(appointment_id,reason,cancelled_by)
 values(p_appointment_id,v_reason,auth.uid())
 on conflict(appointment_id) do nothing;
 -- Existing appointment-status trigger runs during the update above and creates
 -- the notification. Update its message once the cancellation reason is recorded.
 if v_appt.customer_id is not null then
  update public.notifications n set
    title='Appointment Cancelled',
    message='Your ' || replace(v_appt.service_type::text,'_',' ') || ' appointment was cancelled. Reason: ' || left(v_reason,180)
  where n.id = (
    select id from public.notifications
    where appointment_id=p_appointment_id and customer_id=v_appt.customer_id
      and (lower(title) like '%cancel%' or lower(message) like '%cancel%')
    order by created_at desc limit 1
  );
  if not found then
   insert into public.notifications(customer_id,appointment_id,title,message,read)
   values(v_appt.customer_id,p_appointment_id,'Appointment Cancelled',
    'Your appointment was cancelled. Reason: ' || left(v_reason,180),false);
  end if;
 end if;
end;
$$;
revoke all on function public.happytails_staff_cancel_appointment(uuid,text) from public,anon;
grant execute on function public.happytails_staff_cancel_appointment(uuid,text) to authenticated;
commit;
