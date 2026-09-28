'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Factory, PackageOpen, RefreshCw, Search, Waypoints, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DocumentMetadata } from '@/lib/types'
import { normalizeIssueDate } from '@/lib/lot'
import { toast } from 'sonner'

function number(value?: number) {
  return (value ?? 0).toLocaleString('ko-KR')
}

function dateValue(value?: string) {
  try { return normalizeIssueDate(value).replace(/-/g, '') } catch { return '' }
}

function dateLabel(value?: string) {
  const normalized = value?.replace(/[/.]/g, '-') ?? ''
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  return match ? `${match[1]}.${match[2].padStart(2, '0')}.${match[3].padStart(2, '0')}` : value || '-'
}

type LotLedgerRow = {
  id: string
  issueDate: string
  movementType: '입고' | '출고'
  company: string
  product: string
  lotNumber: string
  inbound: number
  plated: number
  defect: number
  doe: number
  sample: number
  remaining: number
}

type ProductionRecord = {
  id: string
  lotId: string
  workDate: string
  plated: number
  defect: number
  doe: number
  sample: number
}

const demoInbound: LotLedgerRow = {
  id: 'demo-20260918-nexplus-busbar-pos', issueDate: '2026-09-18', movementType: '입고',
  company: '넥스플러스', product: 'BUSBAR POS', lotNumber: '20260918', inbound: 3600,
  plated: 0, defect: 0, doe: 0, sample: 0, remaining: 3600,
}

const demoCertificates = [
  { id: 'demo-cert-1', date: '2026-09-18', name: 'BUSBAR POS 출하성적서.pdf', quantity: 1200 },
  { id: 'demo-cert-2', date: '2026-09-20', name: 'BUSBAR POS 출하성적서-2.pdf', quantity: 800 },
]

