# Restaurant OS V2 — Supabase Connected

هذه النسخة تربط واجهة المطعم ولوحة الإدارة مباشرة بـ Supabase.

## الموجود
- Supabase JS client.
- تحميل المطعم والتصنيفات والمنتجات والطاولات والطلبات من قاعدة البيانات.
- Login للـDashboard باستخدام Supabase Auth.
- إنشاء أول مطعم للحساب بعد تسجيل الدخول، مع 30 طاولة وبيانات Demo.
- إضافة/تعديل/حذف المنتجات وحفظها في Supabase.
- تغيير لون الثيم وحفظه في Supabase.
- QR لكل طاولة بصيغة `?table=رقم`.
- طلب داخل المطعم لا يعرض طرق الدفع الخارجية.
- الطلب الخارجي يعرض الاسم والعنوان وطريقة الدفع.
- حفظ الطلب في Supabase ثم فتح WhatsApp.

## إعداد Supabase
1. شغّل `schema.sql` الذي شغلته سابقاً.
2. شغّل `schema-step2.sql` مرة واحدة. هذا يستبدل الـpolicies المؤقتة بسياسات مرتبطة بمالك المطعم.
3. من Supabase > Authentication > Users أنشئ مستخدم Email/Password.
4. افتح الموقع ثم `#admin` وسجل دخول بهذا المستخدم.
5. إذا لم يوجد مطعم مرتبط بالحساب، ستظهر شاشة إنشاء المطعم. أنشئه مرة واحدة.

## أمان
- استخدم Publishable/anon key فقط في الواجهة.
- لا تضع service_role key في الموقع.
- بيانات لوحة الإدارة محمية عبر Supabase Auth + RLS.
- الطلبات يمكن للعميل إنشاءها، لكن قراءتها وتعديلها محصور بمالك المطعم.

## Vercel
المشروع Static ولا يحتاج build command. ارفع مجلد `v2` إلى Vercel أو اربطه بمستودع GitHub.


## التحديثات الأخيرة
- زر × لإغلاق نافذة QR، مع إغلاق عند الضغط خارج النافذة.
- طلب خارجي: رقم هاتف العميل مطلوب.
- عند اختيار Vodafone Cash يظهر الرقم `01063537686` وتعليمات التحويل.
- عند اختيار Vodafone Cash يصبح رقم الهاتف المحوّل منه وصورة التحويل مطلوبين.
- صورة التحويل ترفع إلى Supabase Storage bucket باسم `payment-proofs` ويتم حفظ رابطها داخل الطلب.
- طلب داخل المطعم يعتمد على `?table=N` ويخزن `table_id` و`table_number` تلقائياً، ولا يعرض العنوان أو دفع Vodafone Cash.

### SQL إضافي
للقاعدة الموجودة بالفعل: شغّل `schema-step3.sql` مرة واحدة بعد `schema-step2.sql`.

## Step 3 — Vodafone Cash proof upload
Before using Vodafone Cash screenshot uploads, run `schema-step3.sql` once in Supabase SQL Editor. It creates the required order columns and the `payment-proofs` storage bucket.

## PWA installation
The project includes a real service worker, manifest, Apple touch icons, Windows tile icon, favicon sizes, and an install button. Browsers that support native PWA installation use the native prompt; browsers without native installation support show platform-specific instructions.


## Final V2 fixes
- Dine-in WhatsApp opens immediately from the customer click and no longer depends on Supabase order-save success.
- WhatsApp numbers are normalized automatically to the international Egypt format.
- Product edit/save uses direct Supabase UPDATE/INSERT without RETURNING, avoiding RLS-related save failures.
- The install button hides after an accepted install prompt and while the app is installed; it also stays out of checkout modals.
- Built-in **مشروبات** category is included. For an already-existing Supabase restaurant, run `schema-step4.sql` once if the category is not yet present.


## Final V6 notes
- Run `schema-step5.sql` once to enable owner deletion of old orders.
- Product edits use update + verification without relying on RETURNING.
- Dine-in WhatsApp uses direct navigation to preserve Android user activation.
- PWA migration clears legacy service workers/caches once and uses v6 cache busting.

V7: Run schema-step6.sql once to enable reliable owner product updates.

<!-- ROS V10 restored to the verified 39530ac application tree. -->
