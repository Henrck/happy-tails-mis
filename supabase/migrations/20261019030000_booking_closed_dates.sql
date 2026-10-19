-- HappyTails national holidays and shop closures. Apply once in Supabase SQL Editor.
begin;
create table if not exists public.booking_closed_dates (
  date date primary key,
  name text not null check (length(btrim(name)) between 2 and 160),
  category text not null check (category in ('regular_holiday','special_non_working','exceptional_closure')),
  source text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists booking_closed_dates_category_idx on public.booking_closed_dates(category);
alter table public.booking_closed_dates enable row level security;
-- All authenticated visitors may read closure dates. Anonymous users cannot change them.
drop policy if exists booking_closed_dates_read on public.booking_closed_dates;
create policy booking_closed_dates_read on public.booking_closed_dates for select to authenticated using (true);
drop policy if exists booking_closed_dates_superadmin_insert on public.booking_closed_dates;
create policy booking_closed_dates_superadmin_insert on public.booking_closed_dates for insert to authenticated with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role::text = 'superadmin') and category='exceptional_closure');
drop policy if exists booking_closed_dates_superadmin_update on public.booking_closed_dates;
create policy booking_closed_dates_superadmin_update on public.booking_closed_dates for update to authenticated using (exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin') and category='exceptional_closure') with check (exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin') and category='exceptional_closure');
drop policy if exists booking_closed_dates_superadmin_delete on public.booking_closed_dates;
create policy booking_closed_dates_superadmin_delete on public.booking_closed_dates for delete to authenticated using (exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin') and category='exceptional_closure');
-- Date list from Proclamation No. 1006 s.2025 (2026) and No. 1427 s.2026 (2027).
-- EDSA anniversary is SPECIAL WORKING and deliberately not blocked.
-- The separately proclaimed 2026 Eid dates are included. 2027 dates must be added when proclaimed.
insert into public.booking_closed_dates(date,name,category,source) values
('2026-01-01','New Year''s Day','regular_holiday','Proclamation 1006'),
('2026-03-20','Eid’l Fitr','regular_holiday','Proclamation 1189'),
('2026-05-27','Eid’l Adha','regular_holiday','Proclamation 1264'),
('2026-04-02','Maundy Thursday','regular_holiday','Proclamation 1006'),
('2026-04-03','Good Friday','regular_holiday','Proclamation 1006'),
('2026-04-09','Araw ng Kagitingan','regular_holiday','Proclamation 1006'),
('2026-05-01','Labor Day','regular_holiday','Proclamation 1006'),
('2026-06-12','Independence Day','regular_holiday','Proclamation 1006'),
('2026-08-31','National Heroes Day','regular_holiday','Proclamation 1006'),
('2026-11-30','Bonifacio Day','regular_holiday','Proclamation 1006'),
('2026-12-25','Christmas Day','regular_holiday','Proclamation 1006'),
('2026-12-30','Rizal Day','regular_holiday','Proclamation 1006'),
('2026-02-17','Chinese New Year','special_non_working','Proclamation 1006'),
('2026-04-04','Black Saturday','special_non_working','Proclamation 1006'),
('2026-08-21','Ninoy Aquino Day','special_non_working','Proclamation 1006'),
('2026-11-01','All Saints'' Day','special_non_working','Proclamation 1006'),
('2026-11-02','All Souls'' Day','special_non_working','Proclamation 1006'),
('2026-12-08','Immaculate Conception','special_non_working','Proclamation 1006'),
('2026-12-24','Christmas Eve','special_non_working','Proclamation 1006'),
('2026-12-31','Last Day of the Year','special_non_working','Proclamation 1006'),
('2027-01-01','New Year''s Day','regular_holiday','Proclamation 1427'),
('2027-03-25','Maundy Thursday','regular_holiday','Proclamation 1427'),
('2027-03-26','Good Friday','regular_holiday','Proclamation 1427'),
('2027-04-09','Araw ng Kagitingan','regular_holiday','Proclamation 1427'),
('2027-05-01','Labor Day','regular_holiday','Proclamation 1427'),
('2027-06-12','Independence Day','regular_holiday','Proclamation 1427'),
('2027-08-30','National Heroes Day','regular_holiday','Proclamation 1427'),
('2027-11-30','Bonifacio Day','regular_holiday','Proclamation 1427'),
('2027-12-25','Christmas Day','regular_holiday','Proclamation 1427'),
('2027-12-30','Rizal Day','regular_holiday','Proclamation 1427'),
('2027-02-06','Chinese New Year','special_non_working','Proclamation 1427'),
('2027-03-27','Black Saturday','special_non_working','Proclamation 1427'),
('2027-08-21','Ninoy Aquino Day','special_non_working','Proclamation 1427'),
('2027-11-01','All Saints'' Day','special_non_working','Proclamation 1427'),
('2027-11-02','All Souls'' Day','special_non_working','Proclamation 1427'),
('2027-12-08','Immaculate Conception','special_non_working','Proclamation 1427'),
('2027-12-24','Christmas Eve','special_non_working','Proclamation 1427'),
('2027-12-31','Last Day of the Year','special_non_working','Proclamation 1427')
on conflict (date) do nothing;

-- Defend every booking creation path (including the atomic booking RPC), not only UI.
create or replace function public.happytails_reject_closed_appointment_date()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_name text;
begin
  select name into v_name from public.booking_closed_dates where date = new.scheduled_date;
  if v_name is not null then
    raise exception 'HappyTails is closed on % (%). Please choose another date.', new.scheduled_date, v_name using errcode='23514';
  end if;
  return new;
end; $$;
drop trigger if exists happytails_booking_closed_date_check on public.appointments;
create trigger happytails_booking_closed_date_check
before insert or update of scheduled_date on public.appointments
for each row execute function public.happytails_reject_closed_appointment_date();
-- Existing appointments are never deleted or retroactively cancelled.
commit;
