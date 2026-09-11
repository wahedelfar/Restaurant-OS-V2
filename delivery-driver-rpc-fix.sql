-- Driver RPC repair for Restaurant OS V8
-- IMPORTANT: run this in the OLD V8 Supabase project: znnnkoujfuweydvbkejh
-- This fixes the customer_lat/customer_lng mapping and keeps the existing driver app intact.

create or replace function public.driver_get_orders(p_token uuid)
returns table(
  id uuid,
  customer_name text,
  customer_phone text,
  address text,
  total numeric,
  status text,
  customer_lat double precision,
  customer_lng double precision,
  delivery_status text,
  items jsonb,
  driver_latitude double precision,
  driver_longitude double precision,
  driver_recorded_at timestamptz
)
language sql
security definer
set search_path=public
as $$
  select
    o.id,
    o.customer_name,
    o.customer_phone,
    o.address,
    o.total,
    o.status,
    o.customer_lat,
    o.customer_lng,
    dox.status,
    o.items,
    dl.latitude,
    dl.longitude,
    dl.recorded_at
  from public.drivers d
  join public.delivery_orders dox
    on dox.driver_id=d.id
  join public.orders o
    on o.id=dox.order_id
  left join lateral (
    select l.latitude,l.longitude,l.recorded_at
    from public.driver_locations l
    where l.order_id=o.id
      and l.driver_id=d.id
    order by l.recorded_at desc
    limit 1
  ) dl on true
  where d.access_token=p_token
    and d.active=true
  order by o.created_at desc;
$$;

revoke all on function public.driver_get_orders(uuid) from public;
grant execute on function public.driver_get_orders(uuid) to anon,authenticated;

-- Also normalize the public tracking RPC so it cannot reference a delivery_orders
-- column for customer coordinates. Coordinates belong to orders; live driver
-- coordinates belong to driver_locations.
create or replace function public.public_track_order(p_token uuid)
returns table(
  order_id uuid,
  restaurant_name text,
  customer_name text,
  total numeric,
  status text,
  driver_name text,
  driver_phone text,
  latitude double precision,
  longitude double precision,
  recorded_at timestamptz,
  order_type text,
  table_number integer,
  prep_minutes integer,
  admin_message text,
  created_at timestamptz
)
language sql
security definer
set search_path=public
as $$
  select
    o.id,
    r.name,
    o.customer_name,
    o.total,
    o.status,
    d.name,
    d.phone,
    dl.latitude,
    dl.longitude,
    dl.recorded_at,
    o.order_type,
    o.table_number,
    o.prep_minutes,
    o.admin_message,
    o.created_at
  from public.orders o
  join public.restaurants r
    on r.id=o.restaurant_id
  left join public.delivery_orders dox
    on dox.order_id=o.id
  left join public.drivers d
    on d.id=dox.driver_id
  left join lateral (
    select l.latitude,l.longitude,l.recorded_at
    from public.driver_locations l
    where l.order_id=o.id
    order by l.recorded_at desc
    limit 1
  ) dl on true
  where o.tracking_token=p_token
  limit 1;
$$;

revoke all on function public.public_track_order(uuid) from public;
grant execute on function public.public_track_order(uuid) to anon,authenticated;

select 'driver RPC repaired' as result;
