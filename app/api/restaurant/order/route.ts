import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://znnnkoujfuweydvbkejh.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_gjYA4-E-BL0X1hc3YugqyQ_1VaOo_se'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_dine_in_order`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const text = await response.text()
    let data: unknown = null
    try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
    if (!response.ok) return NextResponse.json({ error: typeof data === 'object' && data && 'message' in data ? data.message : text || 'فشل إنشاء الطلب' }, { status: response.status })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'خطأ غير معروف' }, { status: 500 })
  }
}
