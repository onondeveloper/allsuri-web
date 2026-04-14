import { createSupabaseServerClient } from '@/lib/supabase-server'
import CommunityClient from './CommunityClient'

export const revalidate = 0

export default async function AdminCommunityPage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('community_posts')
    .select('id, title, content, authorid, author_name, tags, upvotes, commentscount, createdat')
    .order('createdat', { ascending: false })
    .limit(100)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">커뮤니티 관리</h1>
        <span className="text-sm text-gray-400">총 {(data || []).length}개 게시글</span>
      </div>
      <CommunityClient initialPosts={(data || []) as Parameters<typeof CommunityClient>[0]['initialPosts']} />
    </div>
  )
}
