-- Restaurant OS V2 - Step 4
-- Ensure the built-in "مشروبات" category exists for the current restaurant.
-- Run once after schema-step2.sql. Safe to run more than once.

INSERT INTO categories (restaurant_id, name, sort_order)
SELECT r.id, 'مشروبات', COALESCE(MAX(c.sort_order),0)+1
FROM restaurants r
LEFT JOIN categories c ON c.restaurant_id=r.id
WHERE r.slug='pizza-burger'
  AND NOT EXISTS (SELECT 1 FROM categories c2 WHERE c2.restaurant_id=r.id AND trim(c2.name)='مشروبات')
GROUP BY r.id;
