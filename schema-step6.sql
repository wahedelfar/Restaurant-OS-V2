-- Restaurant OS V2 - Step 6
-- Secure, reliable product editing through a database function.
-- Run once after schema-step5.sql.

create or replace function public.owner_update_product(
  p_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_image_url text,
  p_category_id uuid,
  p_available boolean,
  p_sort_order integer
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  update public.products p
  set name = trim(p_name),
      description = p_description,
      price = p_price,
      image_url = p_image_url,
      category_id = p_category_id,
      available = p_available,
      sort_order = p_sort_order
  where p.id = p_id
    and exists (
      select 1 from public.restaurants r
      where r.id = p.restaurant_id
        and r.owner_id = auth.uid()
    )
  returning p.* into v_product;

  if v_product.id is null then
    raise exception 'لا توجد صلاحية لتعديل هذا المنتج أو المنتج غير موجود';
  end if;

  return v_product;
end;
$$;

grant execute on function public.owner_update_product(uuid,text,text,numeric,text,uuid,boolean,integer) to authenticated;
