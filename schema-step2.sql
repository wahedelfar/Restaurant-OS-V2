-- Restaurant OS V2 - Step 2 secure Supabase setup
-- Run once AFTER the original schema.sql.

alter table restaurants add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- Remove the temporary wide-open policies from the first setup.
drop policy if exists "public read restaurants" on restaurants;
drop policy if exists "public read categories" on categories;
drop policy if exists "public read products" on products;
drop policy if exists "public read tables" on tables;
drop policy if exists "public insert orders" on orders;
drop policy if exists "public read own restaurant orders" on orders;

-- Public customers can read only published menu data.
create policy "public read restaurants"
on restaurants for select using (true);

create policy "public read categories"
on categories for select using (
  exists (select 1 from restaurants r where r.id=categories.restaurant_id)
);

create policy "public read products"
on products for select using (
  exists (select 1 from restaurants r where r.id=products.restaurant_id)
);

create policy "public read tables"
on tables for select using (
  active = true and exists (select 1 from restaurants r where r.id=tables.restaurant_id)
);

-- Authenticated owner policies.
create policy "owner insert restaurant"
on restaurants for insert to authenticated
with check (owner_id = auth.uid());

create policy "owner update restaurant"
on restaurants for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owner delete restaurant"
on restaurants for delete to authenticated
using (owner_id = auth.uid());

create policy "owner manage categories"
on categories for all to authenticated
using (exists (select 1 from restaurants r where r.id=categories.restaurant_id and r.owner_id=auth.uid()))
with check (exists (select 1 from restaurants r where r.id=categories.restaurant_id and r.owner_id=auth.uid()));

create policy "owner manage products"
on products for all to authenticated
using (exists (select 1 from restaurants r where r.id=products.restaurant_id and r.owner_id=auth.uid()))
with check (exists (select 1 from restaurants r where r.id=products.restaurant_id and r.owner_id=auth.uid()));

create policy "owner manage tables"
on tables for all to authenticated
using (exists (select 1 from restaurants r where r.id=tables.restaurant_id and r.owner_id=auth.uid()))
with check (exists (select 1 from restaurants r where r.id=tables.restaurant_id and r.owner_id=auth.uid()));

create policy "owner read orders"
on orders for select to authenticated
using (exists (select 1 from restaurants r where r.id=orders.restaurant_id and r.owner_id=auth.uid()));

create policy "public create valid orders"
on orders for insert to anon, authenticated
with check (
  exists (select 1 from restaurants r where r.id=orders.restaurant_id)
);

create policy "owner update orders"
on orders for update to authenticated
using (exists (select 1 from restaurants r where r.id=orders.restaurant_id and r.owner_id=auth.uid()))
with check (exists (select 1 from restaurants r where r.id=orders.restaurant_id and r.owner_id=auth.uid()));

-- Optional helper: after creating your Auth user, replace YOUR_USER_UUID below
-- with the user's UUID and run this to claim/create the demo restaurant.
-- insert into restaurants(name,slug,logo,whatsapp_number,primary_color,secondary_color,owner_id)
-- values ('ذا بيتزا برجر كافيه','pizza-burger','🍕','201026569682','#111111','#D4AF37','YOUR_USER_UUID');


drop policy if exists "owner delete orders" on orders;
create policy "owner delete orders"
on orders for delete to authenticated
using (exists (select 1 from restaurants r where r.id=orders.restaurant_id and r.owner_id=auth.uid()));
