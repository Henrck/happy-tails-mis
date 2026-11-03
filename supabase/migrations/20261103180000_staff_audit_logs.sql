-- HappyTails staff audit log. Apply after core schema migrations.
-- Capture is transactional and intentionally limited to approved business fields.
create table if not exists public.staff_audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_name text not null,
  actor_role text not null,
  module text not null,
  action text not null,
  severity text not null check (severity in ('info','high','critical')),
  entity_table text not null,
  entity_id text,
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  changed_fields text[] not null default array[]::text[],
  origin text not null default 'database'
);
create index if not exists staff_audit_logs_time_idx on public.staff_audit_logs (occurred_at desc, id desc);
create index if not exists staff_audit_logs_actor_idx on public.staff_audit_logs (actor_id, occurred_at desc);
create index if not exists staff_audit_logs_module_idx on public.staff_audit_logs (module, occurred_at desc);

alter table public.staff_audit_logs enable row level security;
revoke all on public.staff_audit_logs from public, anon, authenticated;
grant select on public.staff_audit_logs to authenticated;

drop policy if exists staff_audit_superadmin_select on public.staff_audit_logs;
create policy staff_audit_superadmin_select on public.staff_audit_logs for select to authenticated
using (
  occurred_at >= now() - interval '365 days'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'superadmin')
);


-- Retention fallback when pg_cron is unavailable: at most one pruning pass
-- each day of audit activity, with minimal overhead on normal row writes.
create table if not exists public.staff_audit_maintenance (
  singleton boolean primary key default true check(singleton),
  last_pruned_at timestamptz not null default '-infinity'::timestamptz
);
revoke all on public.staff_audit_maintenance from public, anon, authenticated;
insert into public.staff_audit_maintenance(singleton) values (true) on conflict do nothing;

-- No client-side INSERT/UPDATE/DELETE grants or policies. The function owner is
-- responsible for writing entries and is never exposed as an RPC.
create or replace function public.happytails_capture_staff_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_name text;
  v_old jsonb := '{}'::jsonb;
  v_new jsonb := '{}'::jsonb;
  v_old_row jsonb;
  v_new_row jsonb;
  v_keys text[] := string_to_array(TG_ARGV[1], ',');
  v_key text;
  v_diff text[] := array[]::text[];
  v_ref text;
  v_verb text;
  v_severity text := 'info';
  v_exists boolean;
