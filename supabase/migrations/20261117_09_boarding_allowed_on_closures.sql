-- HappyTails: boarding continues on holidays and shop closures.
--
-- A caretaker is on duty for boarded pets even when the shop is closed, so a
-- boarding drop-off, stay or pickup may fall on any date in Calendar
-- Management (official holidays AND exceptional closures).
-- Grooming and À La Carte keep every closure check exactly as before.
-- The 9 AM–6 PM drop-off/pickup window for boarding is unchanged.

-- 1) Insert guard: skip closure checks for boarding.
CREATE OR REPLACE FUNCTION public.happytails_block_closed_booking_dates_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_reason text;
BEGIN
  -- Boarding is allowed on closed dates (caretaker on duty).
  IF NEW.service_type = 'boarding' THEN
    RETURN NEW;
  END IF;

  IF NEW.scheduled_date IS NOT NULL THEN
    SELECT c.name INTO v_reason
    FROM public.booking_closed_dates AS c
    WHERE c.date = NEW.scheduled_date
      AND NOT c.is_open_override
    LIMIT 1;

    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Calendar Management: % is closed for new bookings (%). Choose an open date.',
        NEW.scheduled_date, v_reason USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Insert guard (per-day lock + check): skip for boarding.
CREATE OR REPLACE FUNCTION public.happytails_guard_new_appointment_closed_days_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_closure text;
BEGIN
  IF NEW.scheduled_date IS NULL OR NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Boarding is allowed on closed dates (caretaker on duty).
  IF NEW.service_type = 'boarding' THEN
    RETURN NEW;
  END IF;

  -- Serialize this booking against Calendar Management closures for its date.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('happytails:store-closure:' || NEW.scheduled_date::text, 0));

  SELECT c.name INTO v_closure
  FROM public.booking_closed_dates c
  WHERE c.date = NEW.scheduled_date AND NOT c.is_open_override
  LIMIT 1;

  IF v_closure IS NOT NULL THEN
    RAISE EXCEPTION
      'Calendar Management: % is closed (%). Choose an open date or stay.',
      NEW.scheduled_date, v_closure USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Insert/reschedule guard: boarding no longer checked.
CREATE OR REPLACE FUNCTION public.happytails_reject_closed_appointment_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_reason text;
BEGIN
  -- Boarding is allowed on closed dates (caretaker on duty).
  IF NEW.service_type::text = 'boarding' THEN
    RETURN NEW;
  END IF;
  SELECT d.name INTO v_reason FROM public.booking_closed_dates d
    WHERE d.date = NEW.scheduled_date AND NOT d.is_open_override;
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Service unavailable on % (%). Choose another date.', NEW.scheduled_date, v_reason USING errcode='23514';
  END IF;
  RETURN NEW;
END; $function$;

-- 4) Boarding validator: keep date/time rules, drop the closure checks.
CREATE OR REPLACE FUNCTION public.happytails_validate_boarding_operating_days()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_arrival date;v_pickup date;v_arrival_time time;v_pickup_time time;
BEGIN
  IF NEW.service_type::text <> 'boarding' OR NEW.status::text = 'cancelled' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.service_type IS NOT DISTINCT FROM NEW.service_type
    AND OLD.scheduled_date IS NOT DISTINCT FROM NEW.scheduled_date
    AND OLD.drop_off_at IS NOT DISTINCT FROM NEW.drop_off_at
    AND OLD.pick_up_at IS NOT DISTINCT FROM NEW.pick_up_at
    AND OLD.status::text <> 'cancelled' THEN RETURN NEW; END IF;
  IF NEW.drop_off_at IS NULL OR NEW.pick_up_at IS NULL THEN
    RAISE EXCEPTION 'Boarding requires check-in and pickup timestamps.' USING errcode='23514';
  END IF;
  v_arrival := (NEW.drop_off_at AT TIME ZONE 'Asia/Manila')::date;
  v_pickup := (NEW.pick_up_at AT TIME ZONE 'Asia/Manila')::date;
  v_arrival_time := (NEW.drop_off_at AT TIME ZONE 'Asia/Manila')::time;
  v_pickup_time := (NEW.pick_up_at AT TIME ZONE 'Asia/Manila')::time;
  IF v_pickup <= v_arrival OR v_pickup-v_arrival NOT BETWEEN 1 AND 365
     OR NEW.scheduled_date IS DISTINCT FROM v_arrival OR NEW.pick_up_at <= NEW.drop_off_at THEN
    RAISE EXCEPTION 'Invalid boarding check-in or pickup date.' USING errcode='23514';
  END IF;
  -- A caretaker is on duty on holidays and shop closures, so closed dates are
  -- allowed; arrival and pickup still happen between 9 AM and 6 PM.
  IF v_arrival_time < time '09:00' OR v_arrival_time > time '18:00'
     OR v_pickup_time < time '09:00' OR v_pickup_time > time '18:00' THEN
    RAISE EXCEPTION 'Boarding drop-off/pickup must be 9 AM–6 PM Manila time.' USING errcode='23514';
  END IF;
  RETURN NEW;
