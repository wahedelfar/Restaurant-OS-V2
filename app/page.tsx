import MenuClient from './menu-client'

type Modifier = { id: string; product_id: string; name: string; price: number; is_required: boolean }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://znnnkoujfuweydvbkejh.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_gjYA4-E-BL0X1hc3YugqyQ_1VaOo_se'

async function read(table: string, select: string, extra = '') {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${extra}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Supabase ${response.status}`)
  return response.json()
}

export default async function Home() {
  try {
    const [products, categories, subcategories] = await Promise.all([
      read('products_v2', 'id,name,sizes,subcategory_id', '&is_available=eq.true&order=name.asc'),
      read('categories', 'id,name', '&order=name.asc'),
      read('subcategories', 'id,name,category_id', '&order=name.asc'),
    ])
    let modifiers: Modifier[] = []
    try {
      modifiers = await read('product_modifiers', 'id,product_id,name,price,is_required', '&order=created_at.asc')
    } catch {
      modifiers = []
    }
    return <MenuClient products={products} categories={categories} subcategories={subcategories} modifiers={modifiers} />
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر تحميل بيانات المطعم'
    return <main dir="rtl" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'#0b0c0e',color:'#fff',fontFamily:'Arial,sans-serif'}}><div style={{width:'min(620px,100%)',padding:28,borderRadius:22,background:'#17181c',border:'1px solid #5a2929',display:'grid',gap:12,textAlign:'center'}}><h2>تعذر تحميل القائمة</h2><p style={{color:'#aaa49a'}}>حدث خطأ أثناء الاتصال بقاعدة البيانات.</p><code style={{color:'#f0b0b0'}}>{message}</code></div></main>
  }
}
