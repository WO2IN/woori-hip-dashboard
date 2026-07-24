'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, Trash2, ClipboardPaste, CloudUpload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const PdfDragPreview = dynamic(
  () =>
    import('@/components/upload/pdf-drag-preview').then(
      mod => mod.PdfDragPreview
    ),
  { ssr: false }
)

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
  pdfFile?: string
  createdAt: string
}

const PRODUCT_TYPE_OPTIONS = [
  { label: '초물', value: 'initial' },
  { label: '중물', value: 'middle' },
  { label: '종물', value: 'final' },
]

const DEFAULT_MATERIALS = ['Sn', 'Ni']
const DEFAULT_ROW_COUNT = 6
const MATERIAL_SUGGESTIONS = ['Sn', 'Ni', 'Cu', 'Au', 'Zn', 'Ag']

const saveConfigValue = async (name: string, value: string) => {
  if (!value.trim()) return
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, value }),
    })
  } catch {}
}

// ── 파싱 헬퍼 ──────────────────────────────────────────────────────────────
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
    const companyMatch = line.match(/업체명\s*[:：]?\s*(.+?)(?:\s{2,}|$)/)
    if (companyMatch) result.company = companyMatch[1].trim()

    const materialHeaderMatch = line.match(/([A-Z][a-z]?)\s*:\s*[\d.]+\s*[~－\-]\s*[\d.]+\s*[μu㎛㎛]?[μu]?[m]?/g)
    if (materialHeaderMatch && materialHeaderMatch.length > 0) {
      result.materials = materialHeaderMatch.map(m => m.match(/^([A-Z][a-z]?)/)![1])
      result.specification = materialHeaderMatch.join(' ').replace(/\s+/g, ' ').trim()
    }

    if (line.includes('초물')) result.productType = 'initial'
    else if (line.includes('중물')) result.productType = 'middle'
    else if (line.includes('종물')) result.productType = 'final'

    const productMatch = line.match(/품명\s*[:：]\s*(.+?)(?:\s{2,}|$)/)
    if (productMatch) result.productName = productMatch[1].trim()

    const lotMatch = line.match(/로트번호\s*[:：]\s*(.+)/)
    if (lotMatch && lotMatch[1].trim()) result.lotNumber = lotMatch[1].trim()

    const dateMatch = line.match(/(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/)
    if (dateMatch && !result.date) {
      result.date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
    }
  }

  const dataRows: { values: string[]; dateTime?: string }[] = []
  const matCount = result.materials?.length ?? DEFAULT_MATERIALS.length

  for (const line of lines) {
    if (/^No\s/i.test(line)) continue
    if (/최대값|최소값|범위|평균값|표준편차|변동계수/i.test(line)) continue

    const parts = line.split(/\t|\s{2,}/).map(p => p.trim()).filter(Boolean)
    if (parts.length >= matCount + 1 && /^\d+$/.test(parts[0])) {
      const values = parts.slice(1, 1 + matCount)
      const allNumeric = values.every(v => !isNaN(parseFloat(v)))
      if (allNumeric) {
        const rest = parts.slice(1 + matCount).join(' ')
        const dtMatch = rest.match(/\d{4}[-./]\d{1,2}[-./]\d{1,2}[\s\S]*?\d{1,2}:\d{2}(:\d{2})?/)
        dataRows.push({ values, dateTime: dtMatch ? dtMatch[0].trim() : undefined })
      }
    }
  }

  if (dataRows.length > 0) result.rows = dataRows
  return result
}

function newRow(matCount: number): MeasurementRow {
  return { id: `${Date.now()}-${Math.random()}`, values: Array(matCount).fill('') }
}

function makeDefaultRows(matCount: number): MeasurementRow[] {
  return Array.from({ length: DEFAULT_ROW_COUNT }, () => newRow(matCount))
}

