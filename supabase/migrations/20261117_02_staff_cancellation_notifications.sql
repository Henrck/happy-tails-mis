-- HappyTails: notifications for Admin and Super Admin when a customer cancels.
--
-- * staff_notifications       one row per event, shared by all staff
-- * staff_notification_reads  per-staff read state (each admin has their own)
-- * A trigger on customer_appointment_cancellations (written by every customer
--   cancellation path) creates the notification, so nothing in the app inserts it.
-- * RPCs list notifications with read state, count unread and mark as read.

CREATE TABLE IF NOT EXISTS public.staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  customer_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_notifications_created_at_idx ON public.staff_notifications (created_at DESC);

CREATE TABLE IF NOT EXISTS public.staff_notification_reads (
  notification_id uuid NOT NULL REFERENCES public.staff_notifications(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, staff_id)
);

ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_notification_reads ENABLE ROW LEVEL SECURITY;

-- Staff can read notifications (needed for Realtime too). No client writes.
DROP POLICY IF EXISTS "Staff can read staff notifications" ON public.staff_notifications;
CREATE POLICY "Staff can read staff notifications" ON public.staff_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "Staff manage their own notification reads" ON public.staff_notification_reads;
CREATE POLICY "Staff manage their own notification reads" ON public.staff_notification_reads
  FOR ALL TO authenticated
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')));

-- ---------------------------------------------------------------------------
-- Trigger: customer cancellation -> staff notification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_notify_staff_customer_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_appt public.appointments%rowtype;
  v_scheduled_at timestamptz;
  v_days_before integer;
  v_is_late boolean;
  v_pets text;
  v_service text;
  v_when text;
begin
  select * into v_appt from public.appointments where id = new.appointment_id;
  if not found then return new; end if;

  if v_appt.service_type::text = 'boarding' and v_appt.drop_off_at is not null then
    v_scheduled_at := v_appt.drop_off_at;
  else
    v_scheduled_at := ((v_appt.scheduled_date::text || ' ' || coalesce(v_appt.scheduled_time::text, '00:00'))::timestamp at time zone 'Asia/Manila');
  end if;
  -- Same calendar-day rule as the cancellation limiter (3+ days = free).
  v_days_before := (v_scheduled_at at time zone 'Asia/Manila')::date - (now() at time zone 'Asia/Manila')::date;
  v_is_late := v_days_before < 3;

  select string_agg(p.name, ', ' order by p.name) into v_pets
  from public.appointment_pets ap join public.pets p on p.id = ap.pet_id
  where ap.appointment_id = v_appt.id;

  v_service := case v_appt.service_type::text
    when 'dog_grooming' then 'Dog Grooming' when 'cat_grooming' then 'Cat Grooming'
    when 'boarding' then 'Boarding' when 'ala_carte' then 'À La Carte'
    else initcap(replace(v_appt.service_type::text, '_', ' ')) end;
  v_when := to_char(v_scheduled_at at time zone 'Asia/Manila', 'Mon FMDD, YYYY "at" FMHH12:MI AM');

  insert into public.staff_notifications(kind, appointment_id, customer_id, title, message, details)
  values (
    'customer_cancellation',
    v_appt.id,
    coalesce(new.customer_id, v_appt.customer_id),
    case when v_is_late then 'Late cancellation by customer' else 'Customer cancelled an appointment' end,
    format('%s cancelled %s for %s scheduled %s.', v_appt.owner_name, v_service, coalesce(v_pets, 'their pet'), v_when)
      || case when v_is_late
           then format(' Cancelled %s day%s before the appointment; 1 penalty point applied.', greatest(v_days_before, 0), case when v_days_before = 1 then '' else 's' end)
           else '' end
      || ' Reason: ' || left(coalesce(new.reason, 'Not provided'), 300),
    jsonb_build_object(
      'is_late', v_is_late,
      'days_before', v_days_before,
      'reason', new.reason,
      'service_type', v_appt.service_type,
      'scheduled_at', v_scheduled_at,
      'owner_name', v_appt.owner_name,
      'pet_names', v_pets
    )
  );
  return new;
exception when others then
  -- Never block a customer's cancellation because a notification failed.
  raise warning 'Staff cancellation notification failed for appointment %: %', new.appointment_id, sqlerrm;
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS happytails_notify_staff_customer_cancellation ON public.customer_appointment_cancellations;
CREATE TRIGGER happytails_notify_staff_customer_cancellation
  AFTER INSERT ON public.customer_appointment_cancellations
  FOR EACH ROW EXECUTE FUNCTION public.happytails_notify_staff_customer_cancellation();

-- ---------------------------------------------------------------------------
-- RPCs used by the admin app
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_require_staff()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')) then
    raise exception 'Staff access required.' using errcode = '42501';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.happytails_staff_notifications(p_limit integer DEFAULT 50, p_unread_only boolean DEFAULT false)
RETURNS TABLE (
  id uuid, kind text, appointment_id uuid, customer_id uuid, title text, message text,
  details jsonb, created_at timestamptz, is_read boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform public.happytails_require_staff();
  return query
    select n.id, n.kind, n.appointment_id, n.customer_id, n.title, n.message, n.details, n.created_at,
           (r.notification_id is not null) as is_read
    from public.staff_notifications n
    left join public.staff_notification_reads r on r.notification_id = n.id and r.staff_id = auth.uid()
    where not p_unread_only or r.notification_id is null
    order by n.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$function$;

CREATE OR REPLACE FUNCTION public.happytails_staff_unread_notification_count()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform public.happytails_require_staff();
  return (
    select count(*)::integer from public.staff_notifications n
    where not exists (select 1 from public.staff_notification_reads r where r.notification_id = n.id and r.staff_id = auth.uid())
  );
end;
$function$;

-- p_ids NULL marks every unread notification as read for the current staff member.
CREATE OR REPLACE FUNCTION public.happytails_mark_staff_notifications_read(p_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_count integer;
begin
  perform public.happytails_require_staff();
  insert into public.staff_notification_reads(notification_id, staff_id)
  select n.id, auth.uid() from public.staff_notifications n
  where p_ids is null or n.id = any(p_ids)
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

REVOKE ALL ON FUNCTION public.happytails_staff_notifications(integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.happytails_staff_unread_notification_count() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.happytails_mark_staff_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.happytails_staff_notifications(integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.happytails_staff_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.happytails_mark_staff_notifications_read(uuid[]) TO authenticated;

-- Live updates for the admin badge.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'staff_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_notifications;
  END IF;
END $$;
