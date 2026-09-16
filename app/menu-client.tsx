'use client'

import { useMemo, useState } from 'react'

const RESTAURANT_ID = '02da399f-b12d-480b-bf53-5491bbe8f9e5'

type Size = { size: string; price: number }
type Product = { id: string; name: string; sizes: Size[] | null; subcategory_id: string | null }
type Category = { id: string; name: string }
type Subcategory = { id: string; name: string; category_id: string | null }
type Modifier = { id: string; product_id: string; name: string; price: number; is_required: boolean }
type CartItem = { key: string; id: string; name: string; size: string; price: number; qty: number; modifiers: Modifier[] }

type Props = { products: Product[]; categories: Category[]; subcategories: Subcategory[]; modifiers: Modifier[] }

export default function MenuClient({ products, categories, subcategories, modifiers }: Props) {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const table = params?.get('table')?.match(/^\d+$/)?.[0] ?? null
  const [category, setCategory] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [size, setSize] = useState<Size | null>(null)
  const [selectedMods, setSelectedMods] = useState<Modifier[]>([])
  const [modal, setModal] = useState<'product' | 'cart' | 'checkout' | 'success' | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [busy, setBusy] = useState(false)
  const [orderToken, setOrderToken] = useState('')

  const subMap = useMemo(() => new Map(subcategories.map(x => [x.id, x])), [subcategories])
  const catMap = useMemo(() => new Map(categories.map(x => [x.id, x])), [categories])
  const filtered = useMemo(() => products.filter(p => category === 'all' || subMap.get(p.subcategory_id ?? '')?.category_id === category), [products, category, subMap])
  const total = cart.reduce((s, x) => s + x.price * x.qty, 0)
  const count = cart.reduce((s, x) => s + x.qty, 0)
  const selectedProductModifiers = selected ? modifiers.filter(m => m.product_id === selected.id) : []

  function minPrice(p: Product) {
    const values = (p.sizes ?? []).map(x => Number(x.price)).filter(Number.isFinite)
    return values.length ? Math.min(...values) : 0
  }

  function openProduct(p: Product) {
    const first = p.sizes?.[0] ?? { size: 'عادي', price: minPrice(p) }
    setSelected(p); setSize(first); setSelectedMods([]); setModal('product')
  }

  function addToCart() {
    if (!selected || !size) return
    const required = selectedProductModifiers.filter(m => m.is_required)
    if (required.some(m => !selectedMods.some(x => x.id === m.id))) {
      alert('يرجى اختيار الإضافات المطلوبة أولًا')
      return
    }
    const key = `${selected.id}:${size.size}:${selectedMods.map(x => x.id).sort().join(',')}`
    const price = Number(size.price) + selectedMods.reduce((s, x) => s + Number(x.price), 0)
    setCart(prev => {
      const found = prev.find(x => x.key === key)
      return found ? prev.map(x => x.key === key ? { ...x, qty: Math.min(99, x.qty + 1) } : x) : [...prev, { key, id: selected.id, name: selected.name, size: size.size, price, qty: 1, modifiers: selectedMods }]
    })
    setModal(null)
  }

  function change(key: string, delta: number) {
    setCart(prev => prev.flatMap(x => x.key === key ? (x.qty + delta > 0 ? [{ ...x, qty: Math.min(99, x.qty + delta) }] : []) : [x]))
  }

  function trackingUrl(token: string) {
    return `/track?token=${encodeURIComponent(token)}`
  }

  async function submitOrder() {
    if (!table || !cart.length) return
    setBusy(true)
    try {
      const res = await fetch('/api/restaurant/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        p_restaurant_id: RESTAURANT_ID,
        p_table_number: Number(table),
        p_customer_name: customerName || 'عميل',
        p_items: cart.map(x => ({ product_id: x.id, quantity: x.qty, size: x.size, modifiers: x.modifiers.map(m => ({ id: m.id })) }))
      }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر إرسال الطلب')
      const row = Array.isArray(data) ? data[0] : data
      const token = row?.tracking_token ?? ''
      if (!token) throw new Error('تم إنشاء الطلب لكن لم يتم إنشاء رابط التتبع')
      setOrderToken(token)
      if (typeof window !== 'undefined') localStorage.setItem('ros_last_tracking_token', token)
      setCart([])
      setModal('success')
    } catch (e) {
      alert(`تعذر إرسال الطلب للمطبخ:\n${e instanceof Error ? e.message : 'خطأ غير معروف'}`)
    } finally { setBusy(false) }
  }

  return <main dir="rtl" style={styles.page}>
    <header style={styles.header}>
      <div style={styles.brand}><div style={styles.logo}>🍽️</div><div><div style={styles.kicker}>RESTAURANT OS</div><h1 style={styles.title}>ذا بيتزا برجر كافيه</h1><div style={styles.muted}>{table ? `طلب من الطاولة رقم ${table}` : 'القائمة الرقمية'}</div></div></div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>{typeof window !== 'undefined' && localStorage.getItem('ros_last_tracking_token') && <button style={styles.trackBtn} onClick={() => location.href = trackingUrl(localStorage.getItem('ros_last_tracking_token')!)}>متابعة الطلب</button>}<button style={styles.cartBtn} onClick={() => setModal('cart')}>السلة <b>{count}</b></button></div>
    </header>
    <section style={styles.hero}><div><div style={styles.kicker}>LIVE MENU</div><h2 style={styles.heroTitle}>طعم يستحق التجربة.</h2><p style={styles.heroText}>اختار طلبك، حدد الحجم والإضافات، ثم أرسله مباشرة للمطبخ.</p><div style={styles.pills}><span>✓ {products.length} منتج</span><span>✓ متصل بـ Supabase</span>{table && <span>✓ طاولة {table}</span>}</div></div><div style={styles.heroCount}><strong>{products.length}</strong><small>منتج متاح</small></div></section>
    <div style={styles.categories}><button onClick={() => setCategory('all')} style={category === 'all' ? styles.activePill : styles.pill}>الكل</button>{categories.map(c => <button key={c.id} onClick={() => setCategory(c.id)} style={category === c.id ? styles.activePill : styles.pill}>{c.name}</button>)}</div>
    <section style={styles.grid}>{filtered.map(p => { const sub = subMap.get(p.subcategory_id ?? ''); const cat = sub?.category_id ? catMap.get(sub.category_id) : undefined; return <article key={p.id} style={styles.card}><div style={styles.image}><span>🍕</span><div style={styles.priceChip}>{p.sizes?.length ? `${minPrice(p)} جنيه` : 'السعر غير محدد'}</div></div><div style={styles.cardBody}><div style={styles.tag}>{cat?.name || 'قائمة الطعام'}</div><h3 style={styles.productName}>{p.name}</h3>{sub?.name && <div style={styles.sub}>{sub.name}</div>}<div style={styles.sizePreview}>{(p.sizes ?? []).map(s => <span key={s.size}>{s.size}: {s.price} ج</span>)}</div><button style={styles.addBtn} onClick={() => openProduct(p)}>اختيار وإضافة للسلة</button></div></article> })}</section>

    {modal && <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget && !busy) setModal(null) }}>
      {modal === 'product' && selected && <div style={styles.modal}><div style={styles.modalHead}><div><div style={styles.kicker}>اختيار المنتج</div><h2>{selected.name}</h2></div><button style={styles.close} onClick={() => setModal(null)}>×</button></div><div style={styles.sectionLabel}>الحجم</div><div style={styles.optionGrid}>{(selected.sizes?.length ? selected.sizes : [size!]).map(s => <button key={s.size} onClick={() => setSize(s)} style={size?.size === s.size ? styles.optionActive : styles.option}>{s.size}<b>{s.price} ج</b></button>)}</div>{selectedProductModifiers.length > 0 && <><div style={styles.sectionLabel}>الإضافات</div><div style={styles.optionList}>{selectedProductModifiers.map(m => <label key={m.id} style={styles.mod}><input type="checkbox" checked={selectedMods.some(x => x.id === m.id)} onChange={e => setSelectedMods(v => e.target.checked ? [...v, m] : v.filter(x => x.id !== m.id))}/><span>{m.name}{m.is_required ? ' *' : ''}</span><b>+{m.price} ج</b></label>)}</div></>}<button style={styles.primary} onClick={addToCart}>إضافة للسلة — {((size?.price ?? 0) + selectedMods.reduce((s,m) => s + Number(m.price),0))} جنيه</button></div>}
      {modal === 'cart' && <div style={styles.modal}><div style={styles.modalHead}><h2>السلة</h2><button style={styles.close} onClick={() => setModal(null)}>×</button></div>{cart.length ? <>{cart.map(x => <div key={x.key} style={styles.cartRow}><div><b>{x.name}</b><div style={styles.sub}>{x.size}{x.modifiers.length ? ` • ${x.modifiers.map(m => m.name).join('، ')}` : ''}</div><div>{x.price} ج × {x.qty}</div></div><div style={styles.qty}><button onClick={() => change(x.key,-1)}>−</button><b>{x.qty}</b><button onClick={() => change(x.key,1)}>+</button></div></div>)}<div style={styles.total}>الإجمالي <b>{total} جنيه</b></div><button style={styles.primary} onClick={() => setModal('checkout')}>متابعة الطلب</button></> : <div className="empty" style={styles.empty}>السلة فارغة</div>}</div>}
      {modal === 'checkout' && <div style={styles.modal}><div style={styles.modalHead}><div><div style={styles.kicker}>تأكيد الطلب</div><h2>إرسال للمطبخ</h2></div><button style={styles.close} onClick={() => setModal(null)}>×</button></div><div style={styles.notice}>{table ? `الطلب للطاولة رقم ${table}` : 'للطلب داخل المطعم، افتح الرابط مع رقم الطاولة مثل ?table=5'}</div><input style={styles.input} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم العميل (اختياري)"/><div style={styles.total}>الإجمالي <b>{total} جنيه</b></div>{table ? <button disabled={busy} style={styles.primary} onClick={submitOrder}>{busy ? 'جارٍ إرسال الطلب…' : 'إرسال الطلب للمطبخ'}</button> : <div style={styles.notice}>التوصيل سيظل عبر مسار Delivery الحالي. لم يتم تغيير مسار Delivery أثناء الإصلاح.</div>}</div>}
      {modal === 'success' && <div className="success-modal" style={styles.modal}><div style={styles.success}>✓</div><h2 style={{textAlign:'center'}}>تم إرسال طلبك للمطبخ</h2><p style={styles.centerText}>الطاولة رقم {table} — تم تسجيل الطلب داخل النظام.</p>{orderToken && <div style={styles.track}>رقم التتبع: <code>{orderToken}</code></div>}<button style={styles.primary} onClick={() => location.href = trackingUrl(orderToken)}>متابعة حالة الطلب</button><button style={styles.secondary} onClick={() => setModal(null)}>العودة للقائمة</button></div>}
    </div>}
  </main>
}