END $function$;

-- 5) Availability planner: identical except the two closure checks are removed.
CREATE OR REPLACE FUNCTION public.happytails_boarding_group_plan(p_date date, p_time time without time zone, p_pets jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_role text;v_owner uuid;v_owner_set boolean:=false;
  r record; k record; v_key text; v_index integer;v_i integer;v_choice uuid;
  v_size text;v_start timestamptz;v_end timestamptz;v_blocked integer;
  v_keys text[]:='{}'::text[];v_sizes text[]:='{}'::text[];
  v_nights integer[]:='{}'::integer[];v_combos text[]:='{}'::text[];
  v_counts integer[]:='{}'::integer[];v_shared boolean[]:='{}'::boolean[];
  v_used uuid[]:='{}'::uuid[];v_combo text;
BEGIN
  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id=v_actor;
  IF v_actor IS NULL OR v_role IS NULL THEN
    RETURN jsonb_build_object('available',false,'reason','Sign in to check hotel availability.');
  END IF;
  IF p_date IS NULL OR p_time IS NULL OR p_time<time '09:00' OR p_time>time '18:00'
     OR p_pets IS NULL OR jsonb_typeof(p_pets)<>'array'
     OR jsonb_array_length(p_pets)<1 OR jsonb_array_length(p_pets)>30 THEN
    RETURN jsonb_build_object('available',false,'reason','Choose valid pets and a drop-off time between 9 AM and 6 PM.');
  END IF;
  v_start:=((p_date+p_time) AT TIME ZONE 'Asia/Manila');
  IF v_start<=now() THEN
    RETURN jsonb_build_object('available',false,'reason','Choose a future drop-off date and time.');
  END IF;
  -- (Closure check removed: boarding check-in is allowed on closed dates.)
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_pets) AS x(value)
    WHERE (x.value->>'pet_id') IS NULL OR (x.value->>'pet_id') !~* '^[0-9a-f-]{36}$') THEN
    RETURN jsonb_build_object('available',false,'reason','Invalid pet identifiers.');
  END IF;
  IF (SELECT count(DISTINCT x.value->>'pet_id') FROM jsonb_array_elements(p_pets) x(value))
     <> jsonb_array_length(p_pets) THEN
    RETURN jsonb_build_object('available',false,'reason','Each pet may appear only once.');
  END IF;
  FOR r IN
    SELECT x.pet_id,x.kennel_size,x.nights,nullif(btrim(x.share_group),'') AS share_group,
      p.customer_id,p.size_label,p.id AS actual_id
    FROM jsonb_to_recordset(p_pets) AS x(pet_id uuid,kennel_size text,nights integer,share_group text)
    LEFT JOIN public.pets p ON p.id=x.pet_id
  LOOP
    IF r.actual_id IS NULL OR r.kennel_size NOT IN ('small','big') OR r.kennel_size IS NULL
       OR r.nights IS NULL OR r.nights NOT BETWEEN 1 AND 365 THEN
      RETURN jsonb_build_object('available',false,'reason','Invalid pet, kennel size, or boarding duration.');
    END IF;
    IF NOT v_owner_set THEN v_owner:=r.customer_id;v_owner_set:=true;
    ELSIF v_owner IS DISTINCT FROM r.customer_id THEN
      RETURN jsonb_build_object('available',false,'reason','All pets in a shared reservation must have the same owner.');
    END IF;
    IF v_role NOT IN ('admin','superadmin') AND r.customer_id IS DISTINCT FROM v_actor THEN
      RETURN jsonb_build_object('available',false,'reason','A selected pet is not linked to your account.');
    END IF;
    v_size:=lower(trim(coalesce(r.size_label,'')));
    v_size:=CASE WHEN v_size='small' THEN 'small' WHEN v_size='medium' THEN 'medium'
      WHEN v_size ~ 'large|(^|[^a-z])([2-9]?xl|x{1,5}l)([^a-z]|$)' THEN 'large' ELSE NULL END;
    IF v_size IS NULL OR (r.kennel_size='small' AND v_size NOT IN ('small','medium')) THEN
      RETURN jsonb_build_object('available',false,'reason','Large pets require a Big kennel; Small kennels permit only one Small or Medium pet.');
    END IF;
    -- (Closure check removed: boarding pickup is allowed on closed dates.)
    v_key:=CASE WHEN r.share_group IS NULL THEN 'pet:'||r.pet_id::text ELSE 'shared:'||r.share_group END;
    v_index:=array_position(v_keys,v_key);
    IF v_index IS NULL THEN
      v_keys:=array_append(v_keys,v_key);
      v_sizes:=array_append(v_sizes,r.kennel_size);
      v_nights:=array_append(v_nights,r.nights);
      v_combos:=array_append(v_combos,v_size);
      v_counts:=array_append(v_counts,1);
      v_shared:=array_append(v_shared,r.share_group IS NOT NULL);
    ELSE
      IF NOT v_shared[v_index] OR v_sizes[v_index]<>r.kennel_size OR v_nights[v_index]<>r.nights THEN
        RETURN jsonb_build_object('available',false,'reason','Shared pets must have identical kennel size, check-in and pickup schedules.');
      END IF;
      v_counts[v_index]:=v_counts[v_index]+1;
      v_combos[v_index]:=v_combos[v_index]||','||v_size;
    END IF;
  END LOOP;

  FOR v_i IN SELECT g.i FROM generate_subscripts(v_keys,1) AS g(i) LOOP
    IF v_shared[v_i] THEN
      SELECT string_agg(tier,'+' ORDER BY tier) INTO v_combo
        FROM unnest(string_to_array(v_combos[v_i],',')) AS t(tier);
      IF v_sizes[v_i]<>'big' OR v_combo NOT IN ('small+small','medium+small','medium+medium','small+small+small') THEN
        RETURN jsonb_build_object('available',false,'reason','A shared Big kennel allows two Small, Small + Medium, Medium + Medium, or three Small pets.');
      END IF;
    ELSIF v_counts[v_i]<>1 THEN
      RETURN jsonb_build_object('available',false,'reason','Unshared pets must have separate kennel reservations.');
    END IF;
  END LOOP;

  -- Large-required bookings first; then Medium groups, then Small groups.
  -- A group takes exactly ONE physical kennel regardless of pet count.
  FOR v_i IN SELECT g.i FROM generate_subscripts(v_keys,1) AS g(i)
      ORDER BY CASE WHEN v_combos[g.i] LIKE '%large%' THEN 0
                    WHEN v_combos[g.i] LIKE '%medium%' THEN 1 ELSE 2 END,
               v_counts[g.i] DESC,g.i
  LOOP
    v_end:=((p_date+v_nights[v_i]+p_time) AT TIME ZONE 'Asia/Manila');
    v_choice:=NULL;
    FOR k IN SELECT id FROM public.kennels
        WHERE is_active AND size::text=v_sizes[v_i] ORDER BY number,id LOOP
      IF k.id=ANY(v_used) THEN CONTINUE; END IF;
      SELECT count(*) INTO v_blocked
        FROM public.appointment_pets ap JOIN public.appointments a ON a.id=ap.appointment_id
        WHERE ap.kennel_id=k.id AND a.service_type::text='boarding'
          AND a.status::text NOT IN ('cancelled','completed')
          AND ap.status::text NOT IN ('cancelled','completed')
          AND a.drop_off_at<v_end AND a.pick_up_at>v_start;
      IF v_blocked=0 THEN v_choice:=k.id;EXIT; END IF;
    END LOOP;
    IF v_choice IS NULL THEN
      RETURN jsonb_build_object('available',false,'reason',format(
        'No %s kennel is available for the entire %s-night stay. Select another date or adjust the shared group.',
        v_sizes[v_i],v_nights[v_i]));
    END IF;
    v_used:=array_append(v_used,v_choice);
  END LOOP;
  RETURN jsonb_build_object('available',true,'reason',null,'kennels_used',array_length(v_used,1));
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN jsonb_build_object('available',false,'reason','Invalid pet or stay information.');
END $function$;
