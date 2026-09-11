-- Restaurant OS delivery admin write hardening
-- Run once in the SAME Supabase project used by this V8 app.
-- These SECURITY DEFINER RPCs still verify that the logged-in user owns the restaurant.

create or replace function public.admin_create_driver(
  p_restaurant_id uuid,
  p_name text,
  p_phone text default null
)
returns table(id uuid,name text,phone text,access_token uuid)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.restaurants r where r.id=p_restaurant_id and r.owner_id=auth.uid()) then
    raise exception 'not_restaurant_owner';
  end if;
  if coalesce(trim(p_name),'')='' then raise exception 'driver_name_required'; end if;

  insert into public.drivers(restaurant_id,name,phone,active)
  values(p_restaurant_id,trim(p_name),nullif(trim(coalesce(p_phone,'')),''),true)
  returning drivers.id into v_id;

  return query
  select d.id,d.name,d.phone,d.access_token
  from public.drivers d
  where d.id=v_id;
end;
$$;
revoke all on function public.admin_create_driver(uuid,text,text) from public;
grant execute on function public.admin_create_driver(uuid,text,text) to authenticated;

create or replace function public.admin_update_driver(
  p_restaurant_id uuid,
  p_driver_id uuid,
  p_active boolean
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.restaurants r where r.id=p_restaurant_id and r.owner_id=auth.uid()) then
    raise exception 'not_restaurant_owner';
  end if;

  update public.drivers
  set active=p_active,updated_at=now()
  where id=p_driver_id and restaurant_id=p_restaurant_id;

  if not found then raise exception 'driver_not_found'; end if;
  return true;
end;
$$;
revoke all on function public.admin_update_driver(uuid,uuid,boolean) from public;
grant execute on function public.admin_update_driver(uuid,uuid,boolean) to authenticated;

create or replace function public.admin_assign_delivery(
  p_restaurant_id uuid,
  p_order_id uuid,
  p_driver_id uuid
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.restaurants r where r.id=p_restaurant_id and r.owner_id=auth.uid()) then
    raise exception 'not_restaurant_owner';
  end if;
  if not exists(select 1 from public.drivers d where d.id=p_driver_id and d.restaurant_id=p_restaurant_id and d.active=true) then
    raise exception 'invalid_driver';
  end if;

  update public.delivery_orders
  set driver_id=p_driver_id,status='assigned',assigned_at=coalesce(assigned_at,now()),updated_at=now()
  where order_id=p_order_id and restaurant_id=p_restaurant_id;

  if not found then raise exception 'delivery_order_not_found'; end if;

  update public.orders
  set status='assigned'
  where id=p_order_id and restaurant_id=p_restaurant_id;

  return true;
end;
$$;
revoke all on function public.admin_assign_delivery(uuid,uuid,uuid) from public;
grant execute on function public.admin_assign_delivery(uuid,uuid,uuid) to authenticated;

select 'admin delivery RPCs ready' as status;
