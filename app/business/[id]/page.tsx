import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export const revalidate = 300

type Props = { params: Promise<{ id: string }> }

async function getBusiness(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, businessname, avatar_url, address, serviceareas, specialties, bio, createdat')
    .eq('id', id)
    .eq('role', 'business')
    .single()
  if (error || !data) return null
  return data
}

async function getReviews(businessId: string) {
  const { data } = await supabase
    .from('business_reviews')
    .select('id, reviewer_name, rating, content, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(10)
  return data || []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const b = await getBusiness(id)
  return {
    title: b ? `${b.businessname || b.name} | 올수리 사업자` : '사업자 프로필 | 올수리',
  }
}

export default async function BusinessProfilePage({ params }: Props) {
  const { id } = await params
  const b = await getBusiness(id)
  if (!b) notFound()

  const reviews = await getReviews(id)
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.rating as number) || 0), 0) / reviews.length
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/business" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← 사업자 목록
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl overflow-hidden flex-shrink-0">
              {b.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.avatar_url} alt={b.name} className="w-full h-full object-cover" />
              ) : (
                (b.businessname || b.name)[0]
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{b.businessname || b.name}</h1>
              {b.address && (
                <div className="text-sm text-gray-400 mt-0.5">📍 {b.address}</div>
              )}
              {avgRating !== null && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-sm font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-gray-400">({reviews.length}개 리뷰)</span>
                </div>
              )}
            </div>
          </div>

          {b.bio && (
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">{b.bio}</p>
          )}

          {b.specialties && b.specialties.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-500 mb-2">전문 분야</div>
              <div className="flex flex-wrap gap-1.5">
                {b.specialties.map((s: string) => (
                  <span key={s} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {b.serviceareas && b.serviceareas.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-500 mb-2">서비스 지역</div>
              <div className="flex flex-wrap gap-1.5">
                {b.serviceareas.map((area: string) => (
                  <span key={area} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    📍 {area}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-blue-600 rounded-2xl p-5 text-white text-center mb-6">
          <h3 className="font-semibold mb-1">이 업체에 견적 요청하기</h3>
          <p className="text-blue-100 text-sm mb-3">무료로 견적을 받아보세요</p>
          <Link
            href="/requests"
            className="inline-block bg-white text-blue-600 font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-sm"
          >
            견적 요청하기 →
          </Link>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">고객 후기 {reviews.length}개</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">아직 후기가 없습니다</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r: Record<string, unknown>) => (
                <div key={r.id as string} className="border-b border-gray-50 pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-700">{(r.reviewer_name as string) || '익명'}</span>
                    <span className="text-yellow-400 text-sm">{'★'.repeat(r.rating as number || 5)}</span>
                  </div>
                  <p className="text-sm text-gray-600">{r.content as string}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
