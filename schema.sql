-- Restaurant OS V2 / Supabase schema
create extension if not exists pgcrypto;
create table if not exists restaurants(id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, logo text, whatsapp_number text not null, primary_color text default '#111111', secondary_color text default '#D4AF37', created_at timestamptz default now());
create table if not exists categories(id uuid primary key default gen_random_uuid(), restaurant_id uuid references restaurants(id) on delete cascade, name text not null, sort_order int default 0);
create table if not exists products(id uuid primary key default gen_random_uuid(), restaurant_id uuid references restaurants(id) on delete cascade, category_id uuid references categories(id) on delete set null, name text not null, description text, price numeric(12,2) not null, image_url text, available boolean default true, sort_order int default 0);
create table if not exists tables(id uuid primary key default gen_random_uuid(), restaurant_id uuid references restaurants(id) on delete cascade, table_number int not null, active boolean default true, unique(restaurant_id,table_number));
create table if not exists orders(id uuid primary key default gen_random_uuid(), restaurant_id uuid references restaurants(id) on delete cascade, table_id uuid references tables(id) on delete set null, table_number int, order_type text not null check(order_type in ('dine_in','delivery')), customer_name text, customer_phone text, address text, payment_method text, transfer_phone text, payment_proof_url text, total numeric(12,2) not null, items jsonb not null default '[]', status text default 'new', created_at timestamptz default now());
-- Basic RLS. For production, add an authenticated staff/restaurant_members table and restrict admin writes by membership.
alter table restaurants enable row level security; alter table categories enable row level security; alter table products enable row level security; alter table tables enable row level security; alter table orders enable row level security;
create policy "public read restaurants" on restaurants for select using (true);
create policy "public read categories" on categories for select using (true);
create policy "public read products" on products for select using (true);
create policy "public read tables" on tables for select using (true);
create policy "public insert orders" on orders for insert with check (true);
create policy "public read own restaurant orders" on orders for select using (true);
-- NOTE: Do NOT expose a Supabase service_role key in this frontend. Add proper authenticated staff policies before enabling dashboard writes against Supabase.
