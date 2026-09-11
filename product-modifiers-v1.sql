-- Restaurant OS V2 — Product Modifiers (Simple Extras)
-- Branch: delivery-gps-v1
--
-- Run this migration on the OLD V8 Supabase project used by this branch.
-- It intentionally does NOT touch the Multi-Restaurant Supabase project.

create table if not exists public.product_modifiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  price numeric(12,2) not null default 0 check (price >= 0),
  is_required boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_modifiers_product_id_idx
  on public.product_modifiers(product_id);

alter table public.product_modifiers enable row level security;

-- Customers need to read extras for products shown in the public menu.
drop policy if exists "public read product modifiers" on public.product_modifiers;
create policy "public read product modifiers"
on public.product_modifiers
for select
to anon, authenticated
using (true);

-- Restaurant owners can manage modifiers belonging to their own products.
drop policy if exists "owner insert product modifiers" on public.product_modifiers;
create policy "owner insert product modifiers"
on public.product_modifiers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.products p
    join public.restaurants r on r.id = p.restaurant_id
    where p.id = product_modifiers.product_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "owner update product modifiers" on public.product_modifiers;
create policy "owner update product modifiers"
on public.product_modifiers
for update
to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.restaurants r on r.id = p.restaurant_id
    where p.id = product_modifiers.product_id
      and r.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.products p
    join public.restaurants r on r.id = p.restaurant_id
    where p.id = product_modifiers.product_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "owner delete product modifiers" on public.product_modifiers;
create policy "owner delete product modifiers"
on public.product_modifiers
for delete
to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.restaurants r on r.id = p.restaurant_id
    where p.id = product_modifiers.product_id
      and r.owner_id = auth.uid()
  )
);

-- Avoid duplicate extras with the same normalized name on one product.
create unique index if not exists product_modifiers_product_name_unique
  on public.product_modifiers(product_id, lower(trim(name)));

select 'product modifiers schema ready' as status;