begin
  if v_actor is not null then
    select p.role into v_role from public.profiles p where p.id = v_actor;
    -- Report staff actions; never log ordinary customer actions here.
    if coalesce(v_role, '') not in ('admin','superadmin') then
      return case when TG_OP = 'DELETE' then OLD else NEW end;
    end if;
    select concat_ws(' ',s.first_name,s.last_name) into v_name
      from public.staff_profiles s where s.id = v_actor;
    v_name := coalesce(nullif(trim(v_name), ''), v_role || ' account');
  else
    -- Service-role/cron mutations cannot be attributed reliably to a staff ID.
    v_role := 'system';
    v_name := 'Server / system operation';
  end if;
  if TG_OP <> 'INSERT' then v_old_row := to_jsonb(OLD); end if;
  if TG_OP <> 'DELETE' then v_new_row := to_jsonb(NEW); end if;
  foreach v_key in array v_keys loop
    v_key := btrim(v_key);
    if v_key = '' then continue; end if;
    if v_old_row is not null and v_old_row ? v_key then
      v_old := v_old || jsonb_build_object(v_key, v_old_row -> v_key);
    end if;
    if v_new_row is not null and v_new_row ? v_key then
      v_new := v_new || jsonb_build_object(v_key, v_new_row -> v_key);
    end if;
  end loop;
  if TG_OP = 'UPDATE' then
    if v_old = v_new then return NEW; end if;
    select coalesce(array_agg(k order by k), array[]::text[])
    into v_diff from (
      select distinct key as k from jsonb_object_keys(v_old || v_new) as key
      where (v_old -> key) is distinct from (v_new -> key)
    ) changed;
  else
    v_diff := array(select jsonb_object_keys(case when TG_OP = 'DELETE' then v_old else v_new end));
  end if;
  v_ref := coalesce(v_new_row ->> 'id',v_old_row ->> 'id',
    v_new_row ->> 'key',v_old_row ->> 'key',
    v_new_row ->> 'invoice_number',v_old_row ->> 'invoice_number');
  v_verb := case TG_OP when 'INSERT' then 'Created' when 'DELETE' then 'Deleted' else 'Updated' end;
  if TG_OP = 'UPDATE' then
    if 'status' = any(v_diff) then
      v_verb := 'Status changed';
    elsif 'groomer_id' = any(v_diff) or 'kennel_id' = any(v_diff) then
      v_verb := 'Assignment changed';
    elsif 'price' = any(v_diff) or 'total_amount' = any(v_diff) then
      v_verb := 'Price changed';
    elsif 'quantity' = any(v_diff) then
      v_verb := 'Stock changed';
    elsif 'scheduled_date' = any(v_diff) or 'scheduled_time' = any(v_diff)
       or 'drop_off_at' = any(v_diff) or 'pick_up_at' = any(v_diff) then
      v_verb := 'Schedule changed';
    end if;
  end if;
  if TG_ARGV[0] in ('POS & Sales','Appointments','Check-in & Checkout','User Management')
     or TG_OP = 'DELETE' then v_severity := 'critical';
  elsif TG_ARGV[0] in ('Inventory','Boarding','Service Management','Account Security','Pet Records')
     then v_severity := 'high'; end if;
  insert into public.staff_audit_logs (
    actor_id,actor_name,actor_role,module,action,severity,entity_table,entity_id,
    before_data,after_data,changed_fields,origin
  ) values (v_actor,v_name,v_role,TG_ARGV[0],v_verb,v_severity,TG_TABLE_NAME,v_ref,
    v_old,v_new,v_diff,case when v_actor is null then 'server' else 'database' end);
  -- Once per active day, remove records past the approved retention period.
  -- Locking this singleton is transactional; parallel transactions will skip
  -- if another write has already run cleanup for the day.
  update public.staff_audit_maintenance
    set last_pruned_at = now()
    where singleton = true and last_pruned_at < now() - interval '1 day';
  if found then
    delete from public.staff_audit_logs where occurred_at < now() - interval '365 days';
  end if;
  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;
revoke all on function public.happytails_capture_staff_audit() from public, anon, authenticated;

-- Existing tables are checked during installation. Every tracked column is
-- explicitly allowed; NO email, password, token, address, phone or notes.
do $$
declare rec record;
begin
  for rec in select * from (values
    ('appointments','Appointments','status,service_type,is_walk_in,scheduled_date,scheduled_time,drop_off_at,pick_up_at,total_amount'),
    ('appointment_pets','Check-in & Checkout','status,appointment_id,pet_id,groomer_id,kennel_id,package_id,package_pricing_id,line_amount,checked_in_at,checked_out_at,completed_at'),
    ('appointment_addons','Appointments','appointment_pet_id,addon_id,price'),
    ('sales','POS & Sales','invoice_number,total_amount,amount_paid,payment_method,sold_at,status'),
    ('sale_items','POS & Sales','sale_id,product_id,quantity,unit_price,line_amount'),
    ('products','Inventory','product_code,name,category,unit,price,min_stock,status'),
    ('product_batches','Inventory','product_id,quantity,expiration_date,is_adjustment,received_date'),
    ('inventory_adjustments','Inventory','product_id,batch_id,quantity,reason'),
    ('pets','Pet Records','name,species,breed,size_label,weight_kg,status,is_archived,archived_at'),
    ('kennels','Boarding','size,number,name,is_active'),
    ('groomers','Boarding','name,status'),
    ('boarding_stays','Boarding','pet_id,kennel_id,drop_off_at,pick_up_at,status'),
    ('packages','Service Management','name,service_type,sort_order,is_active'),
    ('package_pricing','Service Management','package_id,size_id,size_label,size_detail,price,is_per_night,nights'),
    ('package_inclusions','Service Management','package_id,label,sort_order'),
    ('addons','Service Management','name,category_id,price_note,sort_order,is_active'),
    ('addon_prices','Service Management','addon_id,size_label,price'),
    ('pet_sizes','Service Management','service_type,label,weight_range,sort_order,is_active'),
    ('profiles','User Management','role'),
    ('staff_profiles','User Management','employee_id,username,job_title,status,archived_at'),
    ('website_branches','Website Management','name,location,facebook_url,description,sort_order,published,image_url'),
    ('site_settings','Website Management','key,title,subtitle,heading,description,image_url,is_active'),
    ('site_content','Website Management','key,title,description,image_url,is_active'),
    ('website_content','Website Management','key,title,description,image_url,is_active')
  ) as m(tbl,category,fields) loop
    if to_regclass(format('public.%I',rec.tbl)) is not null then
      execute format('drop trigger if exists happytails_staff_audit on public.%I',rec.tbl);
      execute format('create trigger happytails_staff_audit after insert or update or delete on public.%I for each row execute function public.happytails_capture_staff_audit(%L,%L)',rec.tbl,rec.category,rec.fields);
    end if;
  end loop;
