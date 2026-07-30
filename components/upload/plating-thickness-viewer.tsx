'use client'

import { useState, useEffect } from 'react'
import {
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
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

function RecordRow({
  record,
  onDelete,
  onEdit,
  checked,
  onCheck,
}: {
  record: PlatingRecord
  onDelete: (id: string) => Promise<void>
  onEdit: (record: PlatingRecord) => void
  checked: boolean
  onCheck: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* ── 헤더 (클릭하면 펼쳐짐) ── */}
      <div className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          e.stopPropagation()
          onCheck(record.id)
        }}
        className="w-4 h-4"
      />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <span className="text-muted-foreground shrink-0">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>

        {/* 업체 */}
        <span className="text-base font-semibold text-foreground hidden md:block shrink-0">{record.company}</span>

        {/* 품명 */}
        <span className="text-base flex-1 truncate">{record.productName}</span>

        {/* 로트번호 */}
        {record.lotNumber && (
          <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[120px]">
            LOT: {record.lotNumber}
          </span>
        )}

        {/* 날짜 */}
        <span className="text-base text-muted-foreground w-24 shrink-0">{record.date}</span>

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

        <div className="flex items-center gap-1">

          {/* 수정 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(record)
            }}
            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
            title="수정"
          >
            <Pencil className="w-4 h-4 text-primary" />
          </button>

          {/* 삭제 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(record.id)
            }}
            className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>

        </div>
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
                  <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">측정 일시</th>
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
                    <td className="px-4 py-3 text-center text-sm text-muted-foreground">{row.dateTime ?? '—'}</td>
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
  
  const [editingRecord, setEditingRecord] = useState<PlatingRecord | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  // 필터
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [lotNumber, setLotNumber] = useState('')

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

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return

    if (!confirm(`${selectedIds.length}개의 기록을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch('/api/plating-thickness', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id }),
          })
        )
      )

      setRecords(prev =>
        prev.filter(record => !selectedIds.includes(record.id))
      )

      setSelectedIds([])

      toast.success(`${selectedIds.length}건 삭제되었습니다.`)
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
  }
  
  const handleEdit = (record: PlatingRecord) => {
    setEditingRecord({
      ...record,
      rows: record.rows.map(row => ({
        ...row,
        values: [...row.values],
      })),
      materials: [...record.materials],
    })
  
    setEditOpen(true)
  }

  const handleExportToExcel = async () => {

    const exportRecords = records.filter(record =>
      selectedIds.includes(record.id)
    )
  
    if (exportRecords.length === 0) {
      toast.error('선택된 데이터가 없습니다.')
      return
    }
    setExporting(true)
    try {
      const ExcelJS = await import('exceljs')
      const { saveAs } = await import('file-saver')

      const workbook = new ExcelJS.Workbook()

      // 각 레코드를 하나의 행으로 표현 (모든 측정값을 가로로 나열)
      // 헤더: 날짜 | 품명 | 로트번호 | 초중종물 | 업체 | 도금사양 | 측정시간 | 비고 | Sn1 | Sn2 | ... | Sn6 | Ni1 | Ni2 | ...
      
      // 각 레코드의 최대 행 수 구하기
      const maxRowsPerRecord = Math.max(
        ...exportRecords.map(r => r.rows.length),
        1
      )
      
      // 전체 유니크 재질 수집
      const allMaterials = Array.from(
        new Set(exportRecords.flatMap(r => r.materials))
      )

      // 업체 + 재질별 그룹 생성
      const groupedRecords = exportRecords.reduce((acc, record) => {

        const materialKey = record.materials.join('_')
        const sheetName = `${record.company}_${materialKey}`

        if (!acc[sheetName]) {
          acc[sheetName] = []
        }

        acc[sheetName].push(record)

        return acc

      }, {} as Record<string, typeof records>)


      Object.entries(groupedRecords).forEach(([sheetName, sheetRecords]) => {

        const worksheet = workbook.addWorksheet(
          sheetName.substring(0,31)
        )
      
        worksheet.getRow(1).height = 10
      
      
        const materials = sheetRecords[0].materials
      
      
        const measurementCount = Math.max(
          ...sheetRecords.map(record =>
            record.rows.length * record.materials.length
          )
        )

        const measurementHeader:string[] = []

        for(let i = 0; i < measurementCount; i++){

          const material =
            materials[i % materials.length]

          const number =
            Math.floor(i / materials.length) + 1

          measurementHeader.push(
            `${material} #${number}`
          )
        }


        worksheet.addRow([
          '',
          '일자',
          '품명',
          'LOT',
          '초중종',
          '외관',
          '밀착',
          '도금두께',
          ...Array(measurementCount - 1).fill(''),
          '특이사항'
        ])


        worksheet.addRow([
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ...measurementHeader,
          ''
        ])

      // 측정 시작 위치 H
      const startCol = 8

      // 측정 끝 위치
      const endCol = startCol + measurementCount - 1

      worksheet.mergeCells('B2:B3')
      worksheet.mergeCells('C2:C3')
      worksheet.mergeCells('D2:D3')
      worksheet.mergeCells('E2:E3')
      worksheet.mergeCells('F2:F3')
      worksheet.mergeCells('G2:G3')

      worksheet.mergeCells(
        2,
        8,
        2,
        7 + measurementCount
      )

      const noteCol = 8 + measurementCount

      worksheet.mergeCells(
        2,
        noteCol,
        3,
        noteCol
      )

      const header1 = worksheet.getRow(2)
      const header2 = worksheet.getRow(3)

      ;[header1, header2].forEach(header => {
        header.eachCell((cell, colNumber) => {
      
          // A열 여백 제거
          if (colNumber === 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' },
            }
      
            cell.border = {
              top: { style: undefined },
              left: { style: undefined },
              bottom: { style: undefined },
              right: { style: undefined },
            }
      
            return
          }
      
          cell.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' },
          }
      
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '1F4E78' },
          }
      
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
          }
      
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        })
      })
        
      // 데이터 셀 스타일
      sheetRecords.forEach(record => {

        const values = record.rows
          .flatMap(row => row.values)
      
        const measurementValues = [
          ...values,
          ...Array(measurementCount - values.length).fill('')
        ].slice(0, measurementCount)
      
      
        worksheet.addRow([
          '',
          record.date,
          record.productName,
          record.lotNumber,
          PRODUCT_TYPE_LABELS[record.productType],
          'OK',
          '',
          ...measurementValues,
          record.note ?? ''
        ])
        
        })

      // 데이터 셀 스타일
      const columns = [
        { width: 5 },
        { width: 12 },
        { width: 20 },
        { width: 15 },
        { width: 9 },
        { width: 9 },
        { width: 20 },
      ]
      
      for (let i = 0; i < measurementCount; i++) {
        columns.push({
          width: 9,
        })
      }
      
      columns.push({
        width: 30,
      })
      
      worksheet.columns = columns
      
      
      worksheet.eachRow((row, rowNumber) => {

        if (rowNumber <= 3) return

        row.height = 140

        for (let colNumber = 1; colNumber <= columns.length; colNumber++) {

          const cell = row.getCell(colNumber)

          if (colNumber === 1) {
            cell.border = {}
            continue
          }

          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
          }

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        }
      })
    
    }) // Object.entries(groupedRecords) 종료

    const buffer = await workbook.xlsx.writeBuffer()

    saveAs(
      new Blob([buffer]),
      `도금두께_${new Date().toISOString().split('T')[0]}.xlsx`
    )

    toast.success('엑셀 파일이 다운로드되었습니다.')

    } catch (error) {
      console.error('[v0] Excel export error:', error)
      toast.error('엑셀 내보내기에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingRecord) return

    try {
      const res = await fetch('/api/plating-thickness', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingRecord),
      })

      if (!res.ok) throw new Error('수정 실패')

      toast.success('수정되었습니다.')

      setRecords(prev =>
        prev.map(record =>
          record.id === editingRecord.id ? editingRecord : record
        )
      )

      setEditOpen(false)
      setEditingRecord(null)
    } catch {
      toast.error('수정에 실패했습니다.')
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

  const companies = [...new Set(records.map(r => r.company))]
  const products = [
    ...new Set(
      records.map(r => r.productName.trim())
    )
  ].sort()
  const materials = [...new Set(records.flatMap(r => r.materials))]

  const productTypes = [
    { label: '초물', value: 'initial' },
    { label: '중물', value: 'middle' },
    { label: '종물', value: 'final' },
  ]
  const filteredRecords = records.filter(record => {

    if (
      selectedCompanies.length &&
      !selectedCompanies.includes(record.company)
    )
      return false
  
    if (
      selectedProducts.length &&
      !selectedProducts.includes(record.productName.trim())
    )
      return false
  
    if (
      selectedTypes.length &&
      !selectedTypes.includes(record.productType)
    )
      return false
  
    if (
      selectedMaterials.length &&
      !record.materials.some(mat => selectedMaterials.includes(mat))
    )
      return false
  
    if (
      lotNumber &&
      !record.lotNumber.toLowerCase().includes(lotNumber.toLowerCase())
    )
      return false
  
    if (startDate && record.date < startDate)
      return false
  
    if (endDate && record.date > endDate)
      return false
  
    return true
  })

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }
  
  
  const toggleSelectAll = () => {
  
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(
        filteredRecords.map(record => record.id)
      )
    }
  }

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">

      <p className="text-sm text-muted-foreground">
        총 {filteredRecords.length}개 측정 기록
      </p>

      <div className="flex items-center gap-2">

        <Button
          variant="outline"
          size="icon"
          onClick={() => setFiltersOpen(prev => !prev)}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleSelectAll}
        >
          {selectedIds.length === filteredRecords.length
            ? '전체 해제'
            : '전체 선택'}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          disabled={selectedIds.length === 0}
          onClick={handleDeleteSelected}
        >
          선택 삭제
        </Button>

        <Button
          onClick={handleExportToExcel}
          disabled={exporting || selectedIds.length === 0}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          엑셀 다운로드
        </Button>

      </div>
      </div>

      {/* ▼▼▼ 여기 추가 ▼▼▼ */}
      {filtersOpen && (
      <div className="border rounded-lg p-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <div>
            <Label>업체</Label>
              <MultiSelect
                options={companies}
                value={selectedCompanies}
                onChange={setSelectedCompanies}
              />
          </div>

          <div>
            <Label>품명</Label>
              <MultiSelect
                options={products}
                value={selectedProducts}
                onChange={setSelectedProducts}
              />
          </div>

          <div>
            <Label>초/중/종물</Label>
            <MultiSelect
              options={productTypes}
              value={selectedTypes}
              onChange={setSelectedTypes}
            />
          </div>

          <div>
            <Label>재질</Label>

            <MultiSelect
              options={materials}
              value={selectedMaterials}
              onChange={setSelectedMaterials}
            />
          </div>

          <div>
            <Label>시작일</Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <Label>종료일</Label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <Label>LOT 번호</Label>
            <Input
              value={lotNumber}
              onChange={e => setLotNumber(e.target.value)}
            />
          </div>

        </div>
      </div>
      )}

      <div className="space-y-2">
      {filteredRecords.map(record => (
        <RecordRow
          key={record.id}
          record={record}
          onDelete={handleDelete}
          onEdit={handleEdit}
          checked={selectedIds.includes(record.id)}
          onCheck={toggleSelect}
        />
      ))}
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>도금두께 수정</DialogTitle>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-5">

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <Label>날짜</Label>
                  <Input
                    type="date"
                    value={editingRecord.date}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        date: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>품명</Label>
                  <Input
                    value={editingRecord.productName}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        productName: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>LOT</Label>
                  <Input
                    value={editingRecord.lotNumber}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        lotNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>업체</Label>
                  <Input
                    value={editingRecord.company}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        company: e.target.value,
                      })
                    }
                  />
                </div>

              </div>


              <div>
                <Label>비고</Label>

                <Input
                  value={editingRecord.note}
                  onChange={e =>
                    setEditingRecord({
                      ...editingRecord,
                      note: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-3">

                <Label>측정값</Label>

                {/* 재질 헤더 */}
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns:
                      `100px repeat(${editingRecord.materials.length}, minmax(80px,1fr))`,
                  }}
                >
                  <div className="text-center text-sm font-semibold">
                    구분
                  </div>

                  {editingRecord.materials.map((material, index) => (
                    <Input
                      key={index}
                      value={material}
                      className="text-center font-semibold"
                      onChange={(e) => {
                        const materials = [...editingRecord.materials]

                        materials[index] = e.target.value

                        setEditingRecord({
                          ...editingRecord,
                          materials,
                        })
                      }}
                    />
                  ))}
                </div>


                {/* 측정 데이터 */}
                {editingRecord.rows.map((row, rowIndex) => (
                  <div
                    key={row.id}
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns:
                        `100px repeat(${editingRecord.materials.length}, minmax(80px,1fr))`,
                    }}
                  >

                    <div className="flex items-center justify-center text-sm">
                      측정 {rowIndex + 1}
                    </div>


                    {row.values.map((value, valueIndex) => (
                      <Input
                        key={valueIndex}
                        value={value}
                        onChange={e => {
                          const rows = [...editingRecord.rows]

                          rows[rowIndex].values[valueIndex] =
                            e.target.value

                          setEditingRecord({
                            ...editingRecord,
                            rows,
                          })
                        }}
                      />
                    ))}

                  </div>
                ))}

              </div>

            </div>
          )}

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              취소
            </Button>

            <Button onClick={handleSaveEdit}>
              저장
            </Button>

          </DialogFooter>

          </DialogContent>
      </Dialog>

    </div>
  )
}