import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

async function getStats() {
  const supabase = await createSupabaseServerClient()
  const [orders, posts, businesses, ads] = await Promise.all([
    supabase.from('orders').select('id, status, "isAnonymous", "createdAt"', { count: 'exact', head: false })
      .order('"createdAt"', { ascending: false }).limit(5),
    supabase.from('community_posts').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true })
      .eq('role', 'business').eq('businessstatus', 'approved'),
    supabase.from('ads').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])
  return {
    recentOrders: orders.data || [],
    totalOrders: orders.count ?? 0,
    totalPosts: posts.count ?? 0,
    totalBusinesses: businesses.count ?? 0,
    totalAds: ads.count ?? 0,
  }
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:     { label: '접수', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: '진행중', color: 'bg-blue-100 text-blue-700' },
  completed:   { label: '완료', color: 'bg-green-100 text-green-700' },
  cancelled:   { label: '취소', color: 'bg-red-100 text-red-700' },
}

export default async function AdminDashboard() {
  const stats = await getStats()

  const statCards = [
    { label: '전체 견적 접수', value: stats.totalOrders, icon: '📋', href: '/admin/orders', color: 'blue' },
    { label: '등록 사업자', value: stats.totalBusinesses, icon: '🏪', href: '/business', color: 'green' },
    { label: '커뮤니티 게시글', value: stats.totalPosts, icon: '💬', href: '/admin/community', color: 'purple' },
    { label: '활성 광고', value: stats.totalAds, icon: '📢', href: '/admin/ads', color: 'orange' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <Link key={card.href} href={card.href}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-0.5">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">최근 견적 접수</h2>
          <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">전체 보기 →</Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">접수된 견적이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">제목</th>
                  <th className="text-left py-2 text-gray-500 font-medium">상태</th>
                  <th className="text-left py-2 text-gray-500 font-medium">접수일</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order: Record<string, unknown>) => {
                  const s = STATUS_LABEL[order.status as string] || { label: String(order.status), color: 'bg-gray-100 text-gray-600' }
                  const date = order['createdAt']
                    ? new Date(order['createdAt'] as string).toLocaleDateString('ko-KR')
                    : '-'
                  return (
                    <tr key={order.id as string} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 text-gray-800 max-w-xs truncate">{String(order.title || '-')}</td>
                      <td className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                      </td>
                      <td className="py-2.5 text-gray-400 text-xs">{date}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
