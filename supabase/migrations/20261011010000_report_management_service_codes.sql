-- HappyTails Report Management: durable service-category codes per appointment pet.
-- READ FIRST: apply in a staging/test Supabase project; back up production before use.
-- G01, G02, ...: dog/cat grooming | B01,...: boarding | A01,...: ala_carte
-- Each appointment_pets row has one immutable code; cancellation does not reuse it.
-- Does not modify appointments.id, appointment_pets.id, or existing foreign keys.

begin;

do $$
begin
  if to_regclass('public.appointments') is null or to_regclass('public.appointment_pets') is null then
    raise exception 'Report codes require public.appointments and public.appointment_pets';
  end if;
end $$;

alter table public.appointment_pets
  add column if not exists report_code text;

create sequence if not exists public.happytails_report_g_sequence as bigint start 1;
create sequence if not exists public.happytails_report_b_sequence as bigint start 1;
create sequence if not exists public.happytails_report_a_sequence as bigint start 1;

create or replace function public.happytails_assign_service_report_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  service_kind text;
  code_prefix text;
  sequence_to_use regclass;
begin
  -- Existing codes must never be replaced, even by an authenticated staff member.
  if tg_op = 'UPDATE' then
    if old.report_code is not null then
      if new.report_code is distinct from old.report_code then
        raise exception 'A service report ID cannot be changed after issuance';
      end if;
      return new;
    end if;
  end if;

  select a.service_type::text
    into service_kind
    from public.appointments as a
    where a.id = new.appointment_id;

  case service_kind
    when 'dog_grooming', 'cat_grooming' then
      code_prefix := 'G';
      sequence_to_use := 'public.happytails_report_g_sequence'::regclass;
    when 'boarding' then
      code_prefix := 'B';
      sequence_to_use := 'public.happytails_report_b_sequence'::regclass;
    when 'ala_carte' then
      code_prefix := 'A';
      sequence_to_use := 'public.happytails_report_a_sequence'::regclass;
    else
      raise exception 'Unknown appointment service type for report ID: %', coalesce(service_kind, 'null');
  end case;

  -- Deliberately override supplied values when inserting: IDs are DB-issued.
  new.report_code := code_prefix || lpad(nextval(sequence_to_use)::text, 2, '0');
  return new;
end;
$$;

-- Install trigger BEFORE backfilling, so concurrent new appointments also get IDs.
drop trigger if exists happytails_service_report_code on public.appointment_pets;
create trigger happytails_service_report_code
  before insert or update of report_code on public.appointment_pets
  for each row execute function public.happytails_assign_service_report_code();

-- Assign existing rows in appointment creation order. Do not renumber on sort,
-- status changes, cancellations or report exports. Sequence gaps are normal.
do $$
declare
  entry record;
begin
  for entry in
    select ap.id
      from public.appointment_pets ap
      join public.appointments a on a.id = ap.appointment_id
     where ap.report_code is null
     order by a.created_at asc, ap.id asc
  loop
    update public.appointment_pets
       set report_code = null -- fires the trigger and allocates a new code
     where id = entry.id;
  end loop;
end $$;

-- Validate before enforcing NOT NULL, and create a uniqueness guard.
do $$
begin
  if exists (select 1 from public.appointment_pets where report_code is null) then
    raise exception 'Report ID backfill incomplete: some appointment pets have no code';
  end if;
end $$;

create unique index if not exists appointment_pets_report_code_unique_idx
  on public.appointment_pets (report_code);

alter table public.appointment_pets alter column report_code set not null;

-- Default sequence privileges are not granted to application/browser roles.
-- Access to ID assignment is only through the definer-owned trigger.
commit;
