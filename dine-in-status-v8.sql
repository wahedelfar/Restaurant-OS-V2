-- Restaurant OS V8 — Dine-in ordering, tracking, status controls and RLS repair
-- Run this on the OLD V8 Supabase project used by ros-v10 / Restaurant OS.

alter table public.orders
  add column if not exists prep_minutes integer,
  add column if not exists admin_message text;

create index if not exists orders_tracking_token_idx
  on public.orders(tracking_token);

-- Restore customer order creation for normal/external order inserts.
drop policy if exists "public insert orders" on public.orders;
drop policy if exists "public create valid orders" on public.orders;
create policy "public create valid orders"
on public.orders
for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = orders.restaurant_id
  )
);

-- Keep the restaurant owner able to manage its orders.
drop policy if exists "owner update orders" on public.orders;
create policy "owner update orders"
on public.orders
for update
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = orders.restaurant_id
      and r.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = orders.restaurant_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "owner delete orders" on public.orders;
create policy "owner delete orders"
on public.orders
for delete
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = orders.restaurant_id
      and r.owner_id = auth.uid()
  )
);

-- Secure dine-in order creation.
-- This is intentionally SECURITY DEFINER so a customer can create a valid
-- dine-in order without weakening the orders RLS policy.
drop function if exists public.create_dine_in_order(uuid, integer, text, jsonb);

create function public.create_dine_in_order(
  p_restaurant_id uuid,
  p_table_number integer,
  p_customer_name text,
  p_items jsonb
)
returns table(
  order_id uuid,
  tracking_token uuid,
  total numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_table_id uuid;
  v_item_count integer;
  v_valid_count integer;
  v_total numeric;
  v_items jsonb;
  v_token uuid := gen_random_uuid();
begin
  if p_restaurant_id is null then
    raise exception 'restaurant_id is required';
  end if;

  if p_table_number is null then
    raise exception 'table_number is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'cart is empty';
  end if;

  select t.id
  into v_table_id
  from public.tables t
  where t.restaurant_id = p_restaurant_id
    and t.table_number = p_table_number
    and t.active = true
  limit 1;

  if v_table_id is null then
    raise exception 'active table not found';
  end if;

  select count(*)::integer
  into v_item_count
  from jsonb_array_elements(p_items);

  select count(*)::integer
  into v_valid_count
  from jsonb_array_elements(p_items) i
  join public.products p
    on p.id = (i->>'product_id')::uuid
   and p.restaurant_id = p_restaurant_id
   and p.available = true
  where greatest(coalesce((i->>'quantity')::integer, 1), 1) > 0;

  if v_valid_count <> v_item_count then
    raise exception 'one or more cart items are invalid or unavailable';
  end if;

  select
    coalesce(sum(p.price * greatest(coalesce((i->>'quantity')::integer, 1), 1)), 0),
    jsonb_agg(jsonb_build_object(
      'product_id', p.id,
      'name', p.name,
      'quantity', greatest(coalesce((i->>'quantity')::integer, 1), 1),
      'price', p.price
    ))
  into v_total, v_items
  from jsonb_array_elements(p_items) i
  join public.products p
    on p.id = (i->>'product_id')::uuid
   and p.restaurant_id = p_restaurant_id
   and p.available = true;

  insert into public.orders (
    restaurant_id, table_id, table_number, order_type,
    customer_name, customer_phone, address, payment_method,
    total, items, status, tracking_token, prep_minutes, admin_message
  ) values (
    p_restaurant_id, v_table_id, p_table_number, 'dine_in',
    coalesce(nullif(trim(p_customer_name), ''), 'عميل'),
    null, null, 'cash', v_total, v_items, 'new', v_token, null,
    'تم استلام طلب حضرتك'
  )
  returning id into order_id;

  tracking_token := v_token;
  total := v_total;
  return next;
end;
$$;

revoke all on function public.create_dine_in_order(uuid, integer, text, jsonb) from public;
grant execute on function public.create_dine_in_order(uuid, integer, text, jsonb) to anon, authenticated;

-- Public order tracking. Dine-in orders never expose delivery/driver details.
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
set search_path = public, pg_temp
as $$
  select
    o.id,
    r.name,
    o.customer_name,
    o.total,
    o.status,
    case when o.order_type = 'dine_in' then null else d.name end,
    case when o.order_type = 'dine_in' then null else d.phone end,
    case when o.order_type = 'dine_in' then null else dl.latitude end,
    case when o.order_type = 'dine_in' then null else dl.longitude end,
    case when o.order_type = 'dine_in' then null else dl.recorded_at end,
    o.order_type,
    o.table_number,
    o.prep_minutes,
    o.admin_message,
    o.created_at
  from public.orders o
  join public.restaurants r on r.id = o.restaurant_id
  left join public.delivery_orders dox on dox.order_id = o.id
  left join public.drivers d on d.id = dox.driver_id
  left join lateral (
    select l.latitude, l.longitude, l.recorded_at
    from public.driver_locations l
    where l.order_id = o.id
    order by l.recorded_at desc
    limit 1
  ) dl on true
  where o.tracking_token = p_token
  limit 1;
$$;

revoke all on function public.public_track_order(uuid) from public;
grant execute on function public.public_track_order(uuid) to anon, authenticated;

-- Enable realtime updates for the customer tracking page.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

select 'Dine-in V8 RLS/order/tracking repair ready' as status;