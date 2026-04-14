import type { Metadata } from 'next'
import { Suspense } from 'react'
import RequestForm from './RequestForm'

export const metadata: Metadata = {
  title: '무료 견적 요청 | 올수리',
  description: '앱 설치 없이 집수리 무료 견적을 요청하세요. 800개 이상의 전문 업체가 견적서를 보내드립니다.',
}

export default function RequestsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">무료 견적 요청</h1>
          <p className="text-gray-500 mt-2">앱 설치·회원가입 없이 바로 요청하세요</p>
        </div>
        <Suspense fallback={<div className="text-center py-10 text-gray-400">로딩 중...</div>}>
          <RequestForm />
        </Suspense>
      </div>
    </div>
  )
}
