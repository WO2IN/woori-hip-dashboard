'use client'

import { useState, useEffect } from 'react'
import {
  Download,
  Loader2,
  Trash2,
  Pencil,
  SlidersHorizontal,
  Search,
  Building2,
  Calendar,
  Package,
  Layers,
  Layers3,
  FileSpreadsheet,
  Check,
  RotateCcw,
  FileText,
  Clock,
  StickyNote,
  Hash,
  X,
  Filter,
  BarChart3,
  CheckSquare,
  Square,
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
  adhesionImage?: string
  createdAt: string
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  initial: '초물',
  middle: '중물',
  final: '종물',
}

const PRODUCT_TYPE_ORDER: Record<string, number> = {
  initial: 1,
  middle: 2,
  final: 3,
}

const TYPE_BADGE: Record<string, { label: string; badge: string; border: string; dot: string }> = {
  initial: {
    label: '초물',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
    border: 'bg-blue-500',
    dot: 'bg-blue-500',
  },
  middle: {
    label: '중물',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
    border: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  final: {
    label: '종물',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
    border: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
}

function RecordRow({
  record,
  onDelete,
  onEdit,
  onViewDetail,
  checked,
  onCheck,
}: {
  record: PlatingRecord
  onDelete: (id: string) => Promise<void>
  onEdit: (record: PlatingRecord) => void
  onViewDetail: (record: PlatingRecord) => void
  checked: boolean
  onCheck: (id: string) => void
}) {
  const typeInfo = TYPE_BADGE[record.productType] || {
    label: record.productType,
    badge: 'bg-muted text-muted-foreground border-border',
    border: 'bg-muted',
    dot: 'bg-muted-foreground',
  }

  return (
    <div
      onClick={() => onViewDetail(record)}
      className="group relative border border-border/70 rounded-2xl overflow-hidden bg-card/90 hover:bg-card hover:border-primary/50 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        {/* 타입별 왼쪽 포인트 컬러선 */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 transition-colors", typeInfo.border)} />

        {/* 체크박스 */}
        <div className="pl-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onCheck(record.id)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
          />
        </div>

        {/* 업체 뱃지 */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold shrink-0 min-w-[90px] justify-center">
          <Building2 className="w-3.5 h-3.5" />
          <span>{record.company}</span>
        </div>

        {/* 품명 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {record.productName}
            </span>
            <span className="md:hidden text-xs text-muted-foreground font-medium">({record.company})</span>
          </div>
        </div>

        {/* LOT 번호 */}
        {record.lotNumber && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs font-mono border border-border/50 shrink-0">
            <Hash className="w-3 h-3 text-muted-foreground/70" />
            <span>{record.lotNumber}</span>
          </div>
        )}

        {/* 날짜 */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0 w-28">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
          <span>{record.date}</span>
        </div>

        {/* 구분 뱃지 */}
        <div className={cn(
          'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0',
          typeInfo.badge
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', typeInfo.dot)} />
          <span>{typeInfo.label}</span>
        </div>

        {/* 재질 Chips */}
        <div className="hidden lg:flex items-center gap-1 shrink-0">
          {record.materials.map((mat, i) => (
            <span key={i} className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-muted/80 text-foreground border border-border/50">
              {mat}
            </span>
          ))}
        </div>

        {/* 측정 데이터 건수 */}
        <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground shrink-0">
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{record.rows.length}건</span>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 pl-2 border-l border-border/60 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(record)
            }}
            className="p-2 hover:bg-primary/10 rounded-xl text-muted-foreground hover:text-primary transition-colors"
            title="수정"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(record.id)
            }}
            className="p-2 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function PlatingThicknessViewer() {
  const [records, setRecords] = useState<PlatingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  
  const [editingRecord, setEditingRecord] = useState<PlatingRecord | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const [detailRecord, setDetailRecord] = useState<PlatingRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailImageError, setDetailImageError] = useState(false)

  const handleViewDetail = (record: PlatingRecord) => {
    setDetailRecord(record)
    setDetailImageError(false)
    setDetailOpen(true)
  }

  // 필터 및 검색
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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
  
    setEditImageFile(null)
  
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
      
      const maxRowsPerRecord = Math.max(
        ...exportRecords.map(r => r.rows.length),
        1
      )
      
      const allMaterials = Array.from(
        new Set(exportRecords.flatMap(r => r.materials))
      )

      const groupedRecords = exportRecords.reduce((acc, record) => {
        const materialKey = record.materials.join('_')
        const sheetName = `${record.company}_${materialKey}`
        if (!acc[sheetName]) {
          acc[sheetName] = []
        }
        acc[sheetName].push(record)
        return acc
      }, {} as Record<string, typeof records>)

      for (const [sheetName, sheetRecords] of Object.entries(groupedRecords)) {
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
          const material = materials[i % materials.length]
          const number = Math.floor(i / materials.length) + 1
          measurementHeader.push(`${material} #${number}`)
        }

        worksheet.addRow([
          '', '일자', '품명', 'LOT', '초중종', '외관', '밀착', '도금두께',
          ...Array(measurementCount - 1).fill(''), '특이사항'
        ])

        worksheet.addRow([
          '', '', '', '', '', '', '', ...measurementHeader, ''
        ])

        worksheet.mergeCells('B2:B3')
        worksheet.mergeCells('C2:C3')
        worksheet.mergeCells('D2:D3')
        worksheet.mergeCells('E2:E3')
        worksheet.mergeCells('F2:F3')
        worksheet.mergeCells('G2:G3')

        worksheet.mergeCells(2, 8, 2, 7 + measurementCount)

        const noteCol = 8 + measurementCount
        worksheet.mergeCells(2, noteCol, 3, noteCol)

        const header1 = worksheet.getRow(2)
        const header2 = worksheet.getRow(3)

        ;[header1, header2].forEach(header => {
          header.eachCell((cell, colNumber) => {
            if (colNumber === 1) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
              cell.border = { top: { style: undefined }, left: { style: undefined }, bottom: { style: undefined }, right: { style: undefined } }
              return
            }
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
          })
        })

        for (const record of sheetRecords) {
          const values = record.rows.flatMap(row => row.values)
          const measurementValues = [
            ...values,
            ...Array(measurementCount - values.length).fill('')
          ].slice(0, measurementCount)

          const dataRow = worksheet.addRow([
            '',
            record.date,
            record.productName,
            record.lotNumber,
            PRODUCT_TYPE_LABELS[record.productType],
            'OK',
            'OK',
            ...measurementValues,
            record.note ?? ''
          ])

          if (record.adhesionImage) {
            const imageUrl = record.adhesionImage.startsWith('/')
              ? record.adhesionImage
              : `/${record.adhesionImage}`

            const imageBuffer = await fetch(imageUrl).then(res => res.arrayBuffer())
            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension: 'png',
            })
            worksheet.addImage(imageId, {
              tl: {
                col: 6.18,
                row: dataRow.number - 0.75,
              },
              ext: {
                width: 140,
                height: 142,
              },
            })
          }
        }

        const columns = [
          { width: 5 }, { width: 12 }, { width: 20 }, { width: 15 },
          { width: 9 }, { width: 9 }, { width: 20 },
        ]
        for (let i = 0; i < measurementCount; i++) {
          columns.push({ width: 9 })
        }
        columns.push({ width: 30 })
        worksheet.columns = columns

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber <= 3) return
          row.height = 130
          for (let colNumber = 1; colNumber <= columns.length; colNumber++) {
            const cell = row.getCell(colNumber)
            if (colNumber === 1) {
              cell.border = {}
              continue
            }
            if (colNumber === 7) {
              cell.alignment = { horizontal: 'center', vertical: 'bottom' }
            } else {
              cell.alignment = { horizontal: 'center', vertical: 'middle' }
            }
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            }
          }
        })
      }

      const buffer = await workbook.xlsx.writeBuffer()
      saveAs(new Blob([buffer]), `도금두께_${new Date().toISOString().split('T')[0]}.xlsx`)
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
      let updatedRecord = { ...editingRecord }
      const originalRecord = records.find(r => r.id === editingRecord.id)
      const oldImage = originalRecord?.adhesionImage

      if (editImageFile) {
        const formData = new FormData()
        formData.append('file', editImageFile)

        const uploadRes = await fetch('/api/plating-thickness/upload', {
          method: 'POST',
          body: formData,
        })
        if (!uploadRes.ok) throw new Error('사진 업로드 실패')

        const uploadData = await uploadRes.json()

        if (oldImage) {
          await fetch('/api/plating-thickness/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: oldImage }),
          })
        }

        updatedRecord = {
          ...updatedRecord,
          adhesionImage: uploadData.url,
        }
      }  else if (oldImage && !editingRecord.adhesionImage) {
        await fetch('/api/plating-thickness/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: oldImage }),
        })
        updatedRecord = {
          ...updatedRecord,
          adhesionImage: '',
        }
      }

      const res = await fetch('/api/plating-thickness', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord),
      })

      if (!res.ok) throw new Error('수정 실패')

      toast.success('수정되었습니다.')

      setRecords(prev =>
        prev.map(record =>
          record.id === updatedRecord.id
            ? updatedRecord
            : record
        )
      )

      if (detailRecord && detailRecord.id === updatedRecord.id) {
        setDetailRecord(updatedRecord)
        setDetailOpen(true)
      }

      setEditOpen(false)
      setEditingRecord(null)
      setEditImageFile(null)
    } catch {
      toast.error('수정에 실패했습니다.')
    }
  }

  const handleCancelEdit = () => {
    setEditOpen(false)
    setEditingRecord(null)
    setEditImageFile(null)
    if (detailRecord) {
      setDetailOpen(true)
    }
  }

  const handleResetFilters = () => {
    setSelectedCompanies([])
    setSelectedProducts([])
    setSelectedTypes([])
    setSelectedMaterials([])
    setStartDate('')
    setEndDate('')
    setLotNumber('')
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <Layers3 className="w-6 h-6" />
        </div>
        <p className="text-base font-semibold text-foreground">등록된 도금두께 데이터가 없습니다.</p>
        <p className="text-xs text-muted-foreground">상단 메뉴에서 새로운 도금두께 측정 데이터를 업로드해 보세요.</p>
      </div>
    )
  }

  const companies = [...new Set(records.map(r => r.company))].sort()
  const products = [...new Set(records.map(r => r.productName.trim()))].sort()
  const materials = [...new Set(records.flatMap(r => r.materials))].sort()

  const productTypes = [
    { label: '초물', value: 'initial' },
    { label: '중물', value: 'middle' },
    { label: '종물', value: 'final' },
  ]

  const initialCount = records.filter(r => r.productType === 'initial').length
  const middleCount = records.filter(r => r.productType === 'middle').length
  const finalCount = records.filter(r => r.productType === 'final').length
  const latestRecordDate = records.length > 0
    ? records.map(r => r.date).sort((a, b) => b.localeCompare(a))[0]
    : '-'

  const activeFilterCount =
    selectedCompanies.length +
    selectedProducts.length +
    selectedTypes.length +
    selectedMaterials.length +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (lotNumber ? 1 : 0)

  const filteredRecords = records.filter(record => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = record.productName.toLowerCase().includes(q)
      const matchCompany = record.company.toLowerCase().includes(q)
      const matchLot = record.lotNumber.toLowerCase().includes(q)
      const matchSpec = record.specification.toLowerCase().includes(q)
      if (!matchName && !matchCompany && !matchLot && !matchSpec) return false
    }

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
  }).sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '')
    if (dateCompare !== 0) return dateCompare

    const orderA = PRODUCT_TYPE_ORDER[a.productType] || 99
    const orderB = PRODUCT_TYPE_ORDER[b.productType] || 99
    if (orderA !== orderB) return orderA - orderB

    return (a.createdAt || '').localeCompare(b.createdAt || '')
  })

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRecords.map(record => record.id))
    }
  }

  return (
    <div className="space-y-5">
      {/* 요약 KPI 카드 현황 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">총 측정 데이터</span>
            <div className="text-2xl font-bold tracking-tight text-foreground">{records.length}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></div>
            <p className="text-xs text-muted-foreground">필터 적용: {filteredRecords.length}건</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Layers3 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">등록 업체 수</span>
            <div className="text-2xl font-bold tracking-tight text-foreground">{companies.length}<span className="text-sm font-normal text-muted-foreground ml-1">개사</span></div>
            <p className="text-xs text-muted-foreground">관리 대상 협력사</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">공정구분 현황</span>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">초 {initialCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">중 {middleCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">종 {finalCount}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-0.5">초/중/종물 분포</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">최근 측정일</span>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono">{latestRecordDate}</div>
            <p className="text-xs text-muted-foreground">최신 측정 일시</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 상단 툴바 및 검색 제어 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/70 p-3 rounded-2xl shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="품명, 업체명, LOT 번호 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-10 rounded-xl border-border bg-background focus:ring-2 focus:ring-primary/20 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filtersOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFiltersOpen(prev => !prev)}
            className="h-10 rounded-xl gap-1.5 relative border-border"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>필터</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center ml-0.5">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="h-10 rounded-xl gap-1.5 border-border"
          >
            {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>{selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? '전체 해제' : '전체 선택'}</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={handleDeleteSelected}
            className="h-10 rounded-xl gap-1.5 shadow-2xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>선택 삭제{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}</span>
          </Button>

          <Button
            onClick={handleExportToExcel}
            disabled={exporting || selectedIds.length === 0}
            size="sm"
            className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs border-0"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>엑셀 다운로드</span>
          </Button>
        </div>
      </div>

      {/* 확장 필터 패널 */}
      {filtersOpen && (
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              세부 조건 검색
            </h4>
            {(activeFilterCount > 0 || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                필터 초기화
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">업체 선택</Label>
              <MultiSelect
                options={companies}
                value={selectedCompanies}
                onChange={setSelectedCompanies}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">품명 선택</Label>
              <MultiSelect
                options={products}
                value={selectedProducts}
                onChange={setSelectedProducts}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">초/중/종물 구분</Label>
              <MultiSelect
                options={productTypes}
                value={selectedTypes}
                onChange={setSelectedTypes}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">재질 선택</Label>
              <MultiSelect
                options={materials}
                value={selectedMaterials}
                onChange={setSelectedMaterials}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">LOT 번호 검색</Label>
              <Input
                placeholder="LOT 번호입력"
                value={lotNumber}
                onChange={e => setLotNumber(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* 결과 안내 Bar */}
      <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-xs font-semibold text-muted-foreground">
          검색 결과 <span className="text-primary font-bold">{filteredRecords.length}</span>건 / 전체 {records.length}건
        </p>
        {selectedIds.length > 0 && (
          <p className="text-xs text-primary font-medium">
            {selectedIds.length}개 항목 선택됨
          </p>
        )}
      </div>

      {/* 레코드 목록 */}
      <div className="space-y-2.5">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <RecordRow
              key={record.id}
              record={record}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onViewDetail={handleViewDetail}
              checked={selectedIds.includes(record.id)}
              onCheck={toggleSelect}
            />
          ))
        ) : (
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">검색 조건에 해당되는 데이터가 없습니다.</p>
            <p className="text-xs text-muted-foreground">필터 조건을 변경하거나 검색어를 확인해 보세요.</p>
            {(activeFilterCount > 0 || searchQuery) && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 rounded-xl">
                필터 초기화
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-6xl max-w-[92vw] max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
          <DialogHeader className="pb-4 border-b border-border/70">
            <DialogTitle className="text-xl font-bold flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span>도금두께 측정 상세 정보</span>
                  {detailRecord && (
                    <p className="text-xs font-normal text-muted-foreground mt-0.5">
                      {detailRecord.company} - {detailRecord.productName}
                    </p>
                  )}
                </div>
              </div>

              {detailRecord && (
                <span className={cn(
                  'text-xs font-semibold px-3 py-1 rounded-full border shrink-0 mr-6',
                  TYPE_BADGE[detailRecord.productType]?.badge ?? 'bg-muted text-muted-foreground border-border'
                )}>
                  {PRODUCT_TYPE_LABELS[detailRecord.productType] ?? detailRecord.productType}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailRecord && (
            <div className="space-y-6 py-4">
              {/* 요약 정보 카드 (8-grid) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" /> 측정 일자
                  </span>
                  <span className="text-sm font-bold text-foreground font-mono block">{detailRecord.date}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground/70" /> 업체명
                  </span>
                  <span className="text-sm font-bold text-foreground block">{detailRecord.company}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-muted-foreground/70" /> 품명
                  </span>
                  <span className="text-sm font-bold text-foreground block truncate">{detailRecord.productName}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground/70" /> LOT 번호
                  </span>
                  <span className="text-sm font-bold text-foreground font-mono block">{detailRecord.lotNumber || '-'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground/70" /> 재질
                  </span>
                  <span className="text-sm font-bold text-foreground block">{detailRecord.materials.join(', ') || '-'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground/70" /> 도금 사양
                  </span>
                  <span className="text-sm font-bold text-foreground block">{detailRecord.specification || '-'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/70" /> 측정 시간
                  </span>
                  <span className="text-sm font-bold text-foreground block">{detailRecord.measurementTime || '-'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5 text-muted-foreground/70" /> 비고
                  </span>
                  <span className="text-sm font-bold text-foreground block truncate">{detailRecord.note || '-'}</span>
                </div>
              </div>

              {/* 측정 데이터 및 밀착 사진 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 border border-border/80 rounded-2xl overflow-hidden bg-card shadow-2xs flex flex-col">
                  <div className="px-4 py-3 bg-muted/40 border-b border-border/80 flex items-center justify-between">
                    <h5 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      측정 데이터 ({detailRecord.rows.length}건)
                    </h5>
                    <span className="text-xs text-muted-foreground font-mono">단위: μm</span>
                  </div>

                  <div className="overflow-x-auto max-h-[360px] flex-1">
                    <table className="w-full text-sm text-left">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-md shadow-2xs z-10">
                        <tr className="border-b border-border/80">
                          <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground w-14 text-center">
                            No
                          </th>
                          {detailRecord.materials.map((mat, i) => (
                            <th key={i} className="px-4 py-2.5 text-center text-xs font-bold text-foreground">
                              {mat} <span className="text-muted-foreground font-normal">(μm)</span>
                            </th>
                          ))}
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                            측정 일시
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {detailRecord.rows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 text-center font-bold text-xs text-muted-foreground">
                              {idx + 1}
                            </td>
                            {row.values.map((val, ci) => (
                              <td key={ci} className="px-4 py-2.5 text-center font-mono font-medium text-foreground">
                                <span className="px-2 py-0.5 rounded bg-muted/40 border border-border/30 inline-block min-w-[60px]">
                                  {parseFloat(val) ? parseFloat(val).toFixed(3) : val || '—'}
                                </span>
                              </td>
                            ))}
                            <td className="px-4 py-2.5 text-center text-xs font-mono text-muted-foreground">
                              {row.dateTime ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-2xs flex flex-col">
                  <div className="px-4 py-3 bg-muted/40 border-b border-border/80">
                    <h5 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      밀착 시험 사진
                    </h5>
                  </div>
                  <div className="p-4 flex-1 flex items-center justify-center bg-muted/10 min-h-[240px]">
                    {detailRecord.adhesionImage && !detailImageError ? (
                      <img
                        src={detailRecord.adhesionImage}
                        alt="밀착 사진"
                        className="w-full h-full max-h-[300px] rounded-xl border border-border/80 bg-white object-contain shadow-2xs hover:scale-[1.02] transition-transform duration-200"
                        onError={() => setDetailImageError(true)}
                      />
                    ) : (
                      <div className="w-full h-full min-h-[220px] rounded-xl border border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center p-4 text-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">등록된 밀착 시험 사진이 없습니다</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
            {detailRecord && (
              <Button
                variant="outline"
                onClick={() => {
                  const recordToEdit = detailRecord
                  setDetailOpen(false)
                  handleEdit(recordToEdit)
                }}
                className="gap-1.5 rounded-xl"
              >
                <Pencil className="w-4 h-4 text-primary" />
                수정하기
              </Button>
            )}
            <Button variant="default" onClick={() => setDetailOpen(false)} className="rounded-xl">
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={editOpen} onOpenChange={(open) => {
        if (!open) {
          handleCancelEdit()
        } else {
          setEditOpen(true)
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              도금두께 측정 기록 수정
            </DialogTitle>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-5 py-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">측정 날짜</Label>
                  <Input
                    type="date"
                    value={editingRecord.date}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        date: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">구분 (초/중/종물)</Label>
                  <select
                    value={editingRecord.productType}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        productType: e.target.value as 'initial' | 'middle' | 'final',
                      })
                    }
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <option value="initial">초물</option>
                    <option value="middle">중물</option>
                    <option value="final">종물</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">품명</Label>
                  <Input
                    value={editingRecord.productName}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        productName: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">LOT 번호</Label>
                  <Input
                    value={editingRecord.lotNumber}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        lotNumber: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">업체명</Label>
                  <Input
                    value={editingRecord.company}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        company: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">도금 사양</Label>
                  <Input
                    value={editingRecord.specification || ''}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        specification: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1 block">비고</Label>
                <Input
                  value={editingRecord.note}
                  onChange={e =>
                    setEditingRecord({
                      ...editingRecord,
                      note: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
              <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">밀착 시험 사진</Label>
                  
                  {(editingRecord.adhesionImage || editImageFile) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRecord({
                          ...editingRecord,
                          adhesionImage: '',
                        })
                        setEditImageFile(null)
                      }}
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 px-2 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>사진 삭제</span>
                    </Button>
                  )}
                </div>
                {editingRecord.adhesionImage && !editImageFile ? (
                  <div className="border border-border/80 rounded-xl p-3 bg-muted/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={editingRecord.adhesionImage}
                        alt="기존 사진"
                        className="w-12 h-12 rounded-lg object-contain border bg-white shrink-0"
                      />
                      <div>
                        <p className="text-xs font-bold text-foreground">기존 등록된 사진</p>
                        <p className="text-[11px] text-muted-foreground">우측 상단 버튼으로 사진을 삭제할 수 있습니다.</p>
                      </div>
                    </div>
                    <label
                      htmlFor="edit-adhesion-image"
                      className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium cursor-pointer hover:bg-muted transition-colors shrink-0"
                    >
                      사진 변경
                    </label>
                  </div>
                ) : editImageFile ? (
                  <div className="border border-primary/30 rounded-xl p-3 bg-primary/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        NEW
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground truncate max-w-[200px]">{editImageFile.name}</p>
                        <p className="text-[11px] text-primary">새로운 사진이 선택되었습니다.</p>
                      </div>
                    </div>
                    <label
                      htmlFor="edit-adhesion-image"
                      className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium cursor-pointer hover:bg-muted transition-colors shrink-0"
                    >
                      다시 선택
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="edit-adhesion-image"
                    className="
                      flex h-20 cursor-pointer flex-col items-center justify-center
                      rounded-xl border-2 border-dashed border-border/80
                      bg-muted/20 hover:bg-muted/40 transition-colors gap-1
                    "
                  >
                    <FileText className="w-5 h-5 text-muted-foreground/60" />
                    <span className="text-xs font-medium text-muted-foreground">
                      클릭하여 새 사진 등록
                    </span>
                  </label>
                )}

                <input
                  id="edit-adhesion-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null
                    if (file) {
                      setEditImageFile(file)
                    }
                  }}
                />
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-xs font-bold text-foreground block">측정 데이터 값</Label>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns:
                      `100px repeat(${editingRecord.materials.length}, minmax(80px,1fr))`,
                  }}
                >
                  <div className="text-center text-xs font-bold text-muted-foreground flex items-center justify-center">
                    구분
                  </div>

                  {editingRecord.materials.map((material, index) => (
                    <Input
                      key={index}
                      value={material}
                      className="text-center font-bold text-xs rounded-xl"
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

                {editingRecord.rows.map((row, rowIndex) => (
                  <div
                    key={row.id}
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns:
                        `100px repeat(${editingRecord.materials.length}, minmax(80px,1fr))`,
                    }}
                  >
                    <div className="flex items-center justify-center text-xs font-medium text-muted-foreground">
                      측정 {rowIndex + 1}
                    </div>

                    {row.values.map((value, valueIndex) => (
                      <Input
                        key={valueIndex}
                        value={value}
                        className="font-mono text-center text-xs rounded-xl"
                        onChange={e => {
                          const rows = [...editingRecord.rows]
                          rows[rowIndex].values[valueIndex] = e.target.value
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

          <DialogFooter className="pt-3 border-t border-border/60 gap-2">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              className="rounded-xl"
            >
              취소
            </Button>

            <Button onClick={handleSaveEdit} className="rounded-xl">
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}