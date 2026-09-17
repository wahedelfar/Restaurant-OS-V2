-- Restaurant OS V2: keep dine-in customer/admin status synchronized with kitchen status.
-- Applied to Supabase project znnnkoujfuweydvbkejh.

create or replace function public.sync_dine_in_kitchen_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.order_type = 'dine_in' and new.kitchen_status is distinct from old.kitchen_status then
    new.status := case coalesce(new.kitchen_status,'received')
      when 'received' then 'new'
      when 'preparing' then 'preparing'
      when 'ready' then 'ready'
      else new.status
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_dine_in_kitchen_status on public.orders;
create trigger sync_dine_in_kitchen_status
before update of kitchen_status on public.orders
for each row
execute function public.sync_dine_in_kitchen_status();

-- public_track_order keeps delivery tracking unchanged, while dine-in tracking
-- exposes the kitchen lifecycle through the existing status field.
create or replace function public.public_track_order(p_token uuid)
returns table(order_id uuid, restaurant_name text, customer_name text, total numeric, status text, driver_name text, driver_phone text, latitude double precision, longitude double precision, recorded_at timestamptz, order_type text, table_number integer, prep_minutes integer, admin_message text, created_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select
    o.id,
    r.name,
    o.customer_name,
    o.total,
    case when o.order_type = 'dine_in' then coalesce(nullif(o.kitchen_status,''),'new') else o.status end,
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
