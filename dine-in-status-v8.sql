-- Restaurant OS V8 — Dine-in order status/tracking
-- Run in the SAME Supabase project used by delivery-gps-v1.

alter table public.orders
  add column if not exists prep_minutes integer,
  add column if not exists admin_message text;

create index if not exists orders_tracking_token_idx
  on public.orders(tracking_token);

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
grant execute on function public.public_track_order(uuid) to anon, authenticated;

do $$
begin
  if not exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

select 'dine-in V8 status/tracking ready' as status;
