import Link from 'next/link'
import { FolderOpen, Upload, Settings, ArrowRight, FileStack } from 'lucide-react'
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
    description: '폴더 구조로 문서 탐색 및 검색',
    icon: FolderOpen,
    iconBg: 'bg-[oklch(0.52_0.19_258/0.12)] dark:bg-[oklch(0.62_0.18_258/0.14)]',
    iconColor: 'text-[oklch(0.52_0.19_258)] dark:text-[oklch(0.72_0.16_258)]',
    hoverBorder: 'hover:border-[oklch(0.52_0.19_258/0.4)]',
  },
  {
    href: '/upload',
    label: '문서 등록',
    description: 'PDF 문서 업로드 및 메타데이터 입력',
    icon: Upload,
    iconBg: 'bg-[oklch(0.55_0.17_162/0.12)] dark:bg-[oklch(0.62_0.17_162/0.14)]',
    iconColor: 'text-[oklch(0.45_0.17_162)] dark:text-[oklch(0.68_0.17_162)]',
    hoverBorder: 'hover:border-[oklch(0.55_0.17_162/0.4)]',
  },
  {
    href: '/settings',
    label: '설정',
    description: '업체 및 문서 유형 기준 정보 관리',
    icon: Settings,
    iconBg: 'bg-[oklch(0.68_0.17_55/0.12)] dark:bg-[oklch(0.74_0.16_55/0.14)]',
    iconColor: 'text-[oklch(0.52_0.17_55)] dark:text-[oklch(0.78_0.15_55)]',
    hoverBorder: 'hover:border-[oklch(0.68_0.17_55/0.4)]',
  },
]

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-8"
        style={{
          background: 'oklch(0.52 0.19 258)',
        }}
      >
        {/* Subtle geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-[0.08]"
            style={{ background: 'oklch(1 0 0)' }}
          />
          <div
            className="absolute right-32 bottom-0 w-48 h-48 rounded-full opacity-[0.05]"
            style={{ background: 'oklch(1 0 0)' }}
          />
          <div
            className="absolute -left-8 bottom-0 w-40 h-40 rounded-full opacity-[0.06]"
            style={{ background: 'oklch(1 0 0)' }}
          />
        </div>

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <FileStack className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/70 text-sm font-medium tracking-wide">DOCUMENT MANAGEMENT</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
              WOORI-HIP
            </h1>
            <p className="text-white/65 text-sm leading-relaxed max-w-md">
              업체별 문서를 체계적으로 관리하고
              <br />
              등록 현황을 한눈에 확인하세요.
            </p>
          </div>

          {/* Right side decorative stat */}
          <div className="hidden sm:flex flex-col items-end gap-1 text-right">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Total Docs</p>
            <p className="text-5xl font-bold text-white tabular-nums leading-none">
              {data.totalDocuments.toLocaleString()}
            </p>
            <p className="text-white/60 text-sm">문서 등록</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">현황 요약</h2>
        </div>
        <StatsCards data={data} />
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase mb-4">빠른 실행</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className={[
                  'group bg-card border border-border rounded-2xl p-5 flex flex-col gap-3',
                  'shadow-[0_1px_3px_oklch(0_0_0/0.05)] dark:shadow-[0_1px_3px_oklch(0_0_0/0.25)]',
                  'hover:shadow-[0_4px_16px_oklch(0_0_0/0.08)] dark:hover:shadow-[0_4px_16px_oklch(0_0_0/0.35)]',
                  'hover:-translate-y-0.5 transition-all duration-200',
                  action.hoverBorder,
                  'animate-fade-in-up',
                ].join(' ')}
                style={{ animationDelay: `${(i + 4) * 60}ms` }}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${action.iconBg}`}>
                  <Icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm mb-1">{action.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                </div>
                <div className="flex items-center justify-end">
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-150" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Recent documents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">최근 등록 문서</h2>
          <Link href="/explorer">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 text-xs">
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
