'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

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

const MATERIAL_OPTIONS = ['Sn', 'Ni', 'Cu', 'Au', 'Zn', 'Ag']
const PRODUCT_TYPE_OPTIONS = [
  { label: '초물', value: 'initial' },
  { label: '중물', value: 'middle' },
  { label: '종물', value: 'final' },
]
const COMPANY_OPTIONS = ['업체1', '업체2']

export function PlatingThicknessForm({
  onSuccess,
}: {
  onSuccess?: () => void
}) {
  const [date, setDate] = useState('')
  const [productName, setProductName] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [productType, setProductType] = useState('')
  const [company, setCompany] = useState('')
  const [specification, setSpecification] = useState('')
  const [measurementTime, setMeasurementTime] = useState('')
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([
    { id: '1', material: '', value: '' },
  ])
  const [submitting, setSubmitting] = useState(false)

  const handleAddMeasurement = () => {
    setMeasurements([
      ...measurements,
      { id: Date.now().toString(), material: '', value: '' },
    ])
  }

  const handleRemoveMeasurement = (id: string) => {
    if (measurements.length === 1) {
      toast.error('최소 1개의 측정값은 필요합니다.')
      return
    }
    setMeasurements(measurements.filter(m => m.id !== id))
  }

  const handleMeasurementChange = (
    id: string,
    field: 'material' | 'value',
    value: string
  ) => {
    setMeasurements(
      measurements.map(m =>
        m.id === id ? { ...m, [field]: value } : m
      )
    )
  }

  const handleSubmit = async () => {
    // 필수 필드 검증
    if (!date) {
      toast.error('측정 날짜를 입력해주세요.')
      return
    }
    if (!productName) {
      toast.error('품명을 입력해주세요.')
      return
    }
    if (!lotNumber) {
      toast.error('로트번호를 입력해주세요.')
      return
    }
    if (!productType) {
      toast.error('상품 유형을 선택해주세요.')
      return
    }
    if (!company) {
      toast.error('업체를 선택해주세요.')
      return
    }
    if (measurements.some(m => !m.material || !m.value)) {
      toast.error('모든 재질과 측정값을 입력해주세요.')
      return
    }

    setSubmitting(true)

    try {
      const newRecord: PlatingRecord = {
        id: Date.now().toString(),
        date,
        productName,
        lotNumber,
        productType: productType as 'initial' | 'middle' | 'final',
        company,
        measurements,
        specification,
        measurementTime,
        createdAt: new Date().toISOString(),
      }

      const response = await fetch('/api/plating-thickness', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRecord),
      })

      if (!response.ok) {
        throw new Error('저장 실패')
      }

      toast.success('도금두께가 성공적으로 등록되었습니다.')

      // 폼 초기화
      setDate('')
      setProductName('')
      setLotNumber('')
      setProductType('')
      setCompany('')
      setSpecification('')
      setMeasurementTime('')
      setMeasurements([{ id: '1', material: '', value: '' }])

      onSuccess?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '등록에 실패했습니다.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* 기본 정보 섹션 */}
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            기본 정보
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">
                측정 날짜 <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                품명 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="제품명 입력"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                로트번호 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={lotNumber}
                onChange={e => setLotNumber(e.target.value)}
                placeholder="LOT 번호 입력"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                상품 유형 <span className="text-destructive">*</span>
              </Label>
              <select
                value={productType}
                onChange={e => setProductType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">선택해주세요</option>
                {PRODUCT_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                업체 <span className="text-destructive">*</span>
              </Label>
              <select
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">선택해주세요</option>
                {COMPANY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">도금사양</Label>
              <Input
                value={specification}
                onChange={e => setSpecification(e.target.value)}
                placeholder="예: Ni 2-5μm, Sn 5-10μm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">측정시간</Label>
              <Input
                type="time"
                value={measurementTime}
                onChange={e => setMeasurementTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 측정값 섹션 */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              도금두께 측정값
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddMeasurement}
              className="gap-1.5 h-7 text-xs"
            >
              <Plus className="w-3 h-3" />
              재질 추가
            </Button>
          </div>

          <div className="space-y-3">
            {measurements.map((measurement, index) => (
              <div key={measurement.id} className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">재질</Label>
                  <select
                    value={measurement.material}
                    onChange={e =>
                      handleMeasurementChange(
                        measurement.id,
                        'material',
                        e.target.value
                      )
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">선택</option>
                    {MATERIAL_OPTIONS.map(mat => (
                      <option key={mat} value={mat}>
                        {mat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">측정값 (μm)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={measurement.value}
                    onChange={e =>
                      handleMeasurementChange(
                        measurement.id,
                        'value',
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMeasurement(measurement.id)}
                  className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 */}
        <div className="px-5 py-4 border-t border-border flex gap-3 bg-muted/10">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="default"
            className="gap-2 min-w-[110px]"
          >
            {submitting ? '저장 중...' : '등록하기'}
          </Button>
        </div>
      </div>
    </div>
  )
}
