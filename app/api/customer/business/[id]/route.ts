import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bizId } = await params
  if (!bizId || bizId === 'undefined') {
    return NextResponse.json({ error: '사업자 ID가 필요합니다.' }, { status: 400 })
  }

  // 사업자 기본 정보 (컬럼이 없을 경우를 대비해 최소한의 컬럼만 필수로)
  const { data: biz, error: bizError } = await supabaseAdmin
    .from('users')
    .select('id, name, businessname, phonenumber, category, region, description, profile_image_url, projects_awarded_count')
    .eq('id', bizId)
    .maybeSingle()

  if (bizError) {
    // 컬럼 없음 오류 시 최소 컬럼으로 재시도
    const { data: bizMin } = await supabaseAdmin
      .from('users')
      .select('id, name, businessname, phonenumber, category, region, description')
      .eq('id', bizId)
      .maybeSingle()

    if (!bizMin) return NextResponse.json({ error: '사업자를 찾을 수 없습니다.' }, { status: 404 })

    return NextResponse.json({ business: bizMin, reviews: [], avgRating: null })
  }

  if (!biz) return NextResponse.json({ error: '사업자를 찾을 수 없습니다.' }, { status: 404 })

  // 리뷰 (없어도 진행)
  let reviewList: { id: string; rating: number | null; comment: string | null; is_admin_review: boolean | null; created_at: string }[] = []
  try {
    const { data: reviews } = await supabaseAdmin
      .from('business_reviews')
      .select('id, rating, comment, is_admin_review, created_at')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false })
      .limit(20)
    reviewList = reviews || []
  } catch { /* business_reviews 테이블 없거나 접근 불가 → 빈 배열 */ }

  const avgRating = reviewList.length
    ? Math.round((reviewList.reduce((s, r) => s + (r.rating || 0), 0) / reviewList.length) * 10) / 10
    : null

  return NextResponse.json({ business: biz, reviews: reviewList, avgRating })
}
