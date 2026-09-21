'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ExcelJS from 'exceljs'
import { Download, PackageCheck, RefreshCw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentMetadata } from '@/lib/types'
import { useDataChanged } from '@/lib/data-events'
import { toast } from 'sonner'

function formatLot(doc: DocumentMetadata) {
  if (doc.lotEnd && doc.lotEnd !== doc.lotStart) return `${doc.lotStart} ~ ${doc.lotEnd}`
  return doc.lotStart || '-'
}

function formatQuantity(quantity: number | null | undefined, unit?: string) {
  if (quantity == null || Number.isNaN(Number(quantity))) return '-'
  return `${Number(quantity).toLocaleString()} ${unit || 'Kg'}`
}

function formatDate(value: string) {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'

  const compactMatch = raw.match(/^(\d{4})(\d{2})(\d{2})$/)
  const normalized = raw.replace(/[/.]/g, '-')
  const match = compactMatch ?? normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return raw

  const [, year, month, day] = compactMatch
    ? compactMatch
    : match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  const isValidDate = date.getFullYear() === Number(year)
    && date.getMonth() === Number(month) - 1
    && date.getDate() === Number(day)

  return isValidDate
    ? `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}`
    : '-'
}

export function ShipmentView() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [sortKey, setSortKey] = useState<'company' | 'floor' | 'shipmentCategory' | 'product' | 'lot' | 'issueDate' | 'quantity'>('issueDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [floorFilter, setFloorFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [query, setQuery] = useState('')

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    return documents.filter(doc => {
      const floor = String(doc.floor ?? doc.shipmentFloor ?? '')
      const category = doc.shipmentCategory || '미분류'
      const searchableText = [
        doc.company,
        doc.product,
        formatLot(doc),
        doc.issueDate,
        category,
        floor,
      ].filter(Boolean).join(' ').toLocaleLowerCase('ko-KR')
      return (floorFilter === 'all' || floor === floorFilter)
        && (categoryFilter === 'all' || category === categoryFilter)
        && (!normalizedQuery || searchableText.includes(normalizedQuery))
    })
  }, [categoryFilter, documents, floorFilter, query])

  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
      const values = {
        company: [a.company || '', b.company || ''],
        floor: [a.floor ?? a.shipmentFloor ?? 0, b.floor ?? b.shipmentFloor ?? 0],
        shipmentCategory: [a.shipmentCategory || '미분류', b.shipmentCategory || '미분류'],
        product: [a.product || '', b.product || ''],
        lot: [formatLot(a), formatLot(b)],
        issueDate: [a.issueDate || '', b.issueDate || ''],
        quantity: [a.quantity ?? -Infinity, b.quantity ?? -Infinity],
      }[sortKey]
      const left = values[0]
      const right = values[1]
      const comparison = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), 'ko')
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredDocuments, sortDirection, sortKey])

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const loadDocuments = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      const response = await fetch('/api/documents', { cache: 'no-store' })
      if (!response.ok) throw new Error('문서 목록을 불러오지 못했습니다.')
      const result = await response.json()
      const shipmentDocuments = (result.data || []).filter(
        (doc: DocumentMetadata) => doc.documentType === '성적서',
      )
      setDocuments(shipmentDocuments)
    } catch {
      toast.error('문서 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadDocuments() }, [loadDocuments])
  useDataChanged(() => loadDocuments(true), [loadDocuments])

  const downloadExcel = async () => {
    setDownloading(true)
    try {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('출하관리')
      sheet.columns = [
        { header: '순번', key: 'number', width: 8 },
        { header: '업체명', key: 'company', width: 24 },
        { header: '층', key: 'floor', width: 10 },
        { header: '구분', key: 'category', width: 14 },
        { header: '품목', key: 'product', width: 24 },
        { header: '로트번호', key: 'lot', width: 28 },
        { header: '발행일', key: 'issueDate', width: 16 },
        { header: '수량', key: 'quantity', width: 14 },
      ]
      sheet.addRows(sortedDocuments.map((doc, index) => ({
        number: index + 1,
        company: doc.company || '-',
        floor: (doc.floor ?? doc.shipmentFloor) ? `${doc.floor ?? doc.shipmentFloor}층` : '-',
        category: doc.shipmentCategory || '미분류',
        product: doc.product || '-',
        lot: formatLot(doc),
        issueDate: formatDate(doc.issueDate),
        quantity: doc.quantity != null ? `${doc.quantity.toLocaleString()} ${doc.quantityUnit || 'Kg'}` : '-',
      })))
      const border = {
        top: { style: 'thin' as const, color: { argb: 'FFB8C2D1' } },
        left: { style: 'thin' as const, color: { argb: 'FFB8C2D1' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFB8C2D1' } },
        right: { style: 'thin' as const, color: { argb: 'FFB8C2D1' } },
      }
      sheet.eachRow((row, rowNumber) => {
        row.height = rowNumber === 1 ? 28 : 24
        row.eachCell((cell, columnNumber) => {
          cell.border = border
          cell.font = { name: '맑은 고딕', size: rowNumber === 1 ? 11 : 10 }
          cell.alignment = {
            vertical: 'middle',
            horizontal: [1, 6, 7].includes(columnNumber) ? 'center' : 'left',
            wrapText: true,
          }
          if (rowNumber > 1 && rowNumber % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F6FA' } }
          }
        })
      })
      const header = sheet.getRow(1)
      header.font = { name: '맑은 고딕', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }
      header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      sheet.getColumn('quantity').numFmt = '#,##0.##'
      sheet.views = [{ state: 'frozen', ySplit: 1 }]
      sheet.autoFilter = { from: 'A1', to: 'H1' }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `출하관리_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('엑셀 파일을 다운로드했습니다.')
    } catch {
      toast.error('엑셀 파일 생성에 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <main className="p-6 md:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">출하관리</h1>
            <p className="text-sm text-muted-foreground">등록된 성적서의 출하 정보를 확인하고 엑셀로 저장합니다.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadDocuments(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> 새로고침
          </Button>
          <Button onClick={downloadExcel} disabled={loading || downloading || documents.length === 0}>
            <Download className="mr-2 h-4 w-4" /> 엑셀 다운로드
          </Button>
        </div>
      </header>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">출하 목록 검색</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="업체명, 품명, 로트번호 검색..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="검색어 지우기"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium">
            <span>층</span>
            <select value={floorFilter} onChange={event => setFloorFilter(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="all">전체 층</option><option value="1">1층</option><option value="2">2층</option><option value="3">3층</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>도금 종류</span>
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="all">전체 종류</option><option value="판재">판재</option><option value="커넥터">커넥터</option><option value="랙">랙</option>
            </select>
          </label>
          <div className="flex items-end justify-end text-right text-sm text-muted-foreground sm:col-span-2 lg:col-span-2">필터 결과 <strong className="ml-1 text-foreground">{filteredDocuments.length}건</strong></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">출하 목록</h2>
          <span className="text-sm text-muted-foreground">총 {documents.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
              <tr>{([
                ['company', '업체명'], ['floor', '층'], ['shipmentCategory', '구분'], ['product', '품목'], ['lot', '로트번호'], ['issueDate', '발행일'], ['quantity', '수량'],
              ] as const).map(([key, label]) => <th key={key} className="px-5 py-3"><button type="button" onClick={() => handleSort(key)} className="inline-flex items-center gap-1 rounded px-1 py-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${label} ${sortKey === key ? (sortDirection === 'asc' ? '오름차순' : '내림차순') : '정렬'}`}>{label}<span aria-hidden="true" className="text-[10px]">{sortKey === key ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span></button></th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}>{Array.from({ length: 6 }).map((__, cell) => <td key={cell} className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>)}</tr>) : sortedDocuments.length > 0 ? sortedDocuments.map(doc => <tr key={doc.id} className="hover:bg-muted/30"><td className="px-5 py-4 font-medium">{doc.company || '-'}</td><td className="px-5 py-4">{(doc.floor ?? doc.shipmentFloor) ? `${doc.floor ?? doc.shipmentFloor}층` : '-'}</td><td className="px-5 py-4">{doc.shipmentCategory || '미분류'}</td><td className="px-5 py-4">{doc.product || '-'}</td><td className="px-5 py-4">{formatLot(doc)}</td><td className="px-5 py-4">{formatDate(doc.issueDate)}</td><td className="px-5 py-4">{formatQuantity(doc.quantity, doc.quantityUnit)}</td></tr>) : <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">등록된 성적서가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default ShipmentView

