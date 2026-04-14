import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const metadata: Metadata = {
  title: '전문 사업자 찾기 | 올수리',
  description: '올수리에 등록된 집수리 전문 사업자를 찾아보세요',
}

export const revalidate = 300

type BusinessUser = {
  id: string
  name: string
  businessName?: string
  avatarUrl?: string
  address?: string
  serviceAreas?: string[]
  specialties?: string[]
  bio?: string
}

async function getBusinesses(): Promise<BusinessUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, businessname, avatar_url, address, serviceareas, specialties, bio')
    .eq('role', 'business')
    .eq('businessstatus', 'approved')
    .limit(50)

  if (error) return []
  return (data || []).map((u) => ({
    id: u.id,
    name: u.name || '사업자',
    businessName: u.businessname,
    avatarUrl: u.avatar_url,
    address: u.address,
    serviceAreas: u.serviceareas,
    specialties: u.specialties,
  }))
}

export default async function BusinessPage() {
  const businesses = await getBusinesses()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">전문 사업자 찾기</h1>
          <p className="text-gray-500 text-sm mt-1">
            올수리에 등록된 전문 업체 <span className="font-semibold text-blue-600">{businesses.length}곳</span>
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {businesses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🏪</div>
            <p className="text-lg font-medium">등록된 사업자가 없습니다</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((b) => (
              <Link
                key={b.id}
                href={`/business/${b.id}`}
                className="bg-white rounded-2xl border border-gray-100 hover:border-blue-300 hover:shadow-md p-5 transition-all block"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg overflow-hidden flex-shrink-0">
                    {b.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.avatarUrl} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      (b.businessName || b.name)[0]
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {b.businessName || b.name}
                    </div>
                    {b.address && (
                      <div className="text-xs text-gray-400 truncate">{b.address}</div>
                    )}
                  </div>
                </div>

                {b.specialties && b.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {b.specialties.slice(0, 4).map((s) => (
                      <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {b.serviceAreas && b.serviceAreas.length > 0 && (
                  <div className="text-xs text-gray-400">
                    📍 {b.serviceAreas.slice(0, 3).join(', ')}
                    {b.serviceAreas.length > 3 && ` 외 ${b.serviceAreas.length - 3}곳`}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 bg-blue-600 rounded-2xl p-6 text-white text-center">
          <h3 className="font-bold text-lg mb-1">지금 바로 무료 견적 받기</h3>
          <p className="text-blue-100 text-sm mb-4">위 사업자들에게 한 번에 견적을 요청하세요</p>
          <Link
            href="/requests"
            className="inline-block bg-white text-blue-600 font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-sm"
          >
            무료 견적 요청하기 →
          </Link>
        </div>
      </div>
    </div>
  )
}
