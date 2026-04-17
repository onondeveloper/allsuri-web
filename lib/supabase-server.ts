import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── 서버 전용 클라이언트 (RLS bypass, API routes 전용) ────────────
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 세션 기반 서버 클라이언트 (Server Components / admin 페이지용) ─
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component에서는 쿠키 쓰기 불가 (read-only)
        }
      },
    },
  })
}

// ── 현재 로그인한 관리자 정보 반환 ───────────────────────────────
export async function getAdminUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, role, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email ?? '',
    name: profile?.name ?? '',
    role: profile?.role ?? '',
    is_admin: profile?.is_admin ?? false,
  }
}

export function normalizePhone(p: string) {
  return p.replace(/[^0-9]/g, '')
}
