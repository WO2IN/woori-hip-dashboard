import Link from 'next/link'
import { FolderOpen, Upload, Settings, ArrowRight } from 'lucide-react'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RecentDocuments } from '@/components/dashboard/recent-documents'
import { Button } from '@/components/ui/button'

async function getDashboardData() {
  try {
    const res = await fetch('http://localhost:3000/api/stats', { cache: 'no-store' })
    if (!res.ok) throw new Error()
    return await res.json()
  } catch {
    return {
      totalDocuments: 0,
      todayUploads: 0,
      companyCount: 0,
      documentTypeCount: 0,
      recentDocuments: [],
    }
  }
}

const quickActions = [
  {
    href: '/explorer',
    label: '문서 탐색기',
    description: '폴더 구조로 문서 탐색',
    icon: FolderOpen,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    href: '/upload',
    label: '문서 등록',
    description: 'PDF 문서 업로드',
    icon: Upload,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    href: '/settings',
    label: '설정',
    description: '기준 정보 관리',
    icon: Settings,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
]

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Welcome banner */}
        <div className="relative overflow-hidden bg-primary rounded-2xl p-8 text-primary-foreground">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">
              WOORI-HIP
            </h1>
            <p className="text-sm opacity-90">
              문서 관리 시스템에 오신 것을 환영합니다.
              <br />
              업체별 문서 조회 및 등록 현황을 한눈에 확인하세요.
            </p>
          </div>

          <FolderOpen
            className="absolute right-8 bottom-4 w-32 h-32 opacity-10"
          />
        </div>
  
      {/* Stats */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">현황 요약</h2>
        <StatsCards data={data} />
      </section>
  
      {/* Quick actions */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">빠른 실행</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.bg}`}>
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-end mt-auto" />
              </Link>
            )
          })}
        </div>
      </section>
  
      {/* Recent documents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">최근 등록 문서</h2>
          <Link href="/explorer">
            <Button variant="ghost" size="sm">
              전체 보기
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
        <RecentDocuments documents={data.recentDocuments} />
      </section>
    </div>
  )
}
