'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const navItems = [
  { href: '/admin', label: '대시보드', icon: '📊' },
  { href: '/admin/orders', label: '견적 현황', icon: '📋' },
  { href: '/admin/community', label: '커뮤니티 관리', icon: '💬' },
  { href: '/admin/ads', label: '광고 관리', icon: '📢' },
]

export default function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔧</span>
          <span className="font-bold text-white">올수리 관리자</span>
        </div>
        <p className="text-xs text-gray-400 mt-1 truncate">{userName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>🚪</span>
          로그아웃
        </button>
        <Link
          href="/"
          target="_blank"
          className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>🌐</span>
          사이트 보기
        </Link>
      </div>
    </aside>
  )
}
