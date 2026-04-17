import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, normalizePhone } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const { phone, password, estimateId, businessId } = await req.json()

  if (!phone || !password) return NextResponse.json({ error: '인증 정보가 필요합니다.' }, { status: 401 })
  if (!estimateId || !businessId) return NextResponse.json({ error: '견적 ID와 사업자 ID가 필요합니다.' }, { status: 400 })

  // 주문 인증
  const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single()
  if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  const storedPhone = normalizePhone(String(order.customerPhone || order.customerphone || ''))
  const storedPwd = String(order.webPassword || order.webpassword || '')
  if (storedPhone !== normalizePhone(phone) || storedPwd !== String(password).trim()) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }
  if (order.isAwarded) return NextResponse.json({ error: '이미 낙찰된 요청입니다.' }, { status: 400 })

  const now = new Date().toISOString()

  // 사업자 정보
  const { data: biz } = await supabaseAdmin
    .from('users').select('id, name, businessname').eq('id', businessId).single()
  const bizName = biz?.businessname || biz?.name || '사업자'
  const customerPhone = order.customerPhone || order.customerphone || ''
  const customerName = order.customerName || order.customername || '고객'

  // ── 낙찰 처리: order_bid 방식 (B2B와 동일) ──────────────────────
  // estimateId = order_bid.id (isBid:true인 경우) 또는 estimates.id
  // listingId = marketplace_listing.id (있으면)
  const { listingId, isBid } = body

  let jobId: string | null = null

  if (isBid && listingId) {
    // B2B와 동일 흐름: order_bid 상태 → 'selected'
    // 트리거(handle_bidder_selection)가 자동으로:
    //   - marketplace_listings.status = 'assigned'
    //   - marketplace_listings.claimed_by = bidder_id
    //   - 다른 입찰 → rejected
    await supabaseAdmin
      .from('order_bids')
      .update({ status: 'selected', updated_at: now })
      .eq('id', estimateId)  // estimateId = bidId

    // job 생성 (트리거가 처리 못하는 경우 직접 생성)
    const { data: jobData } = await supabaseAdmin.from('jobs').insert({
      title: order.title || '웹 견적 요청',
      description: `[웹 고객 낙찰]\n요청: ${order.description || ''}\n\n📞 고객: ${customerName} / ${customerPhone}\n📍 주소: ${order.address || ''}`,
      owner_business_id: businessId,
      assigned_business_id: businessId,
      status: 'assigned',
      location: order.address || '',
      category: order.category || '',
      urgency: 'normal',
      budget_amount: 0, awarded_amount: 0, commission_rate: 5,
      created_at: now, updated_at: now,
    }).select('id').maybeSingle()
    jobId = jobData?.id || null

    // marketplace_listing과 job 연결
    if (jobId) {
      await supabaseAdmin
        .from('marketplace_listings')
        .update({ jobid: jobId, updatedat: now })
        .eq('id', listingId)
    }
  } else {
    // 기존 estimates 방식 폴백
    await supabaseAdmin.from('estimates').update({ status: 'awarded', awardedAt: now }).eq('id', estimateId)

    const { data: jobData } = await supabaseAdmin.from('jobs').insert({
      title: order.title || '웹 견적 요청',
      description: `[웹 고객 낙찰]\n요청: ${order.description || ''}\n\n📞 고객: ${customerName} / ${customerPhone}\n📍 주소: ${order.address || ''}`,
      owner_business_id: businessId, assigned_business_id: businessId,
      status: 'assigned', location: order.address || '', category: order.category || '',
      urgency: 'normal', budget_amount: 0, awarded_amount: 0, commission_rate: 5,
      created_at: now, updated_at: now,
    }).select('id').maybeSingle()
    jobId = jobData?.id || null
  }

  // order 낙찰 처리
  await supabaseAdmin.from('orders').update({
    isAwarded: true, awardedAt: now,
    awardedEstimateId: estimateId,
    technicianId: businessId,
    status: 'in_progress',
    ...(jobId ? { matchedJobId: jobId } : {}),
  }).eq('id', orderId)

  // 알림 DB 저장 (Supabase 웹훅 → FCM push)
  await supabaseAdmin.from('notifications').insert({
    userid: businessId,
    title: `🎉 낙찰되었습니다 - ${order.title || '견적 요청'}`,
    body: `📞 고객: ${customerName} / ${customerPhone}\n📍 주소: ${order.address || ''}`,
    type: 'web_order_awarded',
    jobid: jobId,
    isread: false,
    createdat: now,
  })

  return NextResponse.json({ success: true, jobId, message: `${bizName}에게 낙찰되었습니다.` })
}