// ── 컴포넌트 ───────────────────────────────────────────────────────────────
export function PlatingThicknessForm({ onSuccess }: { onSuccess?: () => void }) {
  const [date, setDate] = useState('')
  const [productName, setProductName] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [productType, setProductType] = useState('')
  const [company, setCompany] = useState('')
  const [specification, setSpecification] = useState('')
  const [measurementTime, setMeasurementTime] = useState('')
  const [note, setNote] = useState('')

  const [materials, setMaterials] = useState<string[]>(DEFAULT_MATERIALS)
  const [rows, setRows] = useState<MeasurementRow[]>(makeDefaultRows(DEFAULT_MATERIALS.length))

  // PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [companies, setCompanies] = useState<string[]>(['넥스플러스', '한중'])
  const [recentCompanies, setRecentCompanies] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const pasteAreaRef = useRef<HTMLTextAreaElement>(null)

  const loadCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/config?name=plating-companies', { cache: 'no-store' })
      const data = await res.json()
      if (data.data && data.data.length > 0) {
        setCompanies(data.data)
      } else {
        await saveConfigValue('plating-companies', '넥스플러스')
        await saveConfigValue('plating-companies', '한중')
      }
    } catch {}
  }, [])

  useEffect(() => { loadCompanies() }, [loadCompanies])

  // ── PDF 드래그앤드롭 ─────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type === 'application/pdf') setPdfFile(f)
    else toast.error('PDF 파일만 업로드 가능합니다.')
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setPdfFile(f)
  }

  // ── 붙여넣기 ────────────────────────────────────────────────────────────
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    applyParsed(text)
    e.currentTarget.value = ''
    e.preventDefault()
  }

  const applyParsed = (text: string) => {
    const parsed = parseClipboardText(text)
    const changed: string[] = []

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

    if (changed.length > 0) toast.success(`자동 입력됨: ${changed.join(', ')}`)
    else toast.error('인식할 수 있는 데이터가 없습니다.')
  }

  // ── 재질(열) 조작 ────────────────────────────────────────────────────────
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

  // ── 측정 행 조작 ─────────────────────────────────────────────────────────
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
  const updateDateTime = (rowId: string, val: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, dateTime: val } : r))
  }

  // ── 저장 ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!date) { toast.error('측정 날짜를 입력해주세요.'); return }
    if (!productName) { toast.error('품명을 입력해주세요.'); return }
    if (!productType) { toast.error('초/중/종물을 선택해주세요.'); return }
    if (!company) { toast.error('업체를 선택해주세요.'); return }
    if (materials.some(m => !m.trim())) { toast.error('재질명을 모두 입력해주세요.'); return }

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
        rows: rows.filter(r => r.values.some(v => v !== '')),
        specification,
        measurementTime,
        note,
        createdAt: new Date().toISOString(),
      }

      const res = await fetch('/api/plating-thickness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      if (!res.ok) throw new Error('저장 실패')

      await saveConfigValue('plating-companies', company)
      toast.success('도금두께가 성공적으로 ���록되었습니다.')

      setDate(''); setProductName(''); setLotNumber('')
      setProductType(''); setCompany(''); setSpecification('')
      setMeasurementTime(''); setNote(''); setPdfFile(null)
      setMaterials(DEFAULT_MATERIALS)
      setRows(makeDefaultRows(DEFAULT_MATERIALS.length))
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <div
      className={cn(
        'mx-auto items-stretch gap-6',
        pdfFile
          ? 'max-w-[1500px] grid grid-cols-[minmax(500px,768px)_minmax(550px,1fr)]'
          : 'max-w-3xl'
      )}
    >
      {/* 왼쪽: 폼 */}
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

      {/* ── PDF 첨부 ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !pdfFile && fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-5 text-center transition-all',
          !pdfFile && 'cursor-pointer',
          dragging
            ? 'border-primary bg-accent'
            : pdfFile
              ? 'border-green-400 bg-green-50 dark:bg-green-950/20'
              : 'border-border hover:border-primary/60 hover:bg-accent/40'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        {pdfFile ? (
          <div className="flex items-center justify-between gap-3">
            <div className="text-left">
              <p className="font-semibold text-foreground text-sm">{pdfFile.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={e => { e.stopPropagation(); setPdfFile(null) }}
              className="gap-1.5 h-7 text-xs shrink-0"
            >
              <X className="w-3 h-3" /> 파일 제거
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              dragging ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              <CloudUpload className={cn('w-5 h-5', dragging ? 'text-primary-foreground' : 'text-muted-foreground')} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">PDF 파일 첨부 (선택)</p>
              <p className="text-xs text-muted-foreground mt-0.5">드래그하거나 클릭하여 선택 · PDF만 지원</p>
            </div>
          </div>
        )}
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
              <SearchableCombobox
                configName="plating-companies"
                options={companies}
                recentOptions={recentCompanies}
                value={company}
                onChange={val => {
                  setCompany(val)
                  setRecentCompanies(prev => [val, ...prev.filter(c => c !== val)].slice(0, 5))
                }}
                onOptionsChange={setCompanies}
                placeholder="업체 선택 또는 입력..."
              />
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

            <div className="space-y-1.5">
              <Label className="text-sm">측정시간</Label>
              <Input type="time" value={measurementTime} onChange={e => setMeasurementTime(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">비고</Label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="비고 입력" />
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
                    <th key={colIdx} className="px-2 py-2 text-center text-xs font-semibold min-w-[110px]">
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
                  <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground min-w-[160px]">
                    측정시간
                  </th>
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
                    <td className="px-2 py-1.5">
                      <Input
                        value={row.dateTime ?? ''}
                        onChange={e => updateDateTime(row.id, e.target.value)}
                        placeholder="측정 일시"
                        className="text-sm h-8 min-w-[150px]"
                      />
                    </td>
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

      {/* 오른쪽: PDF 미리보기 */}
      {pdfFile && (
        <div className="sticky top-5 min-h-0 max-h-[calc(100vh-60px)] overflow-y-auto">
          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-md min-h-0">
            <PdfDragPreview file={pdfFile} />
          </div>
        </div>
      )}
    </div>
  )
}
