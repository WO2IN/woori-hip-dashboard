'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertCircle, CheckCircle2, Clock3, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { getSession, buildAuthHeaders } from '@/lib/auth-client'
import { AuditLogEntry } from '@/lib/storage'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

export default function SystemLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadLogs() {
    setLoading(true)
    setError('')
    try {
      const session = getSession()
      const response = await fetch('/api/audit-logs?limit=500', {
        cache: 'no-store',
        headers: session ? buildAuthHeaders(session) : {},
      })
      if (!response.ok) throw new Error('로그를 불러오지 못했습니다.')
      const result = await response.json()
      setLogs(result.data ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '로그를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') loadLogs()
  }, [user?.role])

  const filteredLogs = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return logs
    return logs.filter(log => [log.action, log.target, log.detail, log.userName, log.userId]
      .filter(Boolean)
      .some(value => value!.toLowerCase().includes(normalized)))
  }, [logs, query])

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
            <ShieldAlert className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">접근 권한이 없습니다.</h1>
          <p className="mt-2 text-muted-foreground">시스템 로그는 관리자만 확인할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-muted/20 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4 text-primary" /> 시스템관리</div>
            <h1 className="text-2xl font-bold tracking-tight">시스템 로그</h1>
            <p className="mt-1 text-sm text-muted-foreground">문서 업로드, 수정, 삭제와 주요 설정 변경 이력을 확인합니다.</p>
          </div>
          <button type="button" onClick={loadLogs} disabled={loading} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent disabled:opacity-50">
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> 새로고침
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" /> 전체 기록</div><p className="mt-2 text-2xl font-semibold">{logs.length}</p></div>
          <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 표시 중</div><p className="mt-2 text-2xl font-semibold">{filteredLogs.length}</p></div>
          <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4 text-primary" /> 최근 활동</div><p className="mt-2 text-sm font-semibold">{logs[0] ? formatDate(logs[0].createdAt) : '기록 없음'}</p></div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold">활동 기록</h2><p className="mt-1 text-xs text-muted-foreground">최대 500개의 최근 기록을 표시합니다.</p></div>
            <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="사용자, 작업, 대상 검색" className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" /></div>
          </div>
          {error ? <div className="flex items-center gap-2 p-6 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</div> : loading ? <div className="p-10 text-center text-sm text-muted-foreground">로그를 불러오는 중입니다.</div> : filteredLogs.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">조건에 맞는 기록이 없습니다.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">일시</th><th className="px-4 py-3 font-medium">사용자</th><th className="px-4 py-3 font-medium">작업</th><th className="px-4 py-3 font-medium">대상</th><th className="px-4 py-3 font-medium">상세</th></tr></thead><tbody className="divide-y">{filteredLogs.map(log => <tr key={log.id} className="transition-colors hover:bg-muted/20"><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(log.createdAt)}</td><td className="px-4 py-3"><div className="font-medium">{log.userName}</div><div className="text-xs text-muted-foreground">{log.userId}</div></td><td className="px-4 py-3"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{log.action}</span></td><td className="px-4 py-3 font-medium">{log.target}</td><td className="max-w-sm px-4 py-3 text-muted-foreground">{log.detail || '-'}</td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </div>
  )
}
