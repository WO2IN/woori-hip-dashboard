'use client'

import { useState, useEffect } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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
  createdAt: string
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  initial: '초물',
  middle: '중물',
  final: '종물',
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
      const wb = XLSX.utils.book_new()

      records.forEach((record, rIdx) => {
        const sheetRows: (string | number)[][] = []
        // 헤더 메타
        sheetRows.push(['날짜', record.date])
        sheetRows.push(['품명', record.productName])
        sheetRows.push(['로트번호', record.lotNumber])
        sheetRows.push(['초/중/종물', PRODUCT_TYPE_LABELS[record.productType] ?? record.productType])
        sheetRows.push(['업체', record.company])
        sheetRows.push(['도금사양', record.specification])
        sheetRows.push([])
        // 측정값 헤더
        sheetRows.push(['No', ...record.materials, '측정 일시'])
        // 측정값 행
        record.rows.forEach((row, idx) => {
          sheetRows.push([idx + 1, ...row.values.map(v => parseFloat(v) || v), row.dateTime ?? ''])
        })

        const ws = XLSX.utils.aoa_to_sheet(sheetRows)
        ws['!cols'] = [{ wch: 6 }, ...record.materials.map(() => ({ wch: 10 })), { wch: 22 }]
        const sheetName = `${record.productName}_${PRODUCT_TYPE_LABELS[record.productType]}_${rIdx + 1}`.slice(0, 31)
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      })

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

      <div className="space-y-6">
        {records.map((record) => (
          <div key={record.id} className="border border-border rounded-xl overflow-hidden bg-card">
            {/* 레코드 헤더 */}
            <div className="px-4 py-3 bg-muted/30 border-b border-border flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="font-semibold">{record.productName}</span>
              <span className="text-muted-foreground">{record.date}</span>
              {record.lotNumber && <span className="text-muted-foreground">LOT: {record.lotNumber}</span>}
              <span className="text-muted-foreground">{record.company}</span>
              <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${
                record.productType === 'initial' ? 'bg-blue-500/15 text-blue-400' :
                record.productType === 'middle' ? 'bg-amber-500/15 text-amber-400' :
                'bg-emerald-500/15 text-emerald-400'
              }`}>
                {PRODUCT_TYPE_LABELS[record.productType]}
              </span>
              {record.specification && (
                <span className="text-muted-foreground text-xs">{record.specification}</span>
              )}
            </div>

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
                    {record.rows.some(r => r.dateTime) && (
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
                          {parseFloat(val) ? parseFloat(val).toFixed(3) : val}
                        </td>
                      ))}
                      {record.rows.some(r => r.dateTime) && (
                        <td className="px-4 py-2 text-xs text-muted-foreground">{row.dateTime ?? ''}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
