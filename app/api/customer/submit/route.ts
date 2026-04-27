import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// 고객 견적 폼 제출:
// 1. orders 테이블에 저장 (B2C 고객 레코드)
// 2. marketplace_listings 테이블에도 저장 (B2B와 동일한 앱 오더 목록)
// 3. 모든 사업자에게 DB 알림 저장 + FCM 푸시 발송
//    → notifications-send-bulk 함수에 위임 (배치 처리, 독립 실행)
//    → fire-and-forget: 메인 응답 반환 후 비동기로 실행

const ALLSURIAPP_API_URL = process.env.ALLSURIAPP_API_URL || 'https://api.allsuri.app'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function broadcastNewWebOrder(listingId: string, title: string, category: string, address: string) {
  try {
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(500)

    if (usersError || !allUsers || allUsers.length === 0) {
      console.warn('[submit] 사업자 목록 조회 실패:', usersError?.message)
      return
    }

    const regionShort = address.split(' ').slice(0, 2).join(' ')
    const userIds = allUsers.map((u: { id: string }) => u.id)
    const pushTitle = '새 고객 오더 등록'
    const pushBody = `[${category}] ${title} · ${regionShort}`

    console.log(`[submit] broadcast 시작: ${userIds.length}명, listingId=${listingId}`)

    // notifications-send-bulk 호출 (DB 저장 + FCM 푸시 일괄 발송)
    // allsuriapp Netlify 함수가 독립적으로 처리 → 타임아웃 없음
    const bulkRes = await fetch(
      `${ALLSURIAPP_API_URL}/.netlify/functions/notifications-send-bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userIds,
          title: pushTitle,
          body: pushBody,
          data: { type: 'new_web_order', listingId },
        }),
      }
    )

    if (bulkRes.ok) {
      const result = await bulkRes.json() as { total?: number; sent?: number; failed?: number }
      console.log(`[submit] ✅ broadcast 완료: total=${result.total}, sent=${result.sent}, failed=${result.failed}`)
    } else {
      const errText = await bulkRes.text()
      console.warn(`[submit] ⚠️ broadcast 응답 오류 (${bulkRes.status}): ${errText}`)
      // 폴백: 직접 DB 알림 저장
      await supabaseAdmin.from('notifications').insert(
        userIds.map(uid => ({
          userid: uid, title: pushTitle, body: pushBody,
          type: 'new_web_order', isread: false, createdat: new Date().toISOString(),
        }))
      )
    }
  } catch (e: unknown) {
    console.warn('[submit] broadcast 실패 (무시):', e instanceof Error ? e.message : String(e))
    // 폴백: 직접 DB 알림 저장 시도
    try {
      const { data: users } = await supabaseAdmin.from('users').select('id').limit(500)
      if (users && users.length > 0) {
        const regionShort = address.split(' ').slice(0, 2).join(' ')
        await supabaseAdmin.from('notifications').insert(
          users.map((u: { id: string }) => ({
            userid: u.id, title: '새 고객 오더 등록',
            body: `[${category}] ${title} · ${regionShort}`,
            type: 'new_web_order', isread: false, createdat: new Date().toISOString(),
          }))
        )
      }
    } catch { /* 무시 */ }
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
        // 알림 broadcast: 응답 반환 후 백그라운드 실행 (타임아웃 방지)
        if (listingId) broadcastNewWebOrder(listingId, title, category, fullAddress).catch(() => null)
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

    // ── 3. 사업자 알림 DB 저장 (fire-and-forget: 응답 후 백그라운드 실행)
    // await 제거 → 타임아웃 502 방지. DB INSERT만 수행하므로 매우 빠름.
    if (listingId) broadcastNewWebOrder(listingId, title, category, fullAddress).catch(() => null)

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
