'use client'

import { useMemo, useState } from 'react'

type Size = { size: string; price: number }
type Product = {
  id: string
  name: string
  price: number
  sizes: Size[] | null
  category_id: string
  is_available: boolean
}
type Category = { id: string; name: string }
type Subcategory = { id: string; category_id: string; name: string }

export default function MenuClient({
  restaurantName,
  products,
  categories,
  subcategories,
}: {
  restaurantName: string
  products: Product[]
  categories: Category[]
  subcategories: Subcategory[]
}) {
  const [active, setActive] = useState('all')
  const [query, setQuery] = useState('')

  const subToCategory = useMemo(
    () => new Map(subcategories.map((s) => [s.id, s.category_id])),
    [subcategories]
  )

  const categoryForProduct = (p: Product) => subToCategory.get(p.category_id) ?? ''

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const categoryMatch = active === 'all' || categoryForProduct(p) === active
      const textMatch = !q || p.name.toLowerCase().includes(q)
      return p.is_available && categoryMatch && textMatch
    })
  }, [products, active, query, subToCategory])

  return (
    <main className="min-h-screen bg-[#0d0e10] text-[#f6f1e7]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0e10]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="text-[11px] font-bold tracking-[0.25em] text-[#d4af37]">RESTAURANT OS</div>
            <h1 className="mt-1 text-xl font-black md:text-2xl">{restaurantName}</h1>
          </div>
          <div className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-bold text-[#d4af37]">
            {products.length} منتج
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-6 pt-8">
        <div className="overflow-hidden rounded-[30px] border border-[#d4af37]/25 bg-gradient-to-br from-[#1b1d21] to-[#111214] p-6 shadow-2xl md:p-10">
          <div className="max-w-3xl">
            <div className="text-xs font-black tracking-[0.22em] text-[#d4af37]">DIGITAL MENU</div>
            <h2 className="mt-2 text-4xl font-black leading-tight md:text-6xl">قائمة المطعم</h2>
            <p className="mt-4 text-sm leading-8 text-[#a9a39a] md:text-base">
              تصفح الفطير والبيتزا والكريب وباقي الأصناف من القائمة الحالية المتصلة مباشرة بقاعدة البيانات.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full rounded-2xl border border-white/10 bg-[#17191d] px-4 py-3 text-sm outline-none placeholder:text-[#777] focus:border-[#d4af37]/50"
          />
          <div className="flex items-center rounded-2xl border border-white/10 bg-[#17191d] px-4 py-3 text-sm font-bold text-[#d4af37] md:w-auto">
            {visible.length} نتيجة
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActive('all')}
            className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-black ${active === 'all' ? 'bg-[#d4af37] text-black' : 'border border-white/10 bg-[#17191d] text-[#a9a39a]'}`}
          >
            الكل
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActive(category.id)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-black ${active === category.id ? 'bg-[#d4af37] text-black' : 'border border-white/10 bg-[#17191d] text-[#a9a39a]'}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((product) => (
            <article key={product.id} className="rounded-3xl border border-white/10 bg-[#17191d] p-5 shadow-xl transition hover:-translate-y-1 hover:border-[#d4af37]/30">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-black leading-8">{product.name}</h3>
                <span className="shrink-0 rounded-xl bg-[#d4af37]/10 px-2.5 py-1 text-xs font-black text-[#d4af37]">متاح</span>
              </div>
              <div className="mt-4 space-y-2">
                {(product.sizes?.length ? product.sizes : [{ size: 'السعر', price: product.price }]).map((size) => (
                  <div key={`${product.id}-${size.size}`} className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#202329] px-3 py-2.5">
                    <span className="text-sm text-[#a9a39a]">{size.size}</span>
                    <span className="font-black text-[#f6f1e7]">{Number(size.price).toFixed(0)} جنيه</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {!visible.length && (
          <div className="rounded-3xl border border-white/10 bg-[#17191d] p-12 text-center text-[#a9a39a]">
            لا توجد منتجات مطابقة للبحث الحالي.
          </div>
        )}
      </section>
    </main>
  )
}