const styles: Record<string, React.CSSProperties> = {
  page:{minHeight:'100vh',padding:'24px 18px 70px',background:'radial-gradient(circle at 85% 0%,#3b2d0b 0,#0b0c0e 28%),#0b0c0e',color:'#f7f1e5',fontFamily:'Arial,sans-serif'},header:{maxWidth:1180,margin:'0 auto 22px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16},brand:{display:'flex',alignItems:'center',gap:12},logo:{width:52,height:52,borderRadius:17,display:'grid',placeItems:'center',background:'#191a1e',border:'1px solid #5d4a18',fontSize:25},kicker:{fontSize:11,fontWeight:900,letterSpacing:1.7,color:'#d4af37'},title:{margin:'2px 0',fontSize:'clamp(24px,4vw,36px)',fontWeight:900},muted:{color:'#aaa49a',fontSize:13},cartBtn:{border:0,borderRadius:14,padding:'12px 17px',background:'#d4af37',color:'#111',fontWeight:900,cursor:'pointer'},trackBtn:{border:'1px solid #5d4a18',borderRadius:14,padding:'11px 14px',background:'#191a1e',color:'#d4af37',fontWeight:900,cursor:'pointer'},hero:{maxWidth:1180,margin:'0 auto 20px',padding:28,borderRadius:28,border:'1px solid #5d4a18',background:'linear-gradient(135deg,#191a1e,#25211a)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:20},heroTitle:{fontSize:'clamp(32px,6vw,52px)',margin:'5px 0',fontWeight:900},heroText:{color:'#b4aea3',lineHeight:1.9,maxWidth:650},pills:{display:'flex',flexWrap:'wrap',gap:8},heroCount:{minWidth:130,padding:20,borderRadius:20,background:'#111216',border:'1px solid #3b3422',display:'flex',flexDirection:'column',alignItems:'center'},categories:{maxWidth:1180,margin:'0 auto 18px',display:'flex',gap:9,overflowX:'auto',paddingBottom:5},pill:{whiteSpace:'nowrap',border:'1px solid #34363b',background:'#17181c',color:'#aaa49a',padding:'10px 16px',borderRadius:999,fontWeight:800,cursor:'pointer'},activePill:{whiteSpace:'nowrap',border:'1px solid #d4af37',background:'#d4af37',color:'#111',padding:'10px 16px',borderRadius:999,fontWeight:900,cursor:'pointer'},grid:{maxWidth:1180,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:16},card:{overflow:'hidden',borderRadius:24,background:'linear-gradient(145deg,#181a1e,#111216)',border:'1px solid #292b30',boxShadow:'0 15px 45px #0006'},image:{height:185,position:'relative',display:'grid',placeItems:'center',background:'radial-gradient(circle,#3a2d12,#202126 58%,#15161a)',fontSize:64},priceChip:{position:'absolute',right:12,bottom:12,padding:'7px 10px',borderRadius:11,background:'#111d',border:'1px solid #fff2',fontWeight:900},cardBody:{padding:18},tag:{fontSize:11,color:'#d4af37',fontWeight:900},productName:{margin:'7px 0 0'},sub:{fontSize:12,color:'#99948b',marginTop:4},sizePreview:{display:'flex',flexWrap:'wrap',gap:6,margin:'12px 0'},addBtn:{width:'100%',border:0,borderRadius:13,padding:12,background:'#d4af37',color:'#111',fontWeight:900,cursor:'pointer'},overlay:{position:'fixed',inset:0,zIndex:100,background:'#000b',backdropFilter:'blur(7px)',display:'grid',placeItems:'center',padding:16},modal:{width:'min(620px,100%)',maxHeight:'92vh',overflow:'auto',padding:22,borderRadius:25,background:'linear-gradient(145deg,#181a1e,#111216)',border:'1px solid #5d4a18',boxShadow:'0 25px 80px #000a'},modalHead:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10},close:{width:40,height:40,borderRadius:'50%',border:'1px solid #444',background:'transparent',color:'#fff',fontSize:24,cursor:'pointer'},sectionLabel:{margin:'20px 0 8px',fontWeight:900},optionGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8},option:{padding:12,borderRadius:14,border:'1px solid #36383d',background:'#202329',color:'#eee',display:'flex',justifyContent:'space-between',cursor:'pointer'},optionActive:{padding:12,borderRadius:14,border:'1px solid #d4af37',background:'#d4af37',color:'#111',display:'flex',justifyContent:'space-between',cursor:'pointer'},optionList:{display:'grid',gap:8},mod:{display:'flex',alignItems:'center',gap:10,padding:13,borderRadius:14,border:'1px solid #36383d',background:'#202329',cursor:'pointer'},primary:{width:'100%',marginTop:16,padding:14,border:0,borderRadius:14,background:'#d4af37',color:'#111',fontWeight:900,cursor:'pointer'},secondary:{width:'100%',marginTop:10,padding:13,border:'1px solid #3b3d42',borderRadius:14,background:'transparent',color:'#f7f1e5',fontWeight:900,cursor:'pointer'},cartRow:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'13px 0',borderBottom:'1px solid #2b2d32'},qty:{display:'flex',alignItems:'center',gap:8},total:{display:'flex',justifyContent:'space-between',padding:'18px 0',fontSize:19,fontWeight:900},empty:{padding:45,textAlign:'center',color:'#aaa49a'},notice:{padding:14,borderRadius:14,background:'#24262b',color:'#c9c3b8',lineHeight:1.8},input:{width:'100%',marginTop:12,padding:14,borderRadius:14,border:'1px solid #3b3d42',background:'#202329',color:'#fff',outline:'none'},success:{width:70,height:70,margin:'0 auto 15px',borderRadius:'50%',display:'grid',placeItems:'center',background:'#183a22',color:'#8fe0a0',fontSize:38,fontWeight:900},centerText:{textAlign:'center',color:'#aaa49a',lineHeight:1.8},track:{marginTop:15,padding:12,borderRadius:12,background:'#202329',fontSize:12,wordBreak:'break-all'}
}
