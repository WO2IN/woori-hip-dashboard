'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, ClipboardPaste } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface MeasurementRow {
  id: string
  values: string[]  // 재질별 측정값, materials 배열과 순서 동일
  dateTime?: string
}

interface PlatingRecord {
  id: string
  date: string
  productName: string
  lotNumber: string
  productType: 'initial' | 'middle' | 'final'
  company: string
  materials: string[]       // 헤더: 재질 목록
  rows: MeasurementRow[]    // 측정 행
  specification: string
  measurementTime: string
  createdAt: string
}

const PRODUCT_TYPE_OPTIONS = [
  { label: '초물', value: 'initial' },
  { label: '중물', value: 'middle' },
  { label: '종물', value: 'final' },
]
const COMPANY_OPTIONS = ['넥스플러스', '업체2']
const MATERIAL_SUGGESTIONS = ['Sn', 'Ni', 'Cu', 'Au', 'Zn', 'Ag']

// ── 파싱 헬퍼 ──────────────────────────────────────────────
function parseClipboardText(text: string) {
  const result: Partial<{
    productName: string
    company: string
    lotNumber: string
    productType: string
    date: string
    specification: string
    materials: string[]
    rows: { values: string[]; dateTime?: string }[]
  }> = {}

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    // 업체명
    const companyMatch = line.match(/업체명\s*[:：]?\s*(.+?)(?:\s{2,}|$)/)
    if (companyMatch) {
      result.company = companyMatch[1].trim()
    }

    // 도금사양 (Sn/Ni 같은 재질 및 사양)
    const specMatch = line.match(/([A-Z][a-z]?\s*:\s*[\d.]+~[\d.]+\s*[μu]m)/)
    // 재질 헤더 파싱 — "Sn : 5.0~9.0㎛  Ni : 1.0~5.0㎛" 형태에서 재질 추출
    const materialHeaderMatch = line.match(/([A-Z][a-z]?)\s*:\s*[\d.]+\s*[~－]\s*[\d.]+\s*[μu㎛]/g)
    if (materialHeaderMatch && materialHeaderMatch.length > 0) {
      result.materials = materialHeaderMatch.map(m => m.match(/^([A-Z][a-z]?)/)![1])
      result.specification = line.replace(/\s+/g, ' ').trim()
    }

    // 초/중/종물
    if (line.includes('초물')) result.productType = 'initial'
    else if (line.includes('중물')) result.productType = 'middle'
    else if (line.includes('종물')) result.productType = 'final'

    // 품명
    const productMatch = line.match(/품명\s*[:：]\s*(.+?)(?:\s{2,}|$)/)
    if (productMatch) {
      result.productName = productMatch[1].trim()
    }

    // 로트번호
    const lotMatch = line.match(/로트번호\s*[:：]\s*(.+)/)
    if (lotMatch && lotMatch[1].trim()) {
      result.lotNumber = lotMatch[1].trim()
    }

    // 날짜 (YYYY.MM.DD 또는 YYYY-MM-DD)
    const dateMatch = line.match(/(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/)
    if (dateMatch && !result.date) {
      result.date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
    }
  }

  // 측정값 행 파싱 — "숫자\t값1\t값2\t날짜시간\t코멘트" 형태
  // 또는 "숫자\t값1\t값2" 형태
  const dataRows: { values: string[]; dateTime?: string }[] = []
  const matCount = result.materials?.length ?? 1

  for (const line of lines) {
    // No 헤더 행은 skip
    if (/^No\s/i.test(line)) continue
    // 최대값/최소값 등 통계 행은 skip
    if (/최대값|최소값|범위|평균값|표준편차|변동계수/i.test(line)) continue

    // 탭 또는 여러 공백으로 구분된 숫자 행 감지
    const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(Boolean)
    // 첫 번째 토큰이 정수(번호)이고, 이후에 matCount개 이상의 숫자가 있으면 측정 행
    if (parts.length >= matCount + 1 && /^\d+$/.test(parts[0])) {
      const values = parts.slice(1, 1 + matCount)
      const allNumeric = values.every(v => !isNaN(parseFloat(v)))
      if (allNumeric) {
        // 날짜/시간이 뒤에 있으면 추출
        const dateTimePart = parts.slice(1 + matCount).join(' ')
        const dtMatch = dateTimePart.match(/(\d{4}-\d{2}-\d{2}\s+\S+\s+\d{1,2}:\d{2}:\d{2})/)
        dataRows.push({
          values,
          dateTime: dtMatch ? dtMatch[1] : undefined,
        })
      }
    }
  }

  if (dataRows.length > 0) {
    result.rows = dataRows
  }

  return result
}

