import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// 고객 견적 폼 제출:
// 1. orders 테이블에 저장 (B2C 고객 레코드)
// 2. marketplace_listings 테이블에도 저장 (B2B와 동일한 앱 오더 목록)
// 3. 모든 사업자에게 "새 오더 등록" 알림 + push 발송
// → 사업자가 앱에서 오더를 보고 입찰할 수 있음

const SUPABASE_EDGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 모든 사업자에게 알림 + FCM push 발송 (listing 생성 성공 시 호출)
async function broadcastNewWebOrder(listingId: string, title: string, category: string, address: string) {
  try {
    // 모든 앱 사용자(사업자) 조회
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(500)

    if (usersError || !allUsers || allUsers.length === 0) {
      console.warn('[submit] 사업자 목록 조회 실패:', usersError?.message)
      return
    }

    const notifTitle = '새 고객 오더 등록'
    const regionShort = address.split(' ').slice(0, 2).join(' ')
    const notifBody = `[${category}] ${title} · ${regionShort}`
    const now = new Date().toISOString()

    // DB 알림 일괄 저장 (앱 내 알림 뱃지용)
    const notifRows = allUsers.map((u: { id: string }) => ({
      userid: u.id,
      title: notifTitle,
      body: notifBody,
      type: 'new_web_order',
      isread: false,
      createdat: now,
    }))

    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert(notifRows)

    if (notifError) {
      console.warn('[submit] 알림 DB 저장 실패:', notifError.message)
    } else {
      console.log(`[submit] ✅ ${allUsers.length}명에게 알림 DB 저장 완료`)
    }

    // FCM push - fcm_token이 있는 사용자에게만 전송
    const { data: pushUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .not('fcm_token', 'is', null)
      .limit(500)

    if (pushUsers && pushUsers.length > 0) {
      // 최대 100명씩 처리 (병렬 요청 수 제한)
      const BATCH = 20
      for (let i = 0; i < pushUsers.length; i += BATCH) {
        const batch = pushUsers.slice(i, i + BATCH)
        await Promise.allSettled(
          batch.map((u: { id: string }) =>
            fetch(`${SUPABASE_EDGE_URL}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: u.id,
                title: notifTitle,
                body: notifBody,
                data: { type: 'new_web_order', listingId },
              }),
            }).catch(() => null)
          )
        )
      }
      console.log(`[submit] ✅ ${pushUsers.length}명에게 FCM push 전송 완료`)
    }
  } catch (e: unknown) {
    console.warn('[submit] broadcast 알림 실패 (무시):', e instanceof Error ? e.message : String(e))
  }
}

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
          console.error('[submit] marketplace_listings 저장 실패 (fallback):', listingError2)
          return NextResponse.json({
            success: true,
            orderId,
            listingId: null,
            warning: `앱 오더 등록 실패 (DB SQL 실행 필요): ${listingError2.message}`,
          })
        }

        const listingId = (listing2 as { id: string } | null)?.id ?? null
        // 알림 broadcast (listing 생성 성공)
        if (listingId) await broadcastNewWebOrder(listingId, title, category, fullAddress)
        return NextResponse.json({
          success: true, orderId, listingId,
          message: '견적 요청이 접수되었습니다.',
        })
      }

      const errDetail = `code=${listingError.code} msg=${listingError.message} hint=${listingError.hint || ''} details=${listingError.details || ''}`
      console.error('[submit] marketplace_listings 저장 실패:', errDetail)
      return NextResponse.json({
        success: true,
        orderId,
        listingId: null,
        warning: `앱 오더 등록 실패: ${errDetail}`,
      })
    }

    const listingId = (listing as { id: string } | null)?.id ?? null

    // ── 3. 모든 사업자에게 알림 + push 발송 ─────────────────────────
    if (listingId) await broadcastNewWebOrder(listingId, title, category, fullAddress)

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
