-- Restaurant OS V7 delivery/customer tracking enhancements
-- Run ONCE in the SAME Supabase project used by delivery-gps-v1.
-- Safe to run again.

alter table public.orders
  add column if not exists prep_minutes integer,
  add column if not exists admin_message text;

create index if not exists orders_restaurant_created_idx
  on public.orders(restaurant_id, created_at desc);

drop function if exists public.public_track_order(uuid);
create function public.public_track_order(p_token uuid)
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
  join public.restaurants r on r.id=o.restaurant_id
  left join public.delivery_orders dox on dox.order_id=o.id
  left join public.drivers d on d.id=dox.driver_id
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

drop function if exists public.driver_get_orders(uuid);
create function public.driver_get_orders(p_token uuid)
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
  latitude double precision,
  longitude double precision,
  recorded_at timestamptz
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
  join public.delivery_orders dox on dox.driver_id=d.id
  join public.orders o on o.id=dox.order_id
  left join lateral (
    select l.latitude,l.longitude,l.recorded_at
    from public.driver_locations l
    where l.order_id=o.id
    order by l.recorded_at desc
    limit 1
  ) dl on true
  where d.access_token=p_token
    and d.active=true
  order by o.created_at desc;
$$;
revoke all on function public.driver_get_orders(uuid) from public;
grant execute on function public.driver_get_orders(uuid) to anon,authenticated;

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='delivery_orders') then
    alter publication supabase_realtime add table public.delivery_orders;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='driver_locations') then
    alter publication supabase_realtime add table public.driver_locations;
  end if;
end $$;

select 'delivery V7 schema ready' as status;
