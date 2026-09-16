import MenuClient from './menu-client'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = 'https://znnnkoujfuweydvbkejh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpubm5rb3VqZnV3ZXlkdmJrZWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5ODA4NjQsImV4cCI6MjEwNDU1Njg2NH0.sg_WW8__dL0NO9aqJU2d_9oYmLUIdLb4C1QT1xHecPw'

async function supabaseFetch(path: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`)
  return response.json()
}

export default async function Page() {
  const [restaurants, products, categories, subcategories] = await Promise.all([
    supabaseFetch('restaurants?select=id,name&limit=1'),
    supabaseFetch('products?select=id,name,price,sizes,category_id,is_available,created_at&order=created_at.asc'),
    supabaseFetch('categories?select=id,name'),
    supabaseFetch('subcategories?select=id,category_id,name'),
  ])

  const restaurantName = restaurants?.[0]?.name || 'Restaurant OS'

  return (
    <MenuClient
      restaurantName={restaurantName}
      products={products}
      categories={categories}
      subcategories={subcategories}
    />
  )
}
