import Link from 'next/link'
import Image from 'next/image'
import { supabase, CATEGORIES } from '@/lib/supabase'

const categoryIcons: Record<string, string> = {
  '누수': '💧',
  '화장실': '🚿',
  '배관': '🔩',
  '난방': '🔥',
  '주방': '🍳',
  '리모델링': '🏠',
  '기타': '🛠️',
}

const steps = [
  { num: '01', title: '견적 요청', desc: '어떤 수리가 필요한지\n간단히 입력하세요', icon: '📝' },
  { num: '02', title: '업체 매칭', desc: '800명 이상의 전문 업체가\n견적서를 보내드립니다', icon: '🔔' },
  { num: '03', title: '비교 선택', desc: '가격과 후기를 보고\n마음에 드는 업체를 선택하세요', icon: '✅' },
]

const reviews = [
  { name: '김○○', region: '서울 강남구', text: '누수 문제로 걱정이 많았는데 하루 만에 3곳에서 견적이 왔어요. 가격도 합리적이고 빠르게 해결했습니다.', category: '누수' },
  { name: '이○○', region: '경기 수원시', text: '화장실 리모델링 견적을 앱 없이 바로 요청했는데 너무 편했어요. 전문가분도 친절하게 설명해주셨습니다.', category: '화장실' },
  { name: '박○○', region: '서울 마포구', text: '보일러가 갑자기 고장났는데 올수리 덕분에 당일 수리 완료! 정말 감사합니다.', category: '난방' },
]

type WebAd = { id: string; title: string; image_url: string | null; link_url: string | null; position: string }

async function getWebContent(): Promise<{ settings: Record<string, string>; ads: WebAd[] }> {
  try {
    const [{ data: settingsData }, { data: adsData }] = await Promise.all([
      supabase.from('web_settings').select('key, value'),
      supabase.from('web_ads').select('id, title, image_url, link_url, position').eq('is_active', true).order('sort_order', { ascending: true }),
    ])
    const settings: Record<string, string> = {}
    ;(settingsData || []).forEach((s: { key: string; value: string }) => { settings[s.key] = s.value })
    return { settings, ads: (adsData || []) as WebAd[] }
  } catch { return { settings: {}, ads: [] } }
}

export default async function Home() {
  const { settings, ads } = await getWebContent()
  const noticeBannerActive = settings.notice_banner_active === 'true'
  const homeTopAds = ads.filter(a => a.position === 'home_top')
  const homeMiddleAds = ads.filter(a => a.position === 'home_middle')
  const homeBottomAds = ads.filter(a => a.position === 'home_bottom')

  return (
    <>
      {/* 알림 배너 (관리자 설정 시 표시) */}
      {noticeBannerActive && settings.notice_banner && (
        <div className="bg-blue-700 text-white text-center text-sm py-2 px-4 font-medium">
          📢 {settings.notice_banner}
        </div>
      )}
      {/* 홈 상단 광고 배너 */}
      {homeTopAds.map(ad => (
        <a key={ad.id} href={ad.link_url || '#'} target="_blank" rel="noopener" className="block">
          {ad.image_url
            ? <Image src={ad.image_url} alt={ad.title} width={1200} height={200} className="w-full max-h-32 object-cover" />
            : <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center py-4 font-bold">{ad.title}</div>
          }
        </a>
      ))}
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image src="/app-icon.png" alt="올수리" width={52} height={52} className="rounded-2xl shadow-md" />
            <span className="text-3xl font-extrabold tracking-tight">올수리</span>
          </div>
          <p className="text-blue-200 text-sm font-medium mb-3 tracking-wider uppercase">앱 설치 없이 · 회원가입 없이 · 무료로</p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-5">
            집수리, 이제<br />
            <span className="text-yellow-300">올수리</span>에서 해결하세요
          </h1>
          <p className="text-blue-100 text-lg mb-8 leading-relaxed">
            누수·배관·난방·리모델링 등 전문 업체 800곳 이상이<br className="hidden md:block" />
            직접 견적서를 보내드립니다
          </p>
          <Link
            href="/requests"
            className="inline-block bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-lg px-8 py-4 rounded-xl shadow-lg transition-all hover:scale-105"
          >
            무료 견적 요청하기 →
          </Link>
          <p className="mt-4 text-blue-200 text-sm">평균 응답시간 2시간 이내 · 완전 무료</p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">어떤 수리가 필요하신가요?</h2>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/requests?category=${encodeURIComponent(cat)}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <span className="text-3xl">{categoryIcons[cat]}</span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{cat}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">어떻게 이용하나요?</h2>
          <p className="text-center text-gray-500 mb-10">3단계로 간편하게</p>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="text-4xl mb-3">{step.icon}</div>
                <div className="text-blue-600 font-bold text-sm mb-1">STEP {step.num}</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/requests"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              지금 바로 시작하기
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto grid grid-cols-3 text-center gap-4">
          <div>
            <div className="text-3xl md:text-4xl font-bold">800+</div>
            <div className="text-blue-200 text-sm mt-1">등록 전문 업체</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold">무료</div>
            <div className="text-blue-200 text-sm mt-1">견적 요청 비용</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold">2시간</div>
            <div className="text-blue-200 text-sm mt-1">평균 응답 시간</div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">고객 후기</h2>
          <p className="text-center text-gray-500 mb-10">실제 이용하신 분들의 이야기</p>
          <div className="grid md:grid-cols-3 gap-5">
            {reviews.map((r, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                    {r.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.region}</div>
                  </div>
                  <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{r.category}</span>
                </div>
                <div className="text-yellow-400 text-sm mb-2">★★★★★</div>
                <p className="text-gray-600 text-sm leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 홈 중간 광고 */}
      {homeMiddleAds.length > 0 && (
        <div className="py-4 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {homeMiddleAds.map(ad => (
              <a key={ad.id} href={ad.link_url || '#'} target="_blank" rel="noopener" className="block rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {ad.image_url
                  ? <Image src={ad.image_url} alt={ad.title} width={1000} height={160} className="w-full object-cover max-h-40" />
                  : <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white text-center py-6 font-bold text-lg">{ad.title}</div>
                }
              </a>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <section className="py-16 px-4 bg-gray-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">지금 바로 무료 견적을 받아보세요</h2>
          <p className="text-gray-400 mb-8">앱 설치 · 회원가입 불필요. 3분이면 충분합니다.</p>
          <Link
            href="/requests"
            className="inline-block bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-lg px-10 py-4 rounded-xl transition-all hover:scale-105"
          >
            무료 견적 요청하기 →
          </Link>
        </div>
      </section>

      {/* 홈 하단 광고 */}
      {homeBottomAds.length > 0 && (
        <div className="py-4 px-4 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {homeBottomAds.map(ad => (
              <a key={ad.id} href={ad.link_url || '#'} target="_blank" rel="noopener" className="block rounded-xl overflow-hidden">
                {ad.image_url
                  ? <Image src={ad.image_url} alt={ad.title} width={1000} height={120} className="w-full object-cover max-h-32" />
                  : <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-5 font-bold">{ad.title}</div>
                }
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
