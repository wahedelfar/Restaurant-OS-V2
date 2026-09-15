window.APP_CONFIG = {
  mode: 'supabase',
  supabaseUrl: 'https://znnnkoujfuweydvbkejh.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpubm5rb3VqZnV3ZXlkdmJrZWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5ODA4NjQsImV4cCI6MjEwNDU1Njg2NH0.sg_WW8__dL0NO9aqJU2d_9oYmLUIdLb4C1QT1xHecPw',
  restaurantSlug: 'pizza-burger',
  publicAppUrl: 'https://ros-v10.vercel.app',
  currency: 'جنيه',
  defaultTheme: '#111111',
  demoRestaurant: {
    id: 'demo-restaurant', name: 'ذا بيتزا برجر كافيه', logo: '🍕', whatsapp: '201026569682', primary_color: '#111111', secondary_color: '#D4AF37'
  },
  demoCategories: [
    { id: 'cat1', name: 'العروض', sort_order: 1 }, { id: 'cat2', name: 'بيتزا', sort_order: 2 }, { id: 'cat3', name: 'برجر', sort_order: 3 }, { id: 'cat4', name: 'إضافات', sort_order: 4 }, { id: 'cat5', name: 'مشروبات', sort_order: 5 }
  ],
  demoProducts: [
    { id:'p1',category_id:'cat1',name:'كومبو بيتزا وبرجر',description:'بيتزا + برجر + بطاطس',price:280,image:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',available:true,sort_order:1 },
    { id:'p2',category_id:'cat2',name:'بيتزا بيبروني',description:'جبنة موزاريلا وبيبروني',price:180,image:'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800',available:true,sort_order:2 },
    { id:'p3',category_id:'cat2',name:'بيتزا تشيكن',description:'دجاج، مشروم، موزاريلا',price:170,image:'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',available:true,sort_order:3 },
    { id:'p4',category_id:'cat3',name:'تشيز برجر',description:'لحم، جبنة، صوص خاص',price:150,image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',available:true,sort_order:4 },
    { id:'p5',category_id:'cat4',name:'بطاطس',description:'بطاطس مقرمشة',price:60,image:'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800',available:true,sort_order:5 }
  ]
};