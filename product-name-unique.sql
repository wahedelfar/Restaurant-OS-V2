-- Restaurant OS V2 — prevent duplicate product names per restaurant.
-- Case-insensitive uniqueness is enforced at the database level.
-- The application trims product names before insert and performs an additional
-- case-insensitive duplicate check before the INSERT.
--
-- NOTE: This migration intentionally does not delete or modify existing rows.
-- If existing duplicate names already exist for the same restaurant, PostgreSQL
-- will reject the index creation until those duplicates are resolved manually.

create unique index if not exists products_restaurant_name_ci_unique_idx
  on public.products (restaurant_id, lower(name));
