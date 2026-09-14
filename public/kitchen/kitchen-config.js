// kitchen-config.js - isolated config, does not touch main app
window.KITCHEN_CONFIG = {
  PIN: "1234",
  POLL_INTERVAL: 4000,
  SOUND_ENABLED: true,
  // لو عندك Supabase حط بياناتك هنا
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  // لو شغال بـ Edge Function حط اللينك هنا
  ORDERS_API: "/api/orders?status=kitchen"
};