export default function ProductionPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [company, setCompany] = useState('all')
  const [product, setProduct] = useState('all')
  const [query, setQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedRow, setSelectedRow] = useState<LotLedgerRow | null>(null)
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([])
  const [workDate, setWorkDate] = useState('2026-09-18')
  const [productionEntry, setProductionEntry] = useState({ plated: '', defect: '', doe: '', sample: '' })

  const openLot = (row: LotLedgerRow) => {
    setSelectedRow(row)
    setProductionEntry({ plated: row.plated ? String(row.plated) : '', defect: row.defect ? String(row.defect) : '', doe: row.doe ? String(row.doe) : '', sample: row.sample ? String(row.sample) : '' })
  }

  const loadDocuments = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true)
    try {
      const response = await fetch('/api/documents?documentType=성적서', { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const result = await response.json()
      setDocuments(result.data ?? [])
    } catch { toast.error('생산관리 데이터를 불러오지 못했습니다.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  const companies = useMemo(() => [...new Set(documents.map(item => item.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko')), [documents])
  const products = useMemo(() => [...new Set(documents.filter(item => company === 'all' || item.company === company).map(item => item.product).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko')), [company, documents])

  const rows = useMemo<LotLedgerRow[]>(() => {
    const filtered = documents
      .filter(item => (company === 'all' || item.company === company) && (product === 'all' || item.product === product))
      .filter(item => {
        const day = dateValue(item.issueDate)
        return (!startDate || day >= startDate.replace(/-/g, '')) && (!endDate || day <= endDate.replace(/-/g, ''))
      })
      .filter(item => !query.trim() || [item.lotStart, item.lotEnd, item.material, item.note].join(' ').toLocaleLowerCase('ko-KR').includes(query.trim().toLocaleLowerCase('ko-KR')))
      .sort((a, b) => dateValue(a.issueDate).localeCompare(dateValue(b.issueDate)) || a.id.localeCompare(b.id))

    const lots = new Map<string, { company: string; product: string; lotNumber: string; received: number; used: number }>()
    const result: LotLedgerRow[] = []
    for (const item of filtered) {
      const quantity = item.quantity ?? 0
      if (item.movementType !== '출고') {
        const lotNumber = item.lotStart || dateValue(item.issueDate)
        const key = `${item.company}|${item.product}|${lotNumber}|${item.id}`
        lots.set(key, { company: item.company, product: item.product, lotNumber, received: quantity, used: 0 })
        result.push({ id: item.id, issueDate: item.issueDate, movementType: '입고', company: item.company, product: item.product, lotNumber, inbound: quantity, plated: 0, defect: 0, doe: 0, sample: 0, remaining: quantity })
      } else {
        let left = quantity
        for (const [key, lot] of lots) {
          const available = lot.received - lot.used
          if (available <= 0 || left <= 0) continue
          const allocated = Math.min(available, left)
          lot.used += allocated
          left -= allocated
          result.push({ id: `${item.id}-${key}`, issueDate: item.issueDate, movementType: '출고', company: lot.company, product: lot.product, lotNumber: lot.lotNumber, inbound: 0, plated: allocated, defect: 0, doe: 0, sample: 0, remaining: lot.received - lot.used })
        }
      }
    }
    const hasDemoLot = result.some(item => item.id === demoInbound.id)
    const demoMatches = (company === 'all' || company === demoInbound.company) && (product === 'all' || product === demoInbound.product) && (!startDate || dateValue(demoInbound.issueDate) >= startDate.replace(/-/g, '')) && (!endDate || dateValue(demoInbound.issueDate) <= endDate.replace(/-/g, '')) && (!query.trim() || `${demoInbound.lotNumber} ${demoInbound.company} ${demoInbound.product}`.toLocaleLowerCase('ko-KR').includes(query.trim().toLocaleLowerCase('ko-KR')))
    if (!hasDemoLot && demoMatches) result.unshift(demoInbound)
    return result.map(item => {
      const records = productionRecords.filter(record => record.lotId === item.id)
      const plated = records.reduce((sum, record) => sum + record.plated, 0)
      const defect = records.reduce((sum, record) => sum + record.defect, 0)
      const doe = records.reduce((sum, record) => sum + record.doe, 0)
      const sample = records.reduce((sum, record) => sum + record.sample, 0)
      return { ...item, plated, defect, doe, sample, remaining: Math.max(0, item.inbound - plated - defect - doe - sample) }
    })
  }, [company, documents, endDate, product, productionRecords, query, startDate])

  const summary = useMemo(() => rows.reduce((result, item) => {
    result.inbound += item.inbound
    result.outbound += item.plated
    return result
  }, { inbound: 0, outbound: 0 }), [rows])

  const runningStock = summary.inbound - summary.outbound
  const metricCards: { label: string; value: number; color: string; Icon: LucideIcon }[] = [
    { label: '입고 수량', value: summary.inbound, color: 'bg-blue-500/10 text-blue-600', Icon: PackageOpen },
    { label: '출고·도금 투입', value: summary.outbound, color: 'bg-violet-500/10 text-violet-600', Icon: Waypoints },
    { label: '현재 재고', value: summary.inbound - summary.outbound, color: 'bg-emerald-500/10 text-emerald-600', Icon: Factory },
  ]

  return (
    <main className="min-h-full bg-muted/20 p-5 md:p-8">
      <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Factory className="h-4 w-4" /> 업무관리 / 생산관리</div>
          <h1 className="text-2xl font-bold tracking-tight">생산·재고 흐름</h1>
          <p className="mt-1 text-sm text-muted-foreground">업체와 제품을 선택하면 입고된 로트의 도금 진행 및 잔여 재고를 날짜순으로 확인합니다.</p>
        </div>
        <Button variant="outline" onClick={() => loadDocuments(true)} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> 새로고침</Button>
      </header>

      <section className="mb-5 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1.5 text-sm font-medium"><span>업체명</span><select value={company} onChange={event => { setCompany(event.target.value); setProduct('all') }} className="h-10 w-full rounded-lg border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring"><option value="all">전체 업체</option>{companies.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="space-y-1.5 text-sm font-medium"><span>제품명</span><select value={product} onChange={event => setProduct(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring"><option value="all">전체 제품</option>{products.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="space-y-1.5 text-sm font-medium"><span>시작일</span><input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
          <label className="space-y-1.5 text-sm font-medium"><span>종료일</span><input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
          <label className="relative space-y-1.5 text-sm font-medium"><span>로트 검색</span><Search className="pointer-events-none absolute left-3 top-9 h-4 w-4 text-muted-foreground" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="로트번호, 재질..." className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
        </div>
      </section>

      <section className="mb-5 grid gap-4 sm:grid-cols-3">
        {metricCards.map(({ label, value, color, Icon }) => <div key={label} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><Icon className="h-4 w-4" /></div></div><p className="mt-3 text-2xl font-bold">{number(value)}<span className="ml-1 text-sm font-normal text-muted-foreground">EA</span></p></div>)}
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-1 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">로트별 생산 현황</h2><p className="text-xs text-muted-foreground">DOE·시료·불량 수량은 생산기록 입력 항목입니다.</p></div><span className="text-sm text-muted-foreground">{rows.length}건</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1280px] text-sm"><thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground"><tr>{['입고일', '구분', '업체명 / 제품명', '로트번호', '입고', '도금 투입', '불량', 'DOE', '시험 시료', '로트 잔여 재고'].map(label => <th key={label} className="whitespace-nowrap px-5 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{loading ? Array.from({ length: 5 }).map((_, row) => <tr key={row}>{Array.from({ length: 10 }).map((__, cell) => <td key={cell} className="px-4 py-4"><Skeleton className="h-4 w-16" /></td>)}</tr>) : rows.length ? rows.map(item => <tr key={item.id} tabIndex={0} onClick={() => openLot(item)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') openLot(item) }} className="cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><td className="whitespace-nowrap px-4 py-4"><div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />{dateLabel(item.issueDate)}</div></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.movementType === '출고' ? 'bg-violet-500/10 text-violet-600' : 'bg-blue-500/10 text-blue-600'}`}>{item.movementType}</span></td><td className="px-4 py-4"><p className="font-medium">{item.company || '-'}</p><p className="text-xs text-muted-foreground">{item.product || '-'}</p></td><td className="px-4 py-4 font-mono text-xs">{item.lotNumber}</td><td className="px-4 py-4 font-semibold text-blue-600">{item.inbound ? number(item.inbound) : '-'}</td><td className="px-4 py-4 font-semibold text-violet-600">{item.plated ? number(item.plated) : '-'}</td><td className="px-4 py-4 text-rose-600">{item.defect ? number(item.defect) : '-'}</td><td className="px-4 py-4">{item.doe ? number(item.doe) : '-'}</td><td className="px-4 py-4">{item.sample ? number(item.sample) : '-'}</td><td className="px-4 py-4 font-semibold text-emerald-600">{number(item.remaining)}</td></tr>) : <tr><td colSpan={10} className="px-5 py-16 text-center text-muted-foreground">조건에 맞는 생산·입고 기록이 없습니다.</td></tr>}</tbody></table></div>
      </section>

      <Dialog open={Boolean(selectedRow)} onOpenChange={open => { if (!open) setSelectedRow(null) }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)] lg:max-w-[calc(100vw-6rem)]">
          {selectedRow && <>
            <DialogHeader>
              <DialogTitle className="text-xl">로트 개별 관리</DialogTitle>
              <DialogDescription>입고 로트에 연결된 생산 실적과 남은 재고를 확인하고 입력합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">업체명 / 제품명</p><p className="mt-1 font-semibold">{selectedRow.company} <span className="font-normal text-muted-foreground">/ {selectedRow.product}</span></p></div><div className="text-right"><p className="text-xs text-muted-foreground">로트번호</p><p className="mt-1 font-mono font-semibold">{selectedRow.lotNumber}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><p className="text-muted-foreground">기준일</p><p className="font-medium">{dateLabel(selectedRow.issueDate)}</p></div><div><p className="text-muted-foreground">입고 수량</p><p className="font-semibold text-blue-600">{number(selectedRow.inbound || selectedRow.remaining)} EA</p></div><div><p className="text-muted-foreground">현재 잔여</p><p className="font-semibold text-emerald-600">{number(selectedRow.remaining)} EA</p></div><div><p className="text-muted-foreground">누적 도금</p><p className="font-semibold text-violet-600">{number(selectedRow.plated)} EA</p></div></div></div>
              <div className="sm:col-span-2"><p className="mb-2 text-sm font-semibold">날짜별 작업 기록 추가</p><div className="grid gap-3 sm:grid-cols-5"><input type="date" value={workDate} onChange={event => setWorkDate(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />{([['plated', '도금'], ['defect', '불량'], ['doe', 'DOE'], ['sample', '시험 시료']] as const).map(([key, label]) => <label key={key} className="space-y-1 text-xs font-medium"><span>{label}</span><input type="number" min="0" value={productionEntry[key]} onChange={event => setProductionEntry(current => ({ ...current, [key]: event.target.value }))} placeholder="0" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>)}</div></div>
              <div className="sm:col-span-2 rounded-xl border"><div className="border-b px-4 py-3 text-sm font-semibold">입고일 기준 수불대장</div><div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-[110px_repeat(5,1fr)_150px] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground"><span>작업일</span><span>작업수량</span><span>불량</span><span>DOE</span><span>시험 시료</span><span>재고</span><span>성적서</span></div><div className="divide-y">{productionRecords.filter(record => record.lotId === selectedRow.id).sort((a, b) => a.workDate.localeCompare(b.workDate)).map((record, index, records) => { const stock = Math.max(0, (selectedRow.inbound || selectedRow.remaining) - records.slice(0, index + 1).reduce((sum, item) => sum + item.plated + item.defect + item.doe + item.sample, 0)); const certificate = selectedRow.id === demoInbound.id ? demoCertificates.find(cert => cert.date === record.workDate) : undefined; return <div key={record.id} className="grid grid-cols-[110px_repeat(5,1fr)_150px] items-center gap-3 px-4 py-3 text-sm"><span className="font-mono">{dateLabel(record.workDate)}</span><span className="font-semibold text-violet-600">{number(record.plated)}</span><span className="text-rose-600">{number(record.defect)}</span><span>{number(record.doe)}</span><span>{number(record.sample)}</span><span className="font-semibold text-emerald-600">{number(stock)}</span>{certificate ? <button type="button" onClick={() => toast.info(`${certificate.name} · ${number(certificate.quantity)} EA`)} className="text-left text-primary underline underline-offset-2">성적서 보기</button> : <span className="text-muted-foreground">-</span>}</div> })}{selectedRow.id === demoInbound.id && demoCertificates.map(cert => <div key={cert.id} className="grid grid-cols-[110px_repeat(5,1fr)_150px] items-center gap-3 px-4 py-3 text-sm"><span className="font-mono">{dateLabel(cert.date)}</span><span className="font-semibold text-violet-600">{number(cert.quantity)}</span><span>-</span><span>0</span><span>0</span><span className="font-semibold text-emerald-600">-</span><button type="button" onClick={() => toast.info(`${cert.name} · ${number(cert.quantity)} EA`)} className="text-left text-primary underline underline-offset-2">성적서 보기</button></div>)}{!productionRecords.some(record => record.lotId === selectedRow.id) && selectedRow.id !== demoInbound.id && <p className="px-4 py-4 text-sm text-muted-foreground">등록된 작업 기록이 없습니다.</p>}</div></div></div></div>
            </div>
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">입고 로트별로 작업 수량을 기록하므로 20260918 로트와 이후 입고 로트가 동시에 작업되어도 각각의 잔여 재고를 따로 추적합니다.</p>
            <DialogFooter><Button variant="outline" onClick={() => setSelectedRow(null)}>닫기</Button><Button onClick={() => { const values = Object.fromEntries(Object.entries(productionEntry).map(([key, value]) => [key, Math.max(0, Number(value) || 0)])) as Omit<ProductionRecord, 'id' | 'lotId' | 'workDate'>; if (Object.values(values).some(value => value > 0)) setProductionRecords(current => [...current, { id: `${selectedRow.id}-${Date.now()}`, lotId: selectedRow.id, workDate, ...values }]); setProductionEntry({ plated: '', defect: '', doe: '', sample: '' }); toast.success('날짜별 생산 실적이 추가되었습니다.'); setSelectedRow(null) }}>생산 실적 저장</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </main>
  )
}
