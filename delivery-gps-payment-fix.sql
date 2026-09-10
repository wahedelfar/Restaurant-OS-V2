-- Optional compatibility patch if delivery-gps.sql was already run before payment fields were added.
alter table public.orders add column if not exists transfer_phone text;
alter table public.orders add column if not exists payment_proof_url text;

create or replace function public.create_delivery_order(
  p_restaurant_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_address text,
  p_payment_method text,
  p_items jsonb,
  p_customer_lat double precision default null,
  p_customer_lng double precision default null,
  p_transfer_phone text default null,
  p_payment_proof_url text default null
)
returns table(order_id uuid, tracking_token uuid, total numeric)
language plpgsql security definer set search_path=public
as $$
declare
  v_order_id uuid; v_token uuid:=gen_random_uuid(); v_total numeric:=0; v_item jsonb; v_product record; v_qty integer;
begin
  if p_restaurant_id is null then raise exception 'restaurant_required'; end if;
  if coalesce(trim(p_customer_name),'')='' then raise exception 'customer_name_required'; end if;
  if coalesce(trim(p_customer_phone),'')='' then raise exception 'customer_phone_required'; end if;
  if coalesce(trim(p_address),'')='' then raise exception 'address_required'; end if;
  if p_payment_method not in ('cash','vodafone') then raise exception 'invalid_payment_method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'items_required'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty:=greatest(1,least(99,coalesce((v_item->>'quantity')::integer,1)));
    select id,name,price,available into v_product from public.products where id=(v_item->>'product_id')::uuid and restaurant_id=p_restaurant_id and available=true;
    if not found then raise exception 'invalid_product'; end if;
    v_total:=v_total+(v_product.price*v_qty);
  end loop;
  insert into public.orders(restaurant_id,table_id,table_number,order_type,customer_name,customer_phone,address,payment_method,total,items,status,tracking_token,customer_lat,customer_lng,transfer_phone,payment_proof_url)
  values(p_restaurant_id,null,null,'delivery',trim(p_customer_name),trim(p_customer_phone),trim(p_address),p_payment_method,v_total,p_items,'new',v_token,p_customer_lat,p_customer_lng,p_transfer_phone,p_payment_proof_url)
  returning id into v_order_id;
  insert into public.delivery_orders(order_id,restaurant_id,status) values(v_order_id,p_restaurant_id,'unassigned');
  return query select v_order_id,v_token,v_total;
end;
$$;
revoke all on function public.create_delivery_order(uuid,text,text,text,text,jsonb,double precision,double precision,text,text) from public;
grant execute on function public.create_delivery_order(uuid,text,text,text,text,jsonb,double precision,double precision,text,text) to anon,authenticated;
