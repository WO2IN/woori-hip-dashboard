'use client'

import { useState, useEffect } from 'react'
import { Download, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MeasurementRow {
  id: string
  values: string[]
  dateTime?: string
}

interface PlatingRecord {
  id: string
  date: string
  productName: string
  lotNumber: string
  productType: 'initial' | 'middle' | 'final'
  company: string
  materials: string[]
  rows: MeasurementRow[]
  specification: string
  measurementTime: string
  note: string
  createdAt: string
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  initial: '초물',
  middle: '중물',
  final: '종물',
}

const TYPE_BADGE: Record<string, string> = {
  initial: 'bg-blue-500/15 text-blue-400',
  middle: 'bg-amber-500/15 text-amber-400',
  final: 'bg-emerald-500/15 text-emerald-400',
}

function RecordRow({ record }: { record: PlatingRecord }) {
  const [open, setOpen] = useState(false)
  const hasDateTime = record.rows.some(r => r.dateTime)

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* ── 헤더 (클릭하면 펼쳐짐) ── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
      >
        <span className="text-muted-foreground shrink-0">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        {/* 날짜 */}
        <span className="text-sm text-muted-foreground w-24 shrink-0">{record.date}</span>

        {/* 품명 */}
        <span className="text-sm font-semibold flex-1 truncate">{record.productName}</span>

        {/* 로트번호 */}
        {record.lotNumber && (
          <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[120px]">
            LOT: {record.lotNumber}
          </span>
        )}

        {/* 업체 */}
        <span className="text-xs text-muted-foreground hidden md:block shrink-0">{record.company}</span>

        {/* 초/중/종물 뱃지 */}
        <span className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
          TYPE_BADGE[record.productType] ?? 'bg-muted text-muted-foreground'
        )}>
          {PRODUCT_TYPE_LABELS[record.productType] ?? record.productType}
        </span>

        {/* 재질 요약 */}
        <span className="text-xs text-muted-foreground hidden lg:block shrink-0">
          {record.materials.join(' / ')}
        </span>

        {/* 측정 행 수 */}
        <span className="text-xs text-muted-foreground shrink-0">{record.rows.length}건</span>
      </button>

      {/* ── 펼쳐지는 상세 ── */}
      {open && (
        <div className="border-t border-border">
          {/* 메타 정보 */}
          {(record.specification || record.note || record.measurementTime) && (
            <div className="px-4 py-2 bg-muted/10 border-b border-border flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              {record.specification && <span>도금사양: {record.specification}</span>}
              {record.measurementTime && <span>측정시간: {record.measurementTime}</span>}
              {record.note && <span>비고: {record.note}</span>}
            </div>
          )}

          {/* 측정값 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground w-12">No</th>
                  {record.materials.map((mat, i) => (
                    <th key={i} className="px-4 py-2 text-center text-xs font-semibold">
                      {mat} <span className="text-muted-foreground font-normal">μm</span>
                    </th>
                  ))}
                  {hasDateTime && (
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">측정 일시</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {record.rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                    {row.values.map((val, ci) => (
                      <td key={ci} className="px-4 py-2 text-center font-mono text-sm">
                        {parseFloat(val) ? parseFloat(val).toFixed(3) : (val || '—')}
                      </td>
                    ))}
                    {hasDateTime && (
                      <td className="px-4 py-2 text-xs text-muted-foreground">{row.dateTime ?? ''}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export function PlatingThicknessViewer() {
  const [records, setRecords] = useState<PlatingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadRecords = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/plating-thickness')
      if (!res.ok) throw new Error('데이터 로드 실패')
      const data = await res.json()
      setRecords(data || [])
    } catch {
      toast.error('데이터를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRecords() }, [])

  const handleExportToExcel = async () => {
    if (records.length === 0) { toast.error('내보낼 데이터가 없습니다.'); return }
    setExporting(true)
    try {
      const XLSX = await import('xlsx')

      // 단일 시트에 모든 레코드를 행 단위로 풀어서 나열
      // 헤더 행: 날짜 | 품명 | 로트번호 | 초중종물 | 업체 | 도금사양 | 측정시간 | 비고 | No | [재질1] | [재질2] | ... | 측정 일시
      // 하지만 재질 수가 레코드마다 다를 수 있으므로, 전체 유니크 재질 컬럼을 수집
      const allMaterials = Array.from(
        new Set(records.flatMap(r => r.materials))
      )

      const headerRow = [
        '날짜', '품명', '로트번호', '초/중/종물', '업체', '도금사양', '측정시간', '비고',
        'No',
        ...allMaterials.map(m => `${m} (μm)`),
        '측정 일시',
      ]

      const dataRows: (string | number)[][] = []

      records.forEach(record => {
        const metaPrefix = [
          record.date,
          record.productName,
          record.lotNumber ?? '',
          PRODUCT_TYPE_LABELS[record.productType] ?? record.productType,
          record.company,
          record.specification ?? '',
          record.measurementTime ?? '',
          record.note ?? '',
        ]

        record.rows.forEach((row, idx) => {
          // 재질 값을 allMaterials 순서에 맞게 매핑
          const matValues = allMaterials.map(mat => {
            const matIdx = record.materials.indexOf(mat)
            if (matIdx === -1) return ''
            const v = row.values[matIdx] ?? ''
            return parseFloat(v) || v
          })

          dataRows.push([
            // 첫 행에만 메타 출력, 이후 행은 빈값 (그룹 표현)
            ...(idx === 0 ? metaPrefix : metaPrefix.map(() => '')),
            idx + 1,
            ...matValues,
            row.dateTime ?? '',
          ])
        })
      })

      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
      ws['!cols'] = [
        { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 10 },
        { wch: 20 }, { wch: 8 }, { wch: 12 },
        { wch: 5 },
        ...allMaterials.map(() => ({ wch: 10 })),
        { wch: 22 },
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '도금두께')
      XLSX.writeFile(wb, `도금두께_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('엑셀 파일이 다운로드되었습니다.')
    } catch {
      toast.error('엑셀 내보내기에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-sm">등록된 도금두께 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">총 {records.length}개 측정 기록</p>
        <Button onClick={handleExportToExcel} disabled={exporting} variant="outline" size="sm" className="gap-2">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          엑셀 다운로드
        </Button>
      </div>

      <div className="space-y-2">
        {records.map(record => (
          <RecordRow key={record.id} record={record} />
        ))}
      </div>
    </div>
  )
}