function newRow(matCount: number): MeasurementRow {
  return { id: Date.now().toString() + Math.random(), values: Array(matCount).fill('') }
}

export function PlatingThicknessForm({ onSuccess }: { onSuccess?: () => void }) {
  const [date, setDate] = useState('')
  const [productName, setProductName] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [productType, setProductType] = useState('')
  const [company, setCompany] = useState('')
  const [specification, setSpecification] = useState('')
  const [measurementTime, setMeasurementTime] = useState('')

  // 새 스키마: 재질 헤더 + 측정 행
  const [materials, setMaterials] = useState<string[]>(['Sn'])
  const [rows, setRows] = useState<MeasurementRow[]>([newRow(1)])

  const [submitting, setSubmitting] = useState(false)
  const pasteAreaRef = useRef<HTMLTextAreaElement>(null)

  // ── 붙여넣기 파싱 ──────────────────────────────────────
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    applyParsed(text)
    e.currentTarget.value = ''
    e.preventDefault()
  }

  const applyParsed = (text: string) => {
    const parsed = parseClipboardText(text)
    let changed: string[] = []

    if (parsed.date) { setDate(parsed.date); changed.push('날짜') }
    if (parsed.productName) { setProductName(parsed.productName); changed.push('품명') }
    if (parsed.lotNumber) { setLotNumber(parsed.lotNumber); changed.push('로트번호') }
    if (parsed.productType) { setProductType(parsed.productType); changed.push('초/중/종물') }
    if (parsed.company) { setCompany(parsed.company); changed.push('업체명') }
    if (parsed.specification) { setSpecification(parsed.specification); changed.push('도금사양') }

    const mats = parsed.materials && parsed.materials.length > 0 ? parsed.materials : materials
    if (parsed.materials && parsed.materials.length > 0) {
      setMaterials(mats)
      changed.push(`재질(${mats.join(', ')})`)
    }

    if (parsed.rows && parsed.rows.length > 0) {
      const newRows: MeasurementRow[] = parsed.rows.map((r, i) => ({
        id: `parsed-${i}-${Date.now()}`,
        values: r.values.length >= mats.length
          ? r.values.slice(0, mats.length)
          : [...r.values, ...Array(mats.length - r.values.length).fill('')],
        dateTime: r.dateTime,
      }))
      setRows(newRows)
      changed.push(`측정값 ${newRows.length}행`)
    }

    if (changed.length > 0) {
      toast.success(`자동 입력됨: ${changed.join(', ')}`)
    } else {
      toast.error('인식할 수 있는 데이터가 없습니다.')
    }
  }

  // ── 재질(열) 조작 ───────────────────────────────────────
  const addMaterial = () => {
    setMaterials(prev => [...prev, ''])
    setRows(prev => prev.map(r => ({ ...r, values: [...r.values, ''] })))
  }

  const removeMaterial = (colIdx: number) => {
    if (materials.length <= 1) { toast.error('재질은 최소 1개 필요합니다.'); return }
    setMaterials(prev => prev.filter((_, i) => i !== colIdx))
    setRows(prev => prev.map(r => ({ ...r, values: r.values.filter((_, i) => i !== colIdx) })))
  }

  const updateMaterial = (colIdx: number, val: string) => {
    setMaterials(prev => prev.map((m, i) => i === colIdx ? val : m))
  }

  // ── 측정 행 조작 ────────────────────────────────────────
  const addRow = () => setRows(prev => [...prev, newRow(materials.length)])

  const removeRow = (id: string) => {
    if (rows.length <= 1) { toast.error('최소 1행은 필요합니다.'); return }
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const updateCell = (rowId: string, colIdx: number, val: string) => {
    setRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, values: r.values.map((v, i) => i === colIdx ? val : v) } : r
    ))
  }

  // ── 저장 ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!date) { toast.error('측정 날짜를 입력해주세요.'); return }
    if (!productName) { toast.error('품명을 입력해주세요.'); return }
    if (!productType) { toast.error('초/중/종물을 선택해주세요.'); return }
    if (!company) { toast.error('업체를 선택해주세요.'); return }
    if (materials.some(m => !m.trim())) { toast.error('재질명을 모두 입력해주세요.'); return }
    if (rows.some(r => r.values.some(v => v === ''))) { toast.error('모든 측정값을 입력해주세요.'); return }

    setSubmitting(true)
    try {
      const record: PlatingRecord = {
        id: Date.now().toString(),
        date,
        productName,
        lotNumber,
        productType: productType as PlatingRecord['productType'],
        company,
        materials,
        rows,
        specification,
        measurementTime,
        createdAt: new Date().toISOString(),
      }

      const res = await fetch('/api/plating-thickness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      if (!res.ok) throw new Error('저장 실패')

      toast.success('도금두께가 성공적으로 등록되었습니다.')
      setDate(''); setProductName(''); setLotNumber('')
      setProductType(''); setCompany(''); setSpecification(''); setMeasurementTime('')
      setMaterials(['Sn']); setRows([newRow(1)])
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <div className="space-y-5">

      {/* ── 붙여넣기 영역 ── */}
      <div className="bg-card border border-dashed border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <ClipboardPaste className="w-3.5 h-3.5" />
          측정기 데이터 붙여넣기
        </div>
        <textarea
          ref={pasteAreaRef}
          onPaste={handlePaste}
          placeholder="측정기에서 복사한 텍스트를 여기에 붙여넣으세요 (Ctrl+V)"
          rows={3}
          className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {/* ── 기본 정보 ── */}
        <div className="px-5 py-4 border-b border-border bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">기본 정보</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">측정 날짜 <span className="text-destructive">*</span></Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">업체 <span className="text-destructive">*</span></Label>
              <select value={company} onChange={e => setCompany(e.target.value)} className={selectClass}>
                <option value="">선택해주세요</option>
                {COMPANY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">품명 <span className="text-destructive">*</span></Label>
              <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="제품명 입력" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">로트번호</Label>
              <Input value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="LOT 번호" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">초/중/종물 <span className="text-destructive">*</span></Label>
              <select value={productType} onChange={e => setProductType(e.target.value)} className={selectClass}>
                <option value="">선택해주세요</option>
                {PRODUCT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">도금사양</Label>
              <Input value={specification} onChange={e => setSpecification(e.target.value)} placeholder="예: Sn 5~9μm / Ni 1~5μm" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-sm">측정시간</Label>
              <Input type="time" value={measurementTime} onChange={e => setMeasurementTime(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── 측정값 테이블 ── */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">도금두께 측정값</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> 행 추가
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addMaterial} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> 재질 추가
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-10">No</th>
                  {materials.map((mat, colIdx) => (
                    <th key={colIdx} className="px-2 py-2 text-center text-xs font-semibold min-w-[100px]">
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          value={mat}
                          onChange={e => updateMaterial(colIdx, e.target.value)}
                          list="material-suggestions"
                          placeholder="재질"
                          className="w-16 text-center bg-transparent border-b border-border focus:outline-none focus:border-primary text-xs font-semibold py-0.5"
                        />
                        {materials.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMaterial(colIdx)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{rowIdx + 1}</td>
                    {row.values.map((val, colIdx) => (
                      <td key={colIdx} className="px-2 py-1.5 text-center">
                        <Input
                          type="number"
                          step="0.001"
                          value={val}
                          onChange={e => updateCell(row.id, colIdx, e.target.value)}
                          placeholder="0.000"
                          className="text-center text-sm font-mono h-8 w-full min-w-[80px]"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="material-suggestions">
              {MATERIAL_SUGGESTIONS.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>
        </div>

        {/* ── 액션 ── */}
        <div className="px-5 py-4 border-t border-border bg-muted/10 flex gap-3">
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-[110px]">
            {submitting ? '저장 중...' : '등록하기'}
          </Button>
        </div>
      </div>
    </div>
  )
}
