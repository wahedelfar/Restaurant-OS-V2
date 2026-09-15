window.APP_CONFIG = {
  mode: 'supabase',
  supabaseUrl: 'https://znnnkoujfuweydvbkejh.supabase.co',
  supabaseAnonKey: 'sb_publishable_gjYA4-E-BL0X1hc3YugqyQ_1VaOo_se',
  restaurantSlug: 'pizza-burger',
  publicAppUrl: 'https://ros-v10.vercel.app',
  currency: 'جنيه',
  defaultTheme: '#111111',
  demoRestaurant: {
    id: 'demo-restaurant',
    name: 'ذا بيتزا برجر كافيه',
    logo: '🍕',
    primary_color: '#111111',
    secondary_color: '#D4AF37'
  },
  demoCategories: [
    { id: 'cat1', name: 'العروض', sort_order: 1 },
    { id: 'cat2', name: 'بيتزا', sort_order: 2 },
    { id: 'cat3', name: 'برجر', sort_order: 3 },
    { id: 'cat4', name: 'إضافات', sort_order: 4 },
    { id: 'cat5', name: 'مشروبات', sort_order: 5 }
  ],
  demoProducts: [
    { id:'p1',category_id:'cat1',name:'كومبو بيتزا وبرجر',description:'بيتزا + برجر + بطاطس',price:280,image:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',available:true,sort_order:1 },
    { id:'p2',category_id:'cat2',name:'بيتزا بيبروني',description:'جبنة موزاريلا وبيبروني',price:180,image:'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800',available:true,sort_order:2 },
    { id:'p3',category_id:'cat2',name:'بيتزا تشيكن',description:'دجاج، مشروم، موزاريلا',price:170,image:'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',available:true,sort_order:3 },
    { id:'p4',category_id:'cat3',name:'تشيز برجر',description:'لحم، جبنة، صوص خاص',price:150,image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',available:true,sort_order:4 },
    { id:'p5',category_id:'cat4',name:'بطاطس',description:'بطاطس مقرمشة',price:60,image:'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800',available:true,sort_order:5 }
  ]
};

// Central Supabase client used by admin enhancements and auxiliary modules.
// index.html loads @supabase/supabase-js before config.js, so this is created once
// from the same project URL/key used by the rest of the application.
if (window.supabase && window.APP_CONFIG.supabaseUrl && window.APP_CONFIG.supabaseAnonKey) {
  window.rosDb = window.supabase.createClient(
    window.APP_CONFIG.supabaseUrl,
    window.APP_CONFIG.supabaseAnonKey
  );
}
