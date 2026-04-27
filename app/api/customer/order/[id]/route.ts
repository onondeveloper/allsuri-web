import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, normalizePhone } from '@/lib/supabase-server'

async function verifyOrder(orderId: string, phone: string, password: string) {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
  if (!data) return null
  const storedPhone = normalizePhone(String(data.customerPhone || data.customerphone || ''))
  const storedPwd = String(data.webPassword || data.webpassword || '')
  if (storedPhone !== normalizePhone(phone)) return null
  if (storedPwd !== String(password).trim()) return null
  return data
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const phone = normalizePhone(req.nextUrl.searchParams.get('phone') || '')
  const password = req.nextUrl.searchParams.get('pwd') || ''

  if (!phone || !password) return NextResponse.json({ error: '인증 정보가 필요합니다.' }, { status: 401 })

  const order = await verifyOrder(orderId, phone, password)
  if (!order) return NextResponse.json({ error: '인증 실패 또는 주문을 찾을 수 없습니다.' }, { status: 401 })

  // PostgreSQL은 컬럼명을 소문자로 반환하므로 camelCase와 lowercase 모두 확인
  const isOrderAwarded = !!(order.isAwarded ?? order.isawarded)

  // 연결된 marketplace_listing 조회 (web_order_id 컬럼이 있는 경우)
  let listingId: string | null = null
  try {
    const { data: listing } = await supabaseAdmin
      .from('marketplace_listings')
      .select('id, status, bid_count, selected_bidder_id')
      .eq('web_order_id', orderId)
      .maybeSingle()
    listingId = listing?.id || null
  } catch { /* web_order_id 컬럼 없으면 무시 */ }

  // 입찰 목록: marketplace_listing의 order_bids 우선 사용 (B2B와 동일 흐름)
  type BidRow = {
    id: string; bidder_id: string; message: string | null
    status: string; bid_amount: number | null; estimated_days: number | null; created_at: string
  }
  let bids: BidRow[] = []
  if (listingId) {
    const query = supabaseAdmin
      .from('order_bids')
      .select('id, bidder_id, message, status, bid_amount, estimated_days, created_at')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: true })
    // 낙찰 후에는 선택된 입찰만 조회 (rejected/pending 숨김)
    const { data: bidsData } = isOrderAwarded
      ? await query.eq('status', 'selected')
      : await query
    bids = (bidsData || []) as BidRow[]
  }

  // 입찰자 사업자 정보 조회
  const bidderIds = [...new Set(bids.map(b => b.bidder_id).filter(Boolean))]
  type UserRow = {
    id: string; name: string; businessname: string; category: string; region: string
    description: string | null; avatar_url: string | null
    businessnumber: string | null; jobs_accepted_count: number | null
  }
  let biddersMap: Record<string, UserRow> = {}
  if (bidderIds.length > 0) {
    const { data: bidders } = await supabaseAdmin
      .from('users')
      .select('id, name, businessname, category, region, description, avatar_url, businessnumber, jobs_accepted_count')
      .in('id', bidderIds)
    ;(bidders || []).forEach((b: UserRow) => { biddersMap[b.id] = b })
  }

  const estimates = bids.map(b => {
    const biz = biddersMap[b.bidder_id] || {} as UserRow
    return {
      id: b.id,
      businessId: b.bidder_id,
      businessName: biz.businessname || biz.name || '사업자',
      equipmentType: biz.category || '',
      region: biz.region || '',
      bizDescription: biz.description || '',
      avatarUrl: biz.avatar_url || null,
      hasBusinessReg: !!(biz.businessnumber && biz.businessnumber.trim()),
      jobsCount: biz.jobs_accepted_count || 0,
      amount: b.bid_amount || 0,
      description: b.message || '',
      estimatedDays: b.estimated_days || 0,
      createdAt: b.created_at,
      status: b.status,
      isAwarded: b.status === 'selected',
      isBid: true,
    }
  })

  // 낙찰 사업자
  let awardedBusiness = null
  const techId = order.technicianId || order.technicianid
  if (techId) {
    const { data: biz } = await supabaseAdmin
      .from('users')
      .select('id, name, businessname, phonenumber, category, region, description, profile_image_url, projects_awarded_count')
      .eq('id', techId)
      .single()
    awardedBusiness = biz
  }

  return NextResponse.json({
    order: {
      id: order.id, title: order.title, description: order.description,
      status: order.status, category: order.category, address: order.address,
      visitDate: order.visitDate || order.visitdate,
      createdAt: order.createdAt || order.createdat,
      isAwarded: isOrderAwarded,
      awardedEstimateId: order.awardedEstimateId || order.awardedestimatedid,
      images: order.images || [],
      adminRating: order.adminRating || order.adminrating,
      adminRatingComment: order.adminRatingComment || order.adminratingcomment,
      matchedJobId: order.matchedJobId || order.matchedjobid,
      listingId,
    },
    estimates,
    awardedBusiness,
  })
}
