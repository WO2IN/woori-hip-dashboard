'use client'

import { useEffect, useState } from 'react'
import { SettingsView } from '@/components/settings/settings-view'
import { getSession } from '@/lib/auth-client'
import { SessionUser } from '@/lib/types'

export default function SettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    setUser(getSession())
  }, [])

  // 로딩 중
  if (user === null) {
    return null
  }

  // 뷰어 차단
  if (user.role === 'viewer') {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">접근 권한이 없습니다.</h1>
          <p className="text-muted-foreground">
            설정은 편집자 또는 관리자만 사용할 수 있습니다.
          </p>
        </div>
      </div>
    )
  }

  return <SettingsView />
}