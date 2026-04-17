import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bizId } = await params

  const [{ data: biz }, { data: reviews }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, name, businessname, phonenumber, category, region, description, profile_image_url, projects_awarded_count')
      .eq('id', bizId)
      .single(),
    supabaseAdmin
      .from('business_reviews')
      .select('id, rating, comment, is_admin_review, created_at')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!biz) return NextResponse.json({ error: '사업자를 찾을 수 없습니다.' }, { status: 404 })

  const reviewList = reviews || []
  const avgRating = reviewList.length
    ? Math.round((reviewList.reduce((s, r) => s + (r.rating || 0), 0) / reviewList.length) * 10) / 10
    : null

  return NextResponse.json({ business: biz, reviews: reviewList, avgRating })
}
