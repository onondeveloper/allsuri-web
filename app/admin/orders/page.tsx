import { createSupabaseServerClient } from '@/lib/supabase-server'
import OrdersClient from './OrdersClient'

export const revalidate = 0

export default async function AdminOrdersPage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('orders')
    .select('id, title, description, address, "visitDate", status, category, "customerName", "customerPhone", "customerEmail", "isAnonymous", "createdAt", images')
    .order('"createdAt"', { ascending: false })
    .limit(200)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">견적 현황</h1>
        <span className="text-sm text-gray-400">총 {(data || []).length}건</span>
      </div>
      <OrdersClient initialOrders={(data || []) as Parameters<typeof OrdersClient>[0]['initialOrders']} />
    </div>
  )
}