end;
$$;

-- Daily cleanup policy. A Supabase pg_cron-enabled project automatically
-- removes old records. For deployments without pg_cron, call cleanup from a
-- scheduled trusted task; RLS already hides entries older than 365 days.
create or replace function public.happytails_purge_old_staff_audit()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_deleted integer;
begin
  if session_user not in ('postgres','supabase_admin') and auth.role() <> 'service_role' then
    raise exception 'Scheduled maintenance privileges required';
  end if;
  delete from public.staff_audit_logs where occurred_at < now() - interval '365 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke all on function public.happytails_purge_old_staff_audit() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      if exists (select 1 from cron.job where jobname = 'happytails-staff-audit-retention') then
        perform cron.unschedule('happytails-staff-audit-retention');
      end if;
      perform cron.schedule('happytails-staff-audit-retention','22 2 * * *',
        'select public.happytails_purge_old_staff_audit()');
    exception when insufficient_privilege or undefined_table or invalid_schema_name then
      raise notice 'pg_cron scheduling not permitted; set up trusted scheduled retention task.';
    end;
  else
    raise notice 'pg_cron not installed. Set up a trusted scheduled retention task to purge after 365 days.';
  end if;
end;
$$;

-- Authenticated staff can record their own session activity only. This is
-- NOT a claim of verified identity-provider login success/failure events.
create or replace function public.happytails_staff_session_activity(p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_role text; v_name text;
begin
  if v_actor is null or p_action not in ('Session opened', 'Signed out') then
    raise exception 'Not permitted';
  end if;
  select p.role into v_role from public.profiles p where p.id = v_actor;
  if v_role not in ('admin','superadmin') then raise exception 'Not permitted'; end if;
  select concat_ws(' ',s.first_name,s.last_name) into v_name
    from public.staff_profiles s where s.id = v_actor and s.status = 'active';
  if v_name is null then raise exception 'Staff profile not active'; end if;
  -- Prevent repeated component mounts from flooding the audit table.
  if p_action = 'Session opened' and exists (
    select 1 from public.staff_audit_logs
    where actor_id = v_actor and module = 'Account Security'
      and action = 'Session opened' and occurred_at > now() - interval '30 minutes'
  ) then return; end if;
  insert into public.staff_audit_logs(actor_id,actor_name,actor_role,module,action,severity,entity_table,entity_id,origin)
    values(v_actor,coalesce(nullif(trim(v_name),''),v_role||' account'),v_role,
       'Account Security',p_action,'high','staff_profiles',v_actor::text,'session');
end;
$$;
revoke all on function public.happytails_staff_session_activity(text) from public, anon;
grant execute on function public.happytails_staff_session_activity(text) to authenticated;
