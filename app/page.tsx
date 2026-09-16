'use client'

import { useEffect, useMemo, useState } from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://znnnkoujfuweydvbkejh.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_gjYA4-E-BL0X1hc3YugqyQ_1VaOo_se'
const RESTAURANT_ID = '02da399f-b12d-480b-bf53-5491bbe8f9e5'

type SizeOption = { size: string; price: number }
type Product = { id: string; name: string; sizes: SizeOption[] | null; is_available: boolean | null; subcategory_id: string | null }
type Category = { id: string; name: string }
type Subcategory = { id: string; name: string; category_id: string | null }
type Modifier = { id: string; product_id: string; name: string; price: number; is_required: boolean }
type CartItem = { id: string; name: string; price: number; basePrice: number; size: string; qty: number; modifiers: Modifier[] }

async function api(table: string, select: string, extra = '') {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${extra}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 300)}`)
  return response.json()
}

async function rpc(name: string, args: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(text.slice(0, 500))
  return text ? JSON.parse(text) : null
}

function price(product: Product) {
  const values = (product.sizes ?? []).map(x => Number(x.price)).filter(Number.isFinite)
  return values.length ? Math.min(...values) : 0
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [modifiers, setModifiers] = useState<Modifier[]>([])
  const [tableNumber, setTableNumber] = useState<string | null>(null)
  const [category, setCategory] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [modal, setModal] = useState<'cart' | 'product' | 'checkout' | 'success' | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null)
  const [selectedMods, setSelectedMods] = useState<Modifier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [lastOrder, setLastOrder] = useState<{ id?: string; token?: string; total?: number } | null>(null)

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get('table')
    setTableNumber(n && /^\d+$/.test(n) ? n : null)
    try {
      const saved = JSON.parse(localStorage.getItem('ros_cart_v2') || '[]')
      if (Array.isArray(saved)) setCart(saved)
    } catch {}
    ;(async () => {
      try {
        const [p, c, s, m] = await Promise.all([
          api('products_v2', 'id,name,sizes,is_available,subcategory_id', '&is_available=eq.true&order=name.asc'),
          api('categories', 'id,name', '&order=name.asc'),
          api('subcategories', 'id,name,category_id', '&order=name.asc'),
          api('product_modifiers', 'id,product_id,name,price,is_required', '&order=created_at.asc'),
        ])
        setProducts(p)
        setCategories(c)
        setSubcategories(s)
        setModifiers(m)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'تعذر تحميل بيانات المطعم')
      } finally { setLoading(false) }
    })()
  }, [])

  useEffect(() => { localStorage.setItem('ros_cart_v2', JSON.stringify(cart)) }, [cart])

  const subMap = useMemo(() => new Map(subcategories.map(x => [x.id, x])), [subcategories])
  const categoryMap = useMemo(() => new Map(categories.map(x => [x.id, x])), [categories])
  const filtered = useMemo(() => products.filter(p => {
    if (category === 'all') return true
    return subMap.get(p.subcategory_id || '')?.category_id === category
  }), [products, category, subMap])
  const total = cart.reduce((sum, x) => sum + x.price * x.qty, 0)
  const count = cart.reduce((sum, x) => sum + x.qty, 0)

  function openProduct(product: Product) {
    const sizes = product.sizes ?? []
    setSelected(product)
    setSelectedSize(sizes[0] || { size: 'عادي', price: price(product) })
    setSelectedMods([])
    setModal('product')
  }

  function addSelected() {
    if (!selected || !selectedSize) return
    const item: CartItem = { id: selected.id, name: selected.name, price: Number(selectedSize.price) + selectedMods.reduce((a, m) => a + Number(m.price), 0), basePrice: Number(selectedSize.price), size: selectedSize.size, qty: 1, modifiers: selectedMods }
    setCart(prev => {
      const key = JSON.stringify([item.id, item.size, item.modifiers.map(x => x.id).sort()])
      const existing = prev.find(x => JSON.stringify([x.id, x.size, x.modifiers.map(m => m.id).sort()]) === key)
      return existing ? prev.map(x => x === existing ? { ...x, qty: x.qty + 1 } : x) : [...prev, item]
    })
    setModal(null)
  }

  function change(item: CartItem, delta: number) {
    setCart(prev => prev.flatMap(x => x === item ? (x.qty + delta > 0 ? [{ ...x, qty: x.qty + delta }] : []) : [x]))
  }

  async function submitDineIn() {
    if (!tableNumber || !cart.length) return
    setBusy(true)
    try {
      const items = cart.map(x => ({ product_id: x.id, name: x.name, quantity: x.qty, price: x.price, size: x.size, modifiers: x.modifiers.map(m => ({ id: m.id, name: m.name, price: m.price })) }))
      const result = await rpc('create_dine_in_order', { p_restaurant_id: RESTAURANT_ID, p_table_number: Number(tableNumber), p_customer_name: customerName || 'عميل', p_items: items })
      const row = Array.isArray(result) ? result[0] : result
      setLastOrder({ id: row?.order_id, token: row?.tracking_token, total: Number(row?.total || total) })
      setCart([])
      setModal('success')
    } catch (e) {
      alert(`تعذر إرسال الطلب للمطبخ:\n${e instanceof Error ? e.message : 'خطأ غير معروف'}`)
    } finally { setBusy(false) }
  }

  if (loading) return <main dir="rtl" style={styles.center}><div style={styles.loader}>جاري تحميل القائمة…</div></main>
  if (error) return <main dir="rtl" style={styles.center}><div style={styles.error}><b>تعذر الاتصال بقاعدة البيانات</b><span>{error}</span><button onClick={() => location.reload()}>إعادة المحاولة</button></div></main>

  return <main dir="rtl" style={styles.page}>
    <header style={styles.header}>
      <div style={styles.brand}><div style={styles.logo}>🍽️</div><div><div style={styles.kicker}>RESTAURANT OS</div><h1 style={styles.title}>ذا بيتزا برجر كافيه</h1><div style={styles.muted}>{tableNumber ? `طلب من الطاولة رقم ${tableNumber}` : 'القائمة الرقمية'}</div></div></div>
      <button style={styles.cartBtn} onClick={() => setModal('cart')}>السلة <b>{count}</b></button>
    </header>

    <section style={styles.hero}><div><div style={styles.kicker}>LIVE MENU</div><h2 style={styles.heroTitle}>طعم يستحق التجربة.</h2><p style={styles.heroText}>اختار طلبك، حدد الحجم والإضافات، ثم أرسله مباشرة للمطبخ.</p><div style={styles.pills}><span>✓ {products.length} منتج</span><span>✓ متصل بـ Supabase</span>{tableNumber && <span>✓ طاولة {tableNumber}</span>}</div></div><div style={styles.heroCount}><strong>{products.length}</strong><small>منتج متاح</small></div></section>

    <div style={styles.categories}><button onClick={() => setCategory('all')} style={category === 'all' ? styles.activePill : styles.pill}>الكل</button>{categories.map(c => <button key={c.id} onClick={() => setCategory(c.id)} style={category === c.id ? styles.activePill : styles.pill}>{c.name}</button>)}</div>

    <section style={styles.grid}>{filtered.map(product => {
      const sub = subMap.get(product.subcategory_id || '')
      const cat = sub?.category_id ? categoryMap.get(sub.category_id) : undefined
      const sizes = product.sizes ?? []
      return <article key={product.id} style={styles.card}>
        <div style={styles.image}><span>🍕</span><div style={styles.priceChip}>{sizes.length ? `${price(product)} جنيه` : 'السعر غير محدد'}</div></div>
        <div style={styles.cardBody}><div style={styles.tag}>{cat?.name || 'قائمة الطعام'}</div><h3>{product.name}</h3>{sub?.name && <div style={styles.sub}>{sub.name}</div>}<div style={styles.sizePreview}>{sizes.map(s => <span key={s.size}>{s.size}: {s.price} ج</span>)}</div><button style={styles.addBtn} onClick={() => openProduct(product)}>اختيار وإضافة للسلة</button></div>
      </article>
    })}</section>

    {modal && <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget && !busy) setModal(null) }}>
      {modal === 'product' && selected && <div style={styles.modal}><div style={styles.modalHead}><div><div style={styles.kicker}>اختيار المنتج</div><h2>{selected.name}</h2></div><button style={styles.close} onClick={() => setModal(null)}>×</button></div>
        {(selected.sizes ?? []).length > 0 && <><div style={styles.sectionLabel}>الحجم</div><div style={styles.optionGrid}>{(selected.sizes ?? []).map(s => <button key={s.size} onClick={() => setSelectedSize(s)} style={selectedSize?.size === s.size ? styles.optionActive : styles.option}>{s.size}<b>{s.price} ج</b></button>)}</div></>}
        {modifiers.filter(m => m.product_id === selected.id).length > 0 && <><div style={styles.sectionLabel}>الإضافات</div><div style={styles.optionList}>{modifiers.filter(m => m.product_id === selected.id).map(m => <label key={m.id} style={styles.mod}><input type="checkbox" checked={selectedMods.some(x => x.id === m.id)} onChange={e => setSelectedMods(prev => e.target.checked ? [...prev, m] : prev.filter(x => x.id !== m.id))}/><span>{m.name}{m.is_required ? ' *' : ''}</span><b>+{m.price} ج</b></label>)}</div></>}
        <button style={styles.primary} onClick={addSelected}>إضافة للسلة — {((selectedSize?.price || 0) + selectedMods.reduce((a,m) => a + Number(m.price), 0))} جنيه</button>
      </div>}

      {modal === 'cart' && <div style={styles.modal}><div style={styles.modalHead}><h2>السلة</h2><button style={styles.close} onClick={() => setModal(null)}>×</button></div>{cart.length === 0 ? <div style={styles.empty}>السلة فارغة</div> : <>{cart.map((item, i) => <div key={i} style={styles.cartRow}><div><b>{item.name}</b><div style={styles.sub}>{item.size} {item.modifiers.length ? `• ${item.modifiers.map(m => m.name).join('، ')}` : ''}</div><div>{item.price} ج × {item.qty}</div></div><div style={styles.qty}><button onClick={() => change(item, -1)}>−</button><b>{item.qty}</b><button onClick={() => change(item, 1)}>+</button></div></div>)}<div style={styles.total}>الإجمالي <b>{total} جنيه</b></div><button style={styles.primary} onClick={() => setModal('checkout')}>متابعة الطلب</button></>}</div>}

      {modal === 'checkout' && <div style={styles.modal}><div style={styles.modalHead}><div><div style={styles.kicker}>تأكيد الطلب</div><h2>إرسال للمطبخ</h2></div><button style={styles.close} onClick={() => setModal(null)}>×</button></div><div style={styles.notice}>{tableNumber ? `الطلب للطاولة رقم ${tableNumber}` : 'للطلب داخل المطعم، افتح الرابط مع رقم الطاولة مثل ?table=5'}</div><input style={styles.input} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم العميل (اختياري)"/><div style={styles.total}>الإجمالي <b>{total} جنيه</b></div>{tableNumber ? <button disabled={busy} style={styles.primary} onClick={submitDineIn}>{busy ? 'جارٍ إرسال الطلب…' : 'إرسال الطلب للمطبخ'}</button> : <div style={styles.notice}>التوصيل سيظل عبر مسار Delivery الحالي. لم أغيّر هذا المسار أثناء إصلاح القائمة.</div>}</div>}

      {modal === 'success' && <div style={styles.modal}><div style={styles.success}>✓</div><h2 style={{textAlign:'center'}}>تم إرسال طلبك للمطبخ</h2><p style={styles.centerText}>الطاولة رقم {tableNumber} — تم تسجيل الطلب داخل النظام.</p>{lastOrder?.token && <div style={styles.track}>رقم التتبع: <code>{lastOrder.token}</code></div>}<button style={styles.primary} onClick={() => setModal(null)}>العودة للقائمة</button></div>}
    </div>}
  </main>
}

const styles: Record<string, React.CSSProperties> = {
  page:{minHeight:'100vh',padding:'24px 18px 70px',background:'radial-gradient(circle at 85% 0%,#3b2d0b 0,#0b0c0e 28%),#0b0c0e',color:'#f7f1e5',fontFamily:'Cairo,Arial,sans-serif'},
  header:{maxWidth:1180,margin:'0 auto 22px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16},brand:{display:'flex',alignItems:'center',gap:12},logo:{width:52,height:52,borderRadius:17,display:'grid',placeItems:'center',background:'#191a1e',border:'1px solid #5d4a18',fontSize:25},kicker:{fontSize:11,fontWeight:900,letterSpacing:1.7,color:'#d4af37'},title:{margin:'2px 0',fontSize:'clamp(24px,4vw,36px)',fontWeight:900},muted:{color:'#aaa49a',fontSize:13},cartBtn:{border:0,borderRadius:14,padding:'12px 17px',background:'#d4af37',color:'#111',fontWeight:900,cursor:'pointer'},hero:{maxWidth:1180,margin:'0 auto 20px',padding:28,borderRadius:28,border:'1px solid #5d4a18',background:'linear-gradient(135deg,#191a1e,#25211a)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:20},heroTitle:{fontSize:'clamp(32px,6vw,52px)',margin:'5px 0',fontWeight:900},heroText:{color:'#b4aea3',lineHeight:1.9,maxWidth:650},pills:{display:'flex',flexWrap:'wrap',gap:8},pillsSpan:{},heroCount:{minWidth:130,padding:20,borderRadius:20,background:'#111216',border:'1px solid #3b3422',display:'flex',flexDirection:'column',alignItems:'center'},categories:{maxWidth:1180,margin:'0 auto 18px',display:'flex',gap:9,overflowX:'auto',paddingBottom:5},pill:{whiteSpace:'nowrap',border:'1px solid #34363b',background:'#17181c',color:'#aaa49a',padding:'10px 16px',borderRadius:999,fontWeight:800,cursor:'pointer'},activePill:{whiteSpace:'nowrap',border:'1px solid #d4af37',background:'#d4af37',color:'#111',padding:'10px 16px',borderRadius:999,fontWeight:900,cursor:'pointer'},grid:{maxWidth:1180,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:16},card:{overflow:'hidden',borderRadius:24,background:'linear-gradient(145deg,#181a1e,#111216)',border:'1px solid #292b30',boxShadow:'0 15px 45px #0006'},image:{height:185,position:'relative',display:'grid',placeItems:'center',background:'radial-gradient(circle,#3a2d12,#202126 58%,#15161a)',fontSize:64},priceChip:{position:'absolute',right:12,bottom:12,padding:'7px 10px',borderRadius:11,background:'#111d',border:'1px solid #fff2',fontWeight:900},cardBody:{padding:18},tag:{fontSize:11,color:'#d4af37',fontWeight:900},sub:{fontSize:12,color:'#99948b',marginTop:4},sizePreview:{display:'flex',flexWrap:'wrap',gap:6,margin:'12px 0'},sizePreviewSpan:{},addBtn:{width:'100%',border:0,borderRadius:13,padding:12,background:'#d4af37',color:'#111',fontWeight:900,cursor:'pointer'},overlay:{position:'fixed',inset:0,zIndex:100,background:'#000b',backdropFilter:'blur(7px)',display:'grid',placeItems:'center',padding:16},modal:{width:'min(620px,100%)',maxHeight:'92vh',overflow:'auto',padding:22,borderRadius:25,background:'linear-gradient(145deg,#181a1e,#111216)',border:'1px solid #5d4a18',boxShadow:'0 25px 80px #000a'},modalHead:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10},close:{width:40,height:40,borderRadius:'50%',border:'1px solid #444',background:'transparent',color:'#fff',fontSize:24,cursor:'pointer'},sectionLabel:{margin:'20px 0 8px',fontWeight:900},optionGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8},option:{padding:12,borderRadius:14,border:'1px solid #36383d',background:'#202329',color:'#eee',display:'flex',justifyContent:'space-between',cursor:'pointer'},optionActive:{padding:12,borderRadius:14,border:'1px solid #d4af37',background:'#d4af37',color:'#111',display:'flex',justifyContent:'space-between',cursor:'pointer'},optionList:{display:'grid',gap:8},mod:{display:'flex',alignItems:'center',gap:10,padding:13,borderRadius:14,border:'1px solid #36383d',background:'#202329',cursor:'pointer'},primary:{width:'100%',marginTop:16,padding:14,border:0,borderRadius:14,background:'#d4af37',color:'#111',fontWeight:900,cursor:'pointer'},cartRow:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'13px 0',borderBottom:'1px solid #2b2d32'},qty:{display:'flex',alignItems:'center',gap:8},qtyButton:{width:34,height:34},total:{display:'flex',justifyContent:'space-between',padding:'18px 0',fontSize:19,fontWeight:900},empty:{padding:45,textAlign:'center',color:'#aaa49a'},notice:{padding:14,borderRadius:14,background:'#24262b',color:'#c9c3b8',lineHeight:1.8},input:{width:'100%',marginTop:12,padding:14,borderRadius:14,border:'1px solid #3b3d42',background:'#202329',color:'#fff',outline:'none'},success:{width:70,height:70,margin:'0 auto 15px',borderRadius:'50%',display:'grid',placeItems:'center',background:'#183a22',color:'#8fe0a0',fontSize:38,fontWeight:900},centerText:{textAlign:'center',color:'#aaa49a',lineHeight:1.8},track:{marginTop:15,padding:12,borderRadius:12,background:'#202329',fontSize:12,wordBreak:'break-all'},center:{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'#0b0c0e',color:'#fff'},loader:{padding:25,borderRadius:18,background:'#17181c',fontWeight:800},error:{width:'min(620px,100%)',padding:28,borderRadius:22,background:'#17181c',border:'1px solid #5a2929',display:'grid',gap:12,textAlign:'center'},errorButton:{},}
