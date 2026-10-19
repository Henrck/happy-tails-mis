-- Required for staff cancellation reasons. Apply through the Supabase SQL editor
-- after taking a database backup. Existing appointments/UUIDs are not modified.
BEGIN;

CREATE TABLE IF NOT EXISTS public.appointment_staff_cancellations (
  appointment_id uuid PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 500),
  cancelled_by uuid NOT NULL REFERENCES auth.users(id),
  cancelled_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_staff_cancellations ENABLE ROW LEVEL SECURITY;

-- Only admin/superadmin can inspect staff cancellation reasons.
DROP POLICY IF EXISTS "staff_read_staff_cancellations" ON public.appointment_staff_cancellations;
CREATE POLICY "staff_read_staff_cancellations" ON public.appointment_staff_cancellations
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p
          WHERE p.id = (SELECT auth.uid()) AND p.role::text IN ('admin', 'superadmin'))
);

CREATE OR REPLACE FUNCTION public.happytails_cancel_staff_appointment(
  p_appointment_id uuid, p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_role text;
  v_status text;
  v_reason text := btrim(p_reason);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in' USING ERRCODE = '42501';
  END IF;
  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Only an administrator can cancel an appointment' USING ERRCODE = '42501';
  END IF;
  IF v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'Cancellation reason must contain 5 to 500 characters';
  END IF;

  SELECT a.status::text INTO v_status FROM public.appointments a
    WHERE a.id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  IF v_status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Only pending or confirmed appointments may be cancelled';
  END IF;

  UPDATE public.appointments SET status = 'cancelled' WHERE id = p_appointment_id;
  UPDATE public.appointment_pets SET status = 'cancelled' WHERE appointment_id = p_appointment_id;
  INSERT INTO public.appointment_staff_cancellations(appointment_id, reason, cancelled_by)
    VALUES(p_appointment_id, v_reason, auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.happytails_cancel_staff_appointment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.happytails_cancel_staff_appointment(uuid, text) TO authenticated;
COMMIT;
