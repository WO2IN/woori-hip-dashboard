'use client'

import { useState, useEffect } from 'react'
import { Download, Loader2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
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

function RecordRow({ record, onDelete }: { record: PlatingRecord; onDelete: (id: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const hasDateTime = record.rows.some(r => r.dateTime)

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* ── 헤더 (클릭하면 펼쳐짐) ── */}
      <div className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <span className="text-muted-foreground shrink-0">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>

        {/* 날짜 */}
        <span className="text-base text-muted-foreground w-24 shrink-0">{record.date}</span>

        {/* 품명 */}
        <span className="text-base font-semibold flex-1 truncate">{record.productName}</span>

        {/* 로트번호 */}
        {record.lotNumber && (
          <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[120px]">
            LOT: {record.lotNumber}
          </span>
        )}

        {/* 업체 */}
        <span className="text-sm text-muted-foreground hidden md:block shrink-0">{record.company}</span>

        {/* 초/중/종물 뱃지 */}
        <span className={cn(
          'text-sm font-medium px-2 py-0.5 rounded-full shrink-0',
          TYPE_BADGE[record.productType] ?? 'bg-muted text-muted-foreground'
        )}>
          {PRODUCT_TYPE_LABELS[record.productType] ?? record.productType}
        </span>

        {/* 재질 요약 */}
        <span className="text-sm text-muted-foreground hidden lg:block shrink-0">
          {record.materials.join(' / ')}
        </span>

          {/* 측정 행 수 */}
          <span className="text-sm text-muted-foreground shrink-0">{record.rows.length}건</span>
        </button>

        {/* 삭제 버튼 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(record.id)
          }}
          className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
          title="삭제"
        >
          <Trash2 className="w-4 h-4 text-destructive hover:text-destructive/80" />
        </button>
      </div>

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
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-12">No</th>
                  {record.materials.map((mat, i) => (
                    <th key={i} className="px-4 py-3 text-center text-sm font-semibold">
                      {mat} <span className="text-muted-foreground font-normal">μm</span>
                    </th>
                  ))}
                  {hasDateTime && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">측정 일시</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {record.rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{idx + 1}</td>
                    {row.values.map((val, ci) => (
                      <td key={ci} className="px-4 py-3 text-center font-mono text-base">
                        {parseFloat(val) ? parseFloat(val).toFixed(3) : (val || '—')}
                      </td>
                    ))}
                    {hasDateTime && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.dateTime ?? ''}</td>
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

  const handleDelete = async (recordId: string) => {
    if (!confirm('정말 이 기록을 삭제하시겠습니까?')) return
    try {
      const res = await fetch('/api/plating-thickness', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId }),
      })
      if (!res.ok) throw new Error('삭제 실패')
      toast.success('기록이 삭제되었습니다.')
      setRecords(records.filter(r => r.id !== recordId))
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
  }

  const handleExportToExcel = async () => {
    if (records.length === 0) { toast.error('내보낼 데이터가 없습니다.'); return }
    setExporting(true)
    try {
      const XLSX = await import('xlsx')

      // 각 레코드를 하나의 행으로 표현 (모든 측정값을 가로로 나열)
      // 헤더: 날짜 | 품명 | 로트번호 | 초중종물 | 업체 | 도금사양 | 측정시간 | 비고 | Sn1 | Sn2 | ... | Sn6 | Ni1 | Ni2 | ...
      
      // 각 레코드의 최대 행 수 구하기
      const maxRowsPerRecord = Math.max(...records.map(r => r.rows.length), 1)
      
      // 전체 유니크 재질 수집
      const allMaterials = Array.from(new Set(records.flatMap(r => r.materials)))

      // 헤더 구성: 기본 정보 + 각 재질별로 1~maxRowsPerRecord 번호
      const headerRow: string[] = ['날짜', '품명', '로트번호', '초/중/종물', '업체', '도금사양', '측정시간', '비고']
      
      allMaterials.forEach(mat => {
        for (let rowIdx = 1; rowIdx <= maxRowsPerRecord; rowIdx++) {
          headerRow.push(`${mat}${rowIdx} (μm)`)
        }
      })

      const dataRows: (string | number)[][] = []

      records.forEach(record => {
        const row: (string | number)[] = [
          record.date,
          record.productName,
          record.lotNumber ?? '',
          PRODUCT_TYPE_LABELS[record.productType] ?? record.productType,
          record.company,
          record.specification ?? '',
          record.measurementTime ?? '',
          record.note ?? '',
        ]

        // 각 재질별로 측정값을 가로로 나열 (Sn1, Sn2, ... Sn6, Ni1, Ni2, ...)
        allMaterials.forEach(mat => {
          const matIdx = record.materials.indexOf(mat)
          for (let rowIdx = 0; rowIdx < maxRowsPerRecord; rowIdx++) {
            const measureRow = record.rows[rowIdx]
            if (measureRow && matIdx !== -1 && measureRow.values[matIdx]) {
              const v = parseFloat(measureRow.values[matIdx])
              row.push(isNaN(v) ? measureRow.values[matIdx] : v)
            } else {
              row.push('')
            }
          }
        })

        dataRows.push(row)
      })

      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
      
      // 열 너비 설정
      const cols: any[] = [
        { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 10 },
        { wch: 20 }, { wch: 8 }, { wch: 12 },
      ]
      
      // 각 재질별 컬럼
      for (let i = 0; i < allMaterials.length * maxRowsPerRecord; i++) {
        cols.push({ wch: 10 })
      }
      
      ws['!cols'] = cols

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '도금두께')
      XLSX.writeFile(wb, `도금두께_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('엑셀 파일이 다운로드되었습니다.')
    } catch (error) {
      console.error('[v0] Excel export error:', error)
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
          <RecordRow key={record.id} record={record} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  )
}
