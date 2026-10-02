'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Package, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DocumentMetadata } from '@/lib/types'

function formatDate(value?: string) {
  const raw = String(value ?? '').trim().replace(/[/.]/g, '-')
  const match = raw.match(/^(\d{4})-?(\d{2})-?(\d{2})$/)
  return match ? `${match[1]}.${match[2]}.${match[3]}` : raw || '-'
}

function dateKey(value?: string) {
  return String(value ?? '').replace(/[^0-9]/g, '')
}

function number(value: number) {
  return value === 0 ? '—' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

type ProductionViewProps = {
  documents?: DocumentMetadata[]
  loading?: boolean
  isEmbedded?: boolean
}

export function ProductionView({ documents = [], loading = false, isEmbedded = false }: ProductionViewProps) {
  const [visibleCount, setVisibleCount] = useState(20)

  const unit = useMemo(() => {
    const units = documents
      .map(doc => doc.quantityUnit?.trim())
      .filter((item): item is string => Boolean(item))
    return units.length ? Array.from(new Set(units)).join(' / ') : '단위 미정'
  }, [documents])

  const rows = useMemo(() => {
    const filtered = documents
    const grouped = new Map<string, number>()
    filtered.forEach(doc => grouped.set(dateKey(doc.issueDate), (grouped.get(dateKey(doc.issueDate)) ?? 0) + Number(doc.quantity ?? 0)))
    let inventory = 0
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, outgoing]) => {
      const incoming = 0
      const defect = 0
      const difference = incoming - outgoing - defect
      inventory += difference
      return { key, date: formatDate(key), incoming, outgoing, defect, difference, inventory }
    })
  }, [documents])

  useEffect(() => {
    setVisibleCount(20)
  }, [documents])

  const visibleRows = rows.slice(0, visibleCount)

  const summary = [
    { label: '입고 합계', value: rows.reduce((sum, row) => sum + row.incoming, 0), tone: 'blue' },
    { label: '출고 합계', value: rows.reduce((sum, row) => sum + row.outgoing, 0), tone: 'orange' },
    { label: '불량 합계', value: rows.reduce((sum, row) => sum + row.defect, 0), tone: 'rose' },
    { label: '현재 재고', value: rows.at(-1)?.inventory ?? 0, tone: 'yellow' },
  ]

  const content = (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{summary.map(item => <div key={item.label} className="rounded-xl border bg-card p-4 shadow-sm"><span className="text-xs font-semibold text-muted-foreground">{item.label}</span><p className="mt-2 text-xl font-bold tabular-nums">{number(item.value)} <span className="text-xs font-normal text-muted-foreground">{unit}</span></p></div>)}</section>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-semibold">전체 업체 · 전체 품목</h2><p className="mt-1 text-xs text-muted-foreground">출고 수량은 등록된 성적서의 수량을 합산합니다.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm"><thead><tr className="bg-muted/70 text-xs text-muted-foreground"><th className="sticky left-0 z-10 border-b border-r bg-muted/90 px-4 py-3 text-left">날짜</th>{['입고','출고','불량','차이수량','재고'].map(head => <th key={head} className="border-b px-4 py-3 text-right">{head}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">데이터를 불러오는 중입니다.</td></tr> : visibleRows.map(row => <tr key={row.key} className="border-b last:border-0 hover:bg-muted/40"><td className="sticky left-0 z-10 border-r bg-card px-4 py-3 font-medium">{row.date}</td><td className="px-4 py-3 text-right tabular-nums">{number(row.incoming)}</td><td className="px-4 py-3 text-right font-medium tabular-nums text-orange-600">{number(row.outgoing)}</td><td className="px-4 py-3 text-right tabular-nums">{number(row.defect)}</td><td className={`px-4 py-3 text-right font-medium tabular-nums ${row.difference < 0 ? 'text-rose-600' : ''}`}>{number(row.difference)}</td><td className="bg-yellow-50/70 px-4 py-3 text-right font-bold tabular-nums dark:bg-yellow-950/20">{number(row.inventory)}</td></tr>)}</tbody></table>{!loading && rows.length === 0 && <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><TriangleAlert className="h-4 w-4" /> 등록된 데이터가 없습니다.</div>}{!loading && rows.length > visibleCount && <div className="flex justify-center border-t p-3"><Button variant="ghost" size="sm" className="gap-2" onClick={() => setVisibleCount(rows.length)}><ChevronDown className="h-4 w-4" /> 더보기 ({rows.length - visibleCount}개)</Button></div>}</div>
        <div className="flex items-center gap-2 border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground"><Package className="h-3.5 w-3.5" /> 차이수량 = 입고 − 출고 − 불량 · 재고 = 누적 차이수량 · 단위: {unit}</div>
      </section>
    </>
  )

  if (isEmbedded) {
    return <div className="space-y-5">{content}</div>
  }

  return (
    <main className="min-h-full bg-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        {content}
      </div>
    </main>
  )
}
