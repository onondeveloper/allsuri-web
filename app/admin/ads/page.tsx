import { createSupabaseServerClient } from '@/lib/supabase-server'
import AdsClient from './AdsClient'

export const revalidate = 0

export default async function AdminAdsPage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('ads')
    .select('id, title, image_url, link_url, is_active, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">광고 관리</h1>
        <span className="text-sm text-gray-400">총 {(data || []).length}개</span>
      </div>
      <AdsClient initialAds={(data || []) as Parameters<typeof AdsClient>[0]['initialAds']} />
    </div>
  )
}
