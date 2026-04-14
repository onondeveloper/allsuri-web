import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { CommunityPost } from '@/lib/supabase'

export const metadata: Metadata = {
  title: '커뮤니티 | 올수리',
  description: '집수리 경험, 후기, 꿀팁을 나누는 올수리 커뮤니티',
}

export const revalidate = 60

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

async function getPosts(): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, authorid, author_name, title, content, tags, upvotes, commentscount, createdat')
    .order('createdat', { ascending: false })
    .limit(30)

  if (error) return []
  return (data || []) as CommunityPost[]
}

export default async function CommunityPage() {
  const posts = await getPosts()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">커뮤니티</h1>
            <p className="text-gray-500 text-sm mt-1">집수리 경험과 꿀팁을 나눠요</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-lg font-medium">아직 게시글이 없습니다</p>
            <p className="text-sm mt-2">첫 번째 게시글을 작성해보세요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="block bg-white rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-sm p-5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate mb-1">{post.title}</h2>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {post.content}
                    </p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  <span>{post.author_name || '익명'}</span>
                  <span>·</span>
                  <span>{timeAgo(post.createdat)}</span>
                  <span>·</span>
                  <span>👍 {post.upvotes || 0}</span>
                  <span>·</span>
                  <span>💬 {post.commentscount || 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 bg-blue-50 rounded-2xl p-6 text-center border border-blue-100">
          <div className="text-2xl mb-2">📱</div>
          <h3 className="font-semibold text-gray-800 mb-1">게시글 작성은 앱에서</h3>
          <p className="text-sm text-gray-500 mb-4">더 많은 기능은 올수리 앱에서 이용하세요</p>
          <div className="flex justify-center gap-3">
            <a
              href="https://apps.apple.com"
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              App Store
            </a>
            <a
              href="https://play.google.com"
              className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Google Play
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
