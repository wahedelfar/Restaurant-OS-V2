create or replace function public.driver_get_orders_v2(p_token uuid)
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
    on dox.driver_id = d.id
  join public.orders o
    on o.id = dox.order_id
  left join lateral (
    select l.latitude,l.longitude,l.recorded_at
    from public.driver_locations l
    where l.order_id=o.id and l.driver_id=d.id
    order by l.recorded_at desc
    limit 1
  ) dl on true
  where d.access_token=p_token
    and d.active=true
  order by o.created_at desc;
$$;

revoke all on function public.driver_get_orders_v2(uuid) from public;
grant execute on function public.driver_get_orders_v2(uuid) to anon, authenticated;

select 'driver_get_orders_v2 installed' as result;
