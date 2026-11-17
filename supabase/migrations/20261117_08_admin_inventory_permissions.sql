-- HappyTails: Admin (staff) vs Super Admin permissions for Inventory and
-- groomer settings.
--
-- Admin CAN:    add products, edit product details, receive batches,
--               correct batch expiration dates, sell at POS.
-- Admin CANNOT: remove stock from a batch, discontinue/reactivate products,
--               delete products or batches, change groomer availability or
--               service durations.
-- Super Admin keeps full access. POS checkout (happytails_checkout_pos) is a
-- separate SECURITY DEFINER function and is not affected.

-- ---------------------------------------------------------------------------
-- 1) Receive Batch: let active Admins insert batches (Super Admin keeps ALL).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can receive batches" ON public.product_batches;
CREATE POLICY "Admins can receive batches" ON public.product_batches
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    AND EXISTS (SELECT 1 FROM public.staff_profiles s WHERE s.id = auth.uid() AND s.status = 'active')
  );

-- ---------------------------------------------------------------------------
-- 2) Remove Stock: Super Admin only (same function, stricter role check).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_remove_inventory_batch_stock(p_batch_id uuid, p_quantity integer, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_staff_status text;
  v_batch public.product_batches%rowtype;
begin
  if v_user is null then raise exception 'Sign in to adjust inventory' using errcode = '42501'; end if;
  select p.role::text into v_role from public.profiles p where p.id = v_user;
  if v_role is distinct from 'superadmin' then
    raise exception 'Only a Super Admin can remove stock from a batch' using errcode = '42501';
  end if;
  select s.status::text into v_staff_status from public.staff_profiles s where s.id = v_user;
  if v_staff_status is not null and v_staff_status <> 'active' then
    raise exception 'Staff account must be active' using errcode = '42501';
  end if;
  if p_batch_id is null or p_quantity is null or p_quantity < 1 or p_quantity > 1000000 then
    raise exception 'Enter a valid number of units to remove';
  end if;
  if p_reason is null or length(btrim(p_reason)) not between 3 and 160 then
    raise exception 'A reason between 3 and 160 characters is required';
  end if;
  select b.* into v_batch from public.product_batches b where b.id = p_batch_id for update;
  if not found then raise exception 'Batch not found'; end if;
  if coalesce(v_batch.is_adjustment,false) then raise exception 'Historical adjustment rows cannot be modified'; end if;
  if v_batch.quantity < p_quantity then
    raise exception 'Cannot remove % units; batch % contains only %', p_quantity, v_batch.batch_number, v_batch.quantity;
  end if;
  update public.product_batches b set quantity = b.quantity - p_quantity where b.id = p_batch_id;
  insert into public.inventory_batch_movements
    (batch_id, product_id, actor_id, quantity_removed, reason, quantity_before, quantity_after)
  values (p_batch_id, v_batch.product_id, v_user, p_quantity, btrim(p_reason), v_batch.quantity, v_batch.quantity - p_quantity);
end $function$;

-- ---------------------------------------------------------------------------
-- 3) Products: Admins may insert and edit, but not change status
--    (discontinue/reactivate) or delete.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_guard_admin_product_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role = 'admin' then
    if TG_OP = 'DELETE' then
      raise exception 'Only a Super Admin can delete products.' using errcode = '42501';
    end if;
    if NEW.status is distinct from OLD.status then
      raise exception 'Only a Super Admin can discontinue or reactivate products.' using errcode = '42501';
    end if;
  end if;
  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$function$;

DROP TRIGGER IF EXISTS happytails_guard_admin_product_changes ON public.products;
CREATE TRIGGER happytails_guard_admin_product_changes
  BEFORE UPDATE OF status OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.happytails_guard_admin_product_changes();

-- ---------------------------------------------------------------------------
-- 4) Groomer availability & service durations: Super Admin only.
--    (Reading stays open; adding/archiving groomers is unchanged.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS grooming_duration_manage ON public.grooming_package_durations;
CREATE POLICY grooming_duration_manage ON public.grooming_package_durations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles x WHERE x.id = auth.uid() AND x.role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles x WHERE x.id = auth.uid() AND x.role = 'superadmin'));

DROP POLICY IF EXISTS "Staff manage À La Carte durations" ON public.ala_carte_service_durations;
DROP POLICY IF EXISTS "Super Admin manages À La Carte durations" ON public.ala_carte_service_durations;
CREATE POLICY "Super Admin manages À La Carte durations" ON public.ala_carte_service_durations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin'));

DROP POLICY IF EXISTS groomer_time_off_manage ON public.groomer_time_off;
CREATE POLICY groomer_time_off_manage ON public.groomer_time_off
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles x WHERE x.id = auth.uid() AND x.role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles x WHERE x.id = auth.uid() AND x.role = 'superadmin'));
