'use client'

import { useState, useEffect } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

interface MeasurementRow {
  id: string
  material: string
  value: string
}

interface PlatingRecord {
  id: string
  date: string
  productName: string
  lotNumber: string
  productType: 'initial' | 'middle' | 'final'
  company: string
  measurements: MeasurementRow[]
  specification: string
  measurementTime: string
  createdAt: string
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  initial: '초물',
  middle: '중물',
  final: '종물',
}

export function PlatingThicknessViewer({ onDataLoaded }: { onDataLoaded?: () => void }) {
  const [records, setRecords] = useState<PlatingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadRecords = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/plating-thickness')
      if (!response.ok) throw new Error('데이터 로드 실패')
      const data = await response.json()
      setRecords(data || [])
    } catch (error) {
      toast.error('데이터를 불러올 수 없습니다.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [])

  const handleExportToExcel = async () => {
    if (records.length === 0) {
      toast.error('내보낼 데이터가 없습니다.')
      return
    }

    setExporting(true)

    try {
      const XLSX = await import('xlsx')
      
      // 시트 데이터 구성
      const sheetData: any[] = [
        [
          '측정 날짜',
          '품명',
          '로트번호',
          '상품 유형',
          '업체',
          '도금사양',
          '측정시간',
          '재질',
          '측정값 (μm)',
        ],
      ]

      records.forEach(record => {
        record.measurements.forEach((measurement, index) => {
          sheetData.push([
            index === 0 ? record.date : '',
            index === 0 ? record.productName : '',
            index === 0 ? record.lotNumber : '',
            index === 0 ? PRODUCT_TYPE_LABELS[record.productType] : '',
            index === 0 ? record.company : '',
            index === 0 ? record.specification : '',
            index === 0 ? record.measurementTime : '',
            measurement.material,
            measurement.value,
          ])
        })
      })

      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '도금두께')

      // 열 너비 설정
      ws['!cols'] = [
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 20 },
        { wch: 10 },
        { wch: 8 },
        { wch: 15 },
      ]

      XLSX.writeFile(wb, `도금두께_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('엑셀 파일이 다운로드되었습니다.')
    } catch (error) {
      toast.error('엑셀 내보내기에 실패했습니다.')
      console.error(error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">등록된 도금두께 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          총 {records.length}개의 측정 기록
        </h3>
        <Button
          onClick={handleExportToExcel}
          disabled={exporting}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              내보내는 중...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              엑셀 다운로드
            </>
          )}
        </Button>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 text-left font-semibold text-xs">
                측정 날짜
              </th>
              <th className="px-4 py-2 text-left font-semibold text-xs">
                품명
              </th>
              <th className="px-4 py-2 text-left font-semibold text-xs">
                로트번호
              </th>
              <th className="px-4 py-2 text-left font-semibold text-xs">
                상품 유형
              </th>
              <th className="px-4 py-2 text-left font-semibold text-xs">
                업체
              </th>
              <th className="px-4 py-2 text-left font-semibold text-xs">
                도금사양
              </th>
              <th className="px-4 py-2 text-left font-semibold text-xs">
                측정시간
              </th>
              <th className="px-4 py-2 text-left font-semibold text-xs">
                재질
              </th>
              <th className="px-4 py-2 text-right font-semibold text-xs">
                측정값 (μm)
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) =>
              record.measurements.map((measurement, measurementIdx) => (
                <tr key={`${idx}-${measurementIdx}`} className="border-b border-border hover:bg-muted/30 transition-colors">
                  {measurementIdx === 0 && (
                    <>
                      <td
                        rowSpan={record.measurements.length}
                        className="px-4 py-2"
                      >
                        {record.date}
                      </td>
                      <td
                        rowSpan={record.measurements.length}
                        className="px-4 py-2"
                      >
                        {record.productName}
                      </td>
                      <td
                        rowSpan={record.measurements.length}
                        className="px-4 py-2"
                      >
                        {record.lotNumber}
                      </td>
                      <td
                        rowSpan={record.measurements.length}
                        className="px-4 py-2"
                      >
                        {PRODUCT_TYPE_LABELS[record.productType]}
                      </td>
                      <td
                        rowSpan={record.measurements.length}
                        className="px-4 py-2"
                      >
                        {record.company}
                      </td>
                      <td
                        rowSpan={record.measurements.length}
                        className="px-4 py-2 text-xs"
                      >
                        {record.specification}
                      </td>
                      <td
                        rowSpan={record.measurements.length}
                        className="px-4 py-2"
                      >
                        {record.measurementTime}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2 font-mono font-semibold">
                    {measurement.material}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {parseFloat(measurement.value).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
