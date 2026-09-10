-- Restaurant OS V2 - Step 5
-- Allow the authenticated restaurant owner to permanently delete old orders.
-- Run once after schema-step2.sql. Safe to run more than once.

drop policy if exists "owner delete orders" on orders;
create policy "owner delete orders"
on orders for delete to authenticated
using (exists (select 1 from restaurants r where r.id=orders.restaurant_id and r.owner_id=auth.uid()));
