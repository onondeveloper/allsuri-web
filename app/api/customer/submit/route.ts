import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// 고객 견적 폼 제출:
// 1. orders 테이블에 저장 (B2C 고객 레코드)
// 2. marketplace_listings 테이블에도 저장 (B2B와 동일한 앱 오더 목록)
// → 사업자가 앱에서 오더를 보고 입찰할 수 있음

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      title, description, address, addressDetail,
      visitDate, category, customerName, customerPhone,
      customerEmail, pin, imageUrls,
    } = body

    if (!title || !category || !address || !visitDate || !customerName || !customerPhone) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
    }
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: '4자리 숫자 비밀번호가 필요합니다.' }, { status: 400 })
    }

    const normalizedPhone = customerPhone.replace(/[-\s]/g, '')
    const fullAddress = addressDetail ? `${address} ${addressDetail}` : address
    const now = new Date().toISOString()

    // ── 1. orders 테이블에 저장 ──────────────────────────────────────
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        title,
        description,
        address: fullAddress,
        visitDate,
        status: 'pending',
        category,
        customerName,
        customerPhone: normalizedPhone,
        customerEmail: customerEmail || null,
        isAnonymous: true,
        images: imageUrls || [],
        webPassword: pin,
        createdAt: now,
      })
      .select('id')
      .single()

    if (orderError) {
      console.error('[submit] orders 저장 실패:', orderError)
      throw new Error(orderError.message)
    }

    const orderId = order.id

    // ── 2. marketplace_listings 에도 동일하게 저장 ───────────────────
    // 사업자가 앱 오더 목록에서 볼 수 있도록
    // posted_by = null (익명 고객), 서비스 롤로 RLS 우회
    const listingPayload: Record<string, unknown> = {
      title,
      description: `${description}${customerName ? `\n\n[고객 이름: ${customerName}]` : ''}`,
      posted_by: null,          // 익명 고객 → null
      status: 'open',           // 바로 입찰 가능
      region: address,          // 지역 = 주소 앞부분
      category,
      budget_amount: 0,
      media_urls: imageUrls || [],
      createdat: now,
      updatedat: now,
    }

    // web_order_id 컬럼이 있으면 연결 (SQL 실행 후)
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('marketplace_listings')
      .insert({ ...listingPayload, web_order_id: orderId })
      .select('id')
      .single()

    let listingId: string | null = null

    if (listingError) {
      // web_order_id 컬럼 미생성 시 컬럼 없이 재시도
      if (listingError.message?.includes('web_order_id') || listingError.code === '42703') {
        const { data: listing2, error: listingError2 } = await supabaseAdmin
          .from('marketplace_listings')
          .insert(listingPayload)
          .select('id')
          .single()
        if (listingError2) {
          console.warn('[submit] marketplace_listings 저장 실패 (무시):', listingError2.message)
        } else {
          listingId = listing2?.id || null
        }
      } else {
        console.warn('[submit] marketplace_listings 저장 실패 (무시):', listingError.message)
      }
    } else {
      listingId = listing?.id || null
    }

    // ── 3. orders 에 listingId 백링크 (있으면) ────────────────────────
    if (listingId) {
      await supabaseAdmin
        .from('orders')
        .update({ matchedJobId: null }) // 초기화 확인용
        .eq('id', orderId)
      // listing_id 컬럼이 있으면 저장 (없어도 무방)
    }

    return NextResponse.json({
      success: true,
      orderId,
      listingId,
      message: '견적 요청이 접수되었습니다.',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[submit] 오류:', msg)
    return NextResponse.json({ error: '서버 오류: ' + msg }, { status: 500 })
  }
}
