import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, normalizePhone } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json()
    if (!phone || !password) {
      return NextResponse.json({ error: '전화번호와 비밀번호를 입력해 주세요.' }, { status: 400 })
    }
    const normalPhone = normalizePhone(phone)

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, title, status, category, address, createdAt, isAnonymous, isAwarded, visitDate')
      .order('createdAt', { ascending: false })
      .limit(200)

    if (error) throw error

    const matched = (orders || []).filter((o: Record<string, unknown>) => {
      const p = normalizePhone(String(o.customerPhone || o.customerphone || ''))
      const pwd = String(o.webPassword || o.webpassword || '')
      return p === normalPhone && pwd === String(password).trim()
    })

    if (!matched.length) {
      return NextResponse.json(
        { error: '일치하는 견적 요청을 찾을 수 없습니다.\n전화번호와 비밀번호를 확인해 주세요.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      orders: matched.map((o: Record<string, unknown>) => ({
        id: o.id,
        title: o.title,
        status: o.status,
        category: o.category,
        address: o.address,
        createdAt: o.createdAt || o.createdat,
        isAwarded: o.isAwarded ?? false,
        visitDate: o.visitDate || o.visitdate,
      })),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: '서버 오류: ' + msg }, { status: 500 })
  }
}
