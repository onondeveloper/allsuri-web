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
      return NextResponse.json(
        { error: `견적 저장 실패: ${orderError.message}` },
        { status: 500 }
      )
    }

    const orderId = (order as { id: string }).id

    // ── 2. marketplace_listings 에도 저장 ────────────────────────────
    // 사업자가 앱 오더 목록에서 볼 수 있도록
    // posted_by = null 허용 → DB에서 ALTER COLUMN posted_by DROP NOT NULL 필수
    const listingPayload = {
      title,
      description: description + (customerName ? `\n\n[웹 고객: ${customerName}]` : ''),
      posted_by: null,
      status: 'open',
      region: address,
      category,
      budget_amount: 0,
      media_urls: imageUrls || [],
      createdat: now,
      updatedat: now,
      web_order_id: orderId,
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('marketplace_listings')
      .insert(listingPayload)
      .select('id')
      .single()

    if (listingError) {
      // web_order_id 컬럼 미존재 시 (SQL 미실행) → 없이 재시도
      if (
        listingError.code === '42703' ||
        listingError.message?.includes('web_order_id') ||
        listingError.message?.includes('column')
      ) {
        const { web_order_id: _omit, ...payloadWithoutWebOrderId } = listingPayload
        const { data: listing2, error: listingError2 } = await supabaseAdmin
          .from('marketplace_listings')
          .insert(payloadWithoutWebOrderId)
          .select('id')
          .single()

        if (listingError2) {
          // marketplace_listings 저장 실패 → orders는 저장됐지만 앱에 표시 안 됨
          console.error('[submit] marketplace_listings 저장 실패 (fallback):', listingError2)
          // orders는 성공했으므로 partial success 반환 (고객 견적은 접수됨)
          return NextResponse.json({
            success: true,
            orderId,
            listingId: null,
            warning: `앱 오더 등록 실패 (DB SQL 실행 필요): ${listingError2.message}`,
          })
        }

        const listingId = (listing2 as { id: string } | null)?.id ?? null
        return NextResponse.json({
          success: true,
          orderId,
          listingId,
          message: '견적 요청이 접수되었습니다.',
        })
      }

      // posted_by NOT NULL 등 다른 에러
      console.error('[submit] marketplace_listings 저장 실패:', listingError)
      return NextResponse.json({
        success: true,
        orderId,
        listingId: null,
        warning: `앱 오더 등록 실패 (DB 설정 필요): ${listingError.message}`,
      })
    }

    const listingId = (listing as { id: string } | null)?.id ?? null

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
