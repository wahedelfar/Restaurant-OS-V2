-- Restaurant OS V2 - Step 3 payment + table flow
-- Run after schema.sql and schema-step2.sql. Safe to run more than once.

alter table orders add column if not exists customer_phone text;
alter table orders add column if not exists transfer_phone text;
alter table orders add column if not exists payment_proof_url text;

-- Public bucket for payment screenshots uploaded from the customer checkout.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "public upload payment proofs" on storage.objects;
drop policy if exists "public read payment proofs" on storage.objects;

create policy "public upload payment proofs"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'payment-proofs');

create policy "public read payment proofs"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'payment-proofs');
