import type { CSSProperties } from 'react'

export const dynamic = 'force-dynamic'

interface SizeOption {
  size: string
  price: number
}

interface Product {
  id: string
  name: string
  sizes: SizeOption[] | null
  is_available: boolean | null
  subcategory_id: string | null
}

interface Subcategory {
  id: string
  name: string
  category_id: string | null
}

interface Category {
  id: string
  name: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? 'https://znnnkoujfuweydvbkejh.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'sb_publishable_gjYA4-E-BL0X1hc3YugqyQ_1VaOo_se'

async function supabaseFetch<T>(table: string, select: string): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 300)}`)
  return response.json()
}

function priceRange(sizes: SizeOption[] | null) {
  const prices = (sizes ?? []).map((item) => Number(item?.price)).filter(Number.isFinite)
  if (!prices.length) return 'السعر غير محدد'
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? `${min} جنيه` : `${min} – ${max} جنيه`
}

export default async function Home() {
  try {
    const [products, subcategories, categories] = await Promise.all([
      supabaseFetch<Product>('products_v2', 'id,name,sizes,is_available,subcategory_id'),
      supabaseFetch<Subcategory>('subcategories', 'id,name,category_id'),
      supabaseFetch<Category>('categories', 'id,name'),
    ])

    const categoryMap = new Map(categories.map((category) => [category.id, category]))
    const subcategoryMap = new Map(subcategories.map((subcategory) => [subcategory.id, subcategory]))
    const availableProducts = products.filter((product) => product.is_available !== false)

    return (
      <main dir="rtl" style={styles.page}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>RESTAURANT OS</div>
            <h1 style={styles.title}>ذا بيتزا برجر كافيه</h1>
            <p style={styles.subtitle}>القائمة الرقمية متصلة بقاعدة بيانات Supabase مباشرة</p>
          </div>
          <div style={styles.status}><span style={styles.dot} /> متصل بقاعدة البيانات</div>
        </header>

        <section style={styles.hero}>
          <div>
            <div style={styles.heroLabel}>LIVE MENU</div>
            <h2 style={styles.heroTitle}>قائمة الطعام</h2>
            <p style={styles.heroText}>تم تحميل {availableProducts.length} منتج متاح من products_v2 مباشرة من Supabase.</p>
          </div>
          <div style={styles.countCard}><strong style={{ fontSize: 32 }}>{products.length}</strong><span>إجمالي المنتجات</span></div>
        </section>

        <div style={styles.categories}>
          {categories.map((category) => {
            const count = availableProducts.filter((product) => {
              const subcategory = product.subcategory_id ? subcategoryMap.get(product.subcategory_id) : undefined
              return subcategory?.category_id === category.id
            }).length
            return <div key={category.id} style={styles.categoryPill}>{category.name}<span style={styles.categoryCount}>{count}</span></div>
          })}
        </div>

        <section style={styles.grid}>
          {availableProducts.map((product) => {
            const subcategory = product.subcategory_id ? subcategoryMap.get(product.subcategory_id) : undefined
            const category = subcategory?.category_id ? categoryMap.get(subcategory.category_id) : undefined
            return (
              <article key={product.id} style={styles.card}>
                <div style={styles.cardTop}><span style={styles.categoryTag}>{category?.name ?? 'منتج'}</span><span style={styles.available}>متاح</span></div>
                <h3 style={styles.productName}>{product.name}</h3>
                {subcategory?.name && <div style={styles.subcategory}>{subcategory.name}</div>}
                <div style={styles.price}>{priceRange(product.sizes)}</div>
                <div style={styles.sizes}>
                  {(product.sizes ?? []).map((item) => <span key={`${product.id}-${item.size}`} style={styles.size}>{item.size}: {Number(item.price)} جنيه</span>)}
                </div>
              </article>
            )
          })}
        </section>
      </main>
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف'
    return (
      <main dir="rtl" style={styles.errorPage}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>!</div>
          <h1 style={styles.errorTitle}>تعذر الاتصال بـ Supabase</h1>
          <p style={styles.errorText}>الصفحة تعتمد الآن على قاعدة البيانات الحقيقية فقط، ولن تعرض نسخة منتجات محلية وهمية عند فشل الاتصال.</p>
          <pre style={styles.errorDetails}>{message}</pre>
        </div>
      </main>
    )
  }
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', padding: '32px 20px 60px', background: 'radial-gradient(circle at 80% 0%, #3b2d0b 0, #0b0c0e 32%), #0b0c0e', color: '#f7f1e5', fontFamily: 'Arial, sans-serif' },
  header: { maxWidth: 1180, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  eyebrow: { color: '#d4af37', fontSize: 12, fontWeight: 800, letterSpacing: 2 },
  title: { margin: '6px 0', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900 },
  subtitle: { margin: 0, color: '#aaa49a' },
  status: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid #315a3b', borderRadius: 999, color: '#9ee2aa', background: '#102016', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700 },
  dot: { width: 9, height: 9, borderRadius: '50%', background: '#55d66b' },
  hero: { maxWidth: 1180, margin: '0 auto 22px', padding: 28, borderRadius: 28, border: '1px solid #5d4a18', background: 'linear-gradient(135deg, #191a1e, #25211a)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  heroLabel: { color: '#d4af37', fontSize: 12, fontWeight: 900, letterSpacing: 2 },
  heroTitle: { margin: '6px 0', fontSize: 32, fontWeight: 900 },
  heroText: { margin: 0, color: '#b4aea3', lineHeight: 1.8 },
  countCard: { minWidth: 150, padding: 18, borderRadius: 20, background: '#111216', border: '1px solid #3b3422', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  categories: { maxWidth: 1180, margin: '0 auto 20px', display: 'flex', flexWrap: 'wrap', gap: 10 },
  categoryPill: { padding: '10px 14px', borderRadius: 999, background: '#17181c', border: '1px solid #2b2d32', fontWeight: 800 },
  categoryCount: { marginRight: 8, color: '#d4af37' },
  grid: { maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 },
  card: { padding: 20, borderRadius: 22, background: 'linear-gradient(145deg, #181a1e, #111216)', border: '1px solid #292b30', boxShadow: '0 14px 40px #0005' },
  cardTop: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  categoryTag: { color: '#d4af37', fontSize: 12, fontWeight: 800 },
  available: { color: '#91d99c', fontSize: 11, fontWeight: 800 },
  productName: { margin: '16px 0 4px', fontSize: 19, fontWeight: 900 },
  subcategory: { color: '#99948b', fontSize: 13 },
  price: { marginTop: 16, fontSize: 18, fontWeight: 900, color: '#f0d67c' },
  sizes: { display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  size: { padding: '6px 8px', borderRadius: 9, background: '#24262b', color: '#c9c3b8', fontSize: 11 },
  errorPage: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#0b0c0e', color: '#fff' },
  errorCard: { width: 'min(680px, 100%)', padding: 30, borderRadius: 24, background: '#17181c', border: '1px solid #4b2929', textAlign: 'center' },
  errorIcon: { width: 48, height: 48, margin: '0 auto 14px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#5a2525', color: '#ffb0b0', fontSize: 24, fontWeight: 900 },
  errorTitle: { margin: '0 0 10px', fontSize: 26, fontWeight: 900 },
  errorText: { margin: '0 0 18px', color: '#bbb4aa', lineHeight: 1.8 },
  errorDetails: { margin: 0, padding: 14, borderRadius: 12, background: '#0e0f12', color: '#f2a4a4', textAlign: 'left', direction: 'ltr', overflowX: 'auto', fontSize: 12 },
}
