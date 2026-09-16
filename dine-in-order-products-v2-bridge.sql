-- Restaurant OS: bridge the customer menu order flow to the current products_v2 catalog.
-- Applied to Supabase project znnnkoujfuweydvbkejh.

create or replace function public.create_dine_in_order(
  p_restaurant_id uuid,
  p_table_number integer,
  p_customer_name text,
  p_items jsonb
)
returns table(order_id uuid, tracking_token uuid, total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_tracking_token uuid;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_mod jsonb;
  v_product record;
  v_modifier record;
  v_quantity integer;
  v_modifiers jsonb;
  v_modifier_total numeric;
  v_required_count integer;
  v_selected_required_count integer;
  v_size text;
  v_base_price numeric;
begin
  if not exists(select 1 from public.restaurants r where r.id = p_restaurant_id) then
    raise exception 'المطعم غير موجود';
  end if;

  select t.id into v_order_id
  from public.tables t
  where t.restaurant_id = p_restaurant_id and t.table_number = p_table_number and t.active = true
  limit 1;
  if v_order_id is null then raise exception 'رقم الطاولة غير صالح'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'السلة فارغة';
  end if;

  v_order_id := gen_random_uuid();
  v_tracking_token := gen_random_uuid();

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := greatest(1, least(99, coalesce((v_item->>'quantity')::integer, 1)));
    v_size := nullif(trim(coalesce(v_item->>'size','')), '');

    select p.id, p.name, p.sizes into v_product
    from public.products_v2 p
    where p.id = nullif(v_item->>'product_id','')::uuid and p.is_available = true;
    if not found then raise exception 'أحد المنتجات غير متاح أو غير موجود'; end if;

    if v_size is null then
      select coalesce((v_product.sizes->0->>'price')::numeric, 0) into v_base_price;
      v_size := coalesce(v_product.sizes->0->>'size', 'عادي');
    else
      select (s->>'price')::numeric into v_base_price
      from jsonb_array_elements(coalesce(v_product.sizes,'[]'::jsonb)) s
      where s->>'size' = v_size limit 1;
      if v_base_price is null then raise exception 'الحجم المختار غير متاح للمنتج'; end if;
    end if;

    v_modifiers := '[]'::jsonb;
    v_modifier_total := 0;
    if jsonb_typeof(coalesce(v_item->'modifiers','[]'::jsonb)) <> 'array' then raise exception 'invalid_modifiers'; end if;

    for v_mod in select value from jsonb_array_elements(coalesce(v_item->'modifiers','[]'::jsonb)) loop
      select pm.id, pm.name, pm.price, pm.is_required into v_modifier
      from public.product_modifiers pm
      where pm.id = nullif(v_mod->>'id','')::uuid and pm.product_id = v_product.id;
      if not found then raise exception 'invalid_modifier'; end if;
      if exists(select 1 from jsonb_array_elements(v_modifiers) z where z->>'id' = v_modifier.id::text) then raise exception 'duplicate_modifier'; end if;
      v_modifier_total := v_modifier_total + coalesce(v_modifier.price,0);
      v_modifiers := v_modifiers || jsonb_build_array(jsonb_build_object('id',v_modifier.id,'name',v_modifier.name,'price',v_modifier.price));
    end loop;

    select count(*)::integer into v_required_count from public.product_modifiers pm where pm.product_id = v_product.id and pm.is_required = true;
    select count(*)::integer into v_selected_required_count from public.product_modifiers pm where pm.product_id = v_product.id and pm.is_required = true and exists(select 1 from jsonb_array_elements(v_modifiers) z where z->>'id' = pm.id::text);
    if v_selected_required_count < v_required_count then raise exception 'required_modifier_missing'; end if;

    v_total := v_total + ((v_base_price + v_modifier_total) * v_quantity);
    v_items := v_items || jsonb_build_array(jsonb_build_object('product_id',v_product.id,'name',v_product.name,'quantity',v_quantity,'price',v_base_price + v_modifier_total,'base_price',v_base_price,'size',v_size,'modifiers',v_modifiers));
  end loop;

  insert into public.orders(id,restaurant_id,table_id,table_number,order_type,customer_name,customer_phone,address,payment_method,total,items,status,tracking_token,prep_minutes,admin_message,kitchen_status,is_hidden_from_kds)
  values(v_order_id,p_restaurant_id,(select t.id from public.tables t where t.restaurant_id=p_restaurant_id and t.table_number=p_table_number and t.active=true limit 1),p_table_number,'dine_in',coalesce(nullif(trim(p_customer_name),''),'عميل'),null,null,'cash',v_total,v_items,'new',v_tracking_token,15,'تم استلام الطلب','received',false);

  return query select v_order_id,v_tracking_token,v_total;
end;
$$;

revoke all on function public.create_dine_in_order(uuid, integer, text, jsonb) from public;
grant execute on function public.create_dine_in_order(uuid, integer, text, jsonb) to anon, authenticated;
