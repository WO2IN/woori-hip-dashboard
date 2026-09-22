'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle, CloudUpload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { notifyDataChanged, useDataChanged } from '@/lib/data-events'
import { normalizeLot, normalizeRegisteredLot, buildLotEnd, normalizeIssueDate } from '@/lib/lot'
import dynamic from 'next/dynamic'
import { getSession, buildAuthHeaders } from '@/lib/auth-client'

const saveConfigValue = async (
  name: string,
  value: string
) => {
  if (!value.trim()) return

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        value,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || '설정 저장 실패')
    }

  } catch (error) {
    console.error(`${name} 저장 실패:`, error)
  }
}

const PdfDragPreview = dynamic(
  () =>
    import('@/components/upload/pdf-drag-preview').then(
      mod => mod.PdfDragPreview
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        PDF 미리보기 불러오는 중...
      </div>
    ),
  }
)

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function normalizeDate(date: string) {
  if (!date) return ''

  if (date.includes('-')) {
    const [year, month, day] = date.split('-')
    if (year && month && day) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }

  if (date.includes('.')) {
    const [y, m, d] = date.split('.')
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return date
}

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const [formHeight, setFormHeight] = useState(0)

  // Required fields
  const [documentType, setDocumentType] = useState('')
  const [company, setCompany] = useState('')
  const [shipmentCategory, setShipmentCategory] = useState('판재')
  const [shipmentFloor, setShipmentFloor] = useState('1')
  const sessionUser = getSession()

  useEffect(() => {
    const floor = sessionUser?.floor || 1
    setShipmentFloor(String(floor))
    setShipmentCategory(floor === 1 ? '판재' : floor === 2 ? '커넥터' : '랙')
    setQuantityUnit(floor === 3 ? 'EA' : 'Kg')
  }, [sessionUser?.floor])

  // Optional fields
  const [lotStart, setLotStart] = useState('')
  const [lotEnd, setLotEnd] = useState('')
  const [lotStartNo, setLotStartNo] = useState('')
  const [lotEndNo, setLotEndNo] = useState('')
  const [product, setProduct] = useState('')
  const [material, setMaterial] = useState('')
  const [specification, setSpecification] = useState('')
  const [platingMatches, setPlatingMatches] = useState<Array<{ material: string; specification: string }>>([])
  const [quantity, setQuantity] = useState('')
  const [quantityUnit, setQuantityUnit] = useState<'Kg' | 'EA' | 'R'>('Kg')
  const [issueDate, setIssueDate] = useState('')
  const [note, setNote] = useState('')

  // Config lists
  const [companies, setCompanies] = useState<string[]>([])
  const [docTypes, setDocTypes] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [specifications, setSpecifications] = useState<string[]>([])
  const [products, setProducts] = useState<string[]>([])
  const [shipmentCategories, setShipmentCategories] = useState<string[]>(['판재', '커넥터', '랙'])

  const [recentProducts, setRecentProducts] = useState<string[]>([])
  const [recentMaterials, setRecentMaterials] = useState<string[]>([])
  const [recentSpecifications, setRecentSpecifications] = useState<string[]>([])

  const [recentCompanies, setRecentCompanies] = useState<string[]>([])
  const [recentDocTypes, setRecentDocTypes] = useState<string[]>([])

  const loadConfig = useCallback(async () => {
    const [c, dt, m, s, p, scat] = await Promise.all([
      fetch('/api/config?name=companies', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=document-types', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=materials', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=specifications', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=products', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=shipment-categories', { cache: 'no-store' }).then(r => r.json()),
    ])

    setCompanies(c.data || [])
    setDocTypes(dt.data || [])
    setMaterials(m.data || [])
    setSpecifications(s.data || [])
    setProducts(p.data || [])
    setShipmentCategories(scat.data?.length ? scat.data : ['판재', '커넥터', '랙'])
  }, [])

  const loadRecentValues = useCallback(async () => {
    try {
      const [
        productsRes,
        materialsRes,
        specificationsRes,
        companiesRes,
        docTypesRes,
      ] = await Promise.all([
        fetch('/api/config?name=products', {
          cache: 'no-store',
        }).then(res => res.json()),

        fetch('/api/config?name=materials', {
          cache: 'no-store',
        }).then(res => res.json()),

        fetch('/api/config?name=specifications', {
          cache: 'no-store',
        }).then(res => res.json()),

        fetch('/api/config?name=companies', {
          cache: 'no-store',
        }).then(res => res.json()),

        fetch('/api/config?name=document-types', {
          cache: 'no-store',
        }).then(res => res.json()),
      ])

      setRecentProducts(
        productsRes.data?.slice(0, 5) || []
      )

      setRecentMaterials(
        materialsRes.data?.slice(0, 5) || []
      )

      setRecentSpecifications(
        specificationsRes.data?.slice(0, 5) || []
      )

      setRecentCompanies(
        companiesRes.data?.slice(0, 5) || []
      )

      setRecentDocTypes(
        docTypesRes.data?.slice(0, 5) || []
      )

    } catch (error) {
      console.error('최근 사용 항목 로드 실패:', error)
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadRecentValues()
  }, [loadConfig, loadRecentValues])

  useEffect(() => {
    setPlatingMatches([])
    setMaterial('')
    setSpecification('')

    if (!company || !product) return

    const controller = new AbortController()

    fetch(`/api/plating-info?company=${encodeURIComponent(company)}&product=${encodeURIComponent(product)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async response => {
        const body = await response.text()
        if (!response.ok) throw new Error(`도금 정보 API 오류 (${response.status})`)
        if (!body.trim()) return { matches: [] }
        try {
          return JSON.parse(body) as { matches?: Array<{ material: string; specification: string }> }
        } catch {
          throw new Error('도금 정보 API가 올바른 JSON을 반환하지 않았습니다.')
        }
      })
      .then(({ matches = [] }) => {
        setPlatingMatches(matches)
        const firstMatch = matches[0]
        if (!firstMatch) return
        setMaterial(firstMatch.material || '')
        setSpecification(firstMatch.specification || '')
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error('도금 정보 자동 입력 실패:', error)
        }
      })

    return () => controller.abort()
  }, [company, product])

  useEffect(() => {
    const element = formRef.current
    if (!element) return

    const updateHeight = () => {
      setFormHeight(element.getBoundingClientRect().height)
    }

    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [file])

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  useDataChanged((scope) => {
    if (scope === 'all' || scope === 'config') {
      loadConfig()
    }
  }, [loadConfig])

  const handleFileDrop = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const f = files[0]

    if (f.type !== 'application/pdf') {
      toast.error('PDF 파일만 업로드 가능합니다.')
      return
    }

    if (f.size > 50 * 1024 * 1024) {
      toast.error('파일 크기는 50MB를 초과할 수 없습니다.')
      return
    }

    setFile(f)
    setSuccess(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFileDrop(e.dataTransfer.files)
  }

  const handleSubmit = async () => {
    if (!file) {
      toast.error('파일을 선택해주세요.')
      return
    }

    if (!company) {
      toast.error('업체명을 입력해주세요.')
      return
    }

    if (!documentType) {
      toast.error('문서유형을 입력해주세요.')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()

      formData.append('file', file)
      formData.append('company', company)
      formData.append('documentType', documentType)
      if (shipmentCategory) formData.append('shipmentCategory', shipmentCategory)
      if (shipmentFloor) formData.append('shipmentFloor', shipmentFloor)

      const normalizedLotStart = normalizeRegisteredLot(normalizeLot(lotStart))

      if (normalizedLotStart) {
        const startNo = String(parseInt(lotStartNo || '1', 10))

        formData.append(
          'lotStart',
          `${normalizedLotStart}-${startNo}`
        )

        // 끝번호를 입력한 경우에만 저장
        if (lotEndNo.trim()) {
          formData.append(
            'lotEnd',
            `${normalizedLotStart}-${parseInt(lotEndNo, 10)}`
          )
        }
      }

      if (product) formData.append('product', product)
      if (material) formData.append('material', material)
      if (specification) formData.append('specification', specification)
      if (quantity) formData.append('quantity', quantity)
      formData.append('quantityUnit', quantityUnit)

  if (issueDate) {
    try {
      formData.append('issueDate', normalizeIssueDate(issueDate))
    } catch {
      // 존재하지 않는 날짜는 등록을 막지 않고 미지정 값으로 저장합니다.
      formData.append('issueDate', '-')
    }
  }


      if (note) formData.append('note', note)

      const session = getSession()
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: session ? buildAuthHeaders(session) : {},
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '업로드에 실패했습니다.')
      }

      toast.success('문서가 성공적으로 등록되었습니다.')

      await saveConfigValue('products', product)
      await saveConfigValue('materials', material)
      await saveConfigValue('specifications', specification)
      await saveConfigValue('companies', company)
      await saveConfigValue('document-types', documentType)

      notifyDataChanged('documents')
      notifyDataChanged('config')

      await loadConfig()
      await loadRecentValues()

      setSuccess(true)

      setFile(null)
      setCompany('')
      setDocumentType('')
      const defaultFloor = sessionUser?.floor || 1
      setShipmentFloor(String(defaultFloor))
      setShipmentCategory(defaultFloor === 1 ? '판재' : defaultFloor === 2 ? '커넥터' : '랙')
      setLotStart('')
      setLotEnd('')
      setLotStartNo('')
      setLotEndNo('')
      setProduct('')
      setMaterial('')
      setSpecification('')
      setPlatingMatches([])
      setQuantity('')
      setIssueDate('')
      setNote('')
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : '업로드에 실패했습니다.'

      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setCompany('')
    setDocumentType('')
    setLotStart('')
    setLotEnd('')
    setProduct('')
    setMaterial('')
    setSpecification('')
    setQuantity('')
    setIssueDate('')
    setNote('')
    setSuccess(false)
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'mx-auto items-stretch gap-6',
          file
            ? 'max-w-[1500px] grid grid-cols-[minmax(500px,768px)_minmax(550px,1fr)]'
            : 'max-w-3xl'
        )}
      >
        {/* ============================= */}
        {/* 왼쪽: 업로드 + 입력 폼 */}
        {/* ============================= */}
        <div ref={formRef} className="space-y-5">

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
              dragging
                ? 'border-primary bg-accent'
                : file
                  ? 'border-green-400 bg-green-50 dark:bg-green-950/20'
                  : 'border-border hover:border-primary/60 hover:bg-accent/40'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => handleFileDrop(e.target.files)}
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {file.name}
                  </p>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(file.size)}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                  className="gap-1.5 h-7 text-xs"
                >
                  <X className="w-3 h-3" />
                  파일 변경
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center transition-colors',
                    dragging
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <CloudUpload
                    className={cn(
                      'w-7 h-7',
                      dragging
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground'
                    )}
                  />
                </div>

                <div>
                  <p className="font-semibold text-foreground text-sm">
                    PDF 파일을 드래그하거나 클릭하여 선택
                  </p>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    PDF 형식만 지원 · 최대 50MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">

            {/* 필수 항목 */}
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                필수 항목
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    문서유형 <span className="text-destructive">*</span>
                  </Label>

                  <SearchableCombobox
                    configName="document-types"
                    options={docTypes}
                    recentOptions={recentDocTypes}
                    value={documentType}
                    onChange={setDocumentType}
                    onOptionsChange={setDocTypes}
                    placeholder="성적서, 도면 검색 또는 입력..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">
                    업체명 <span className="text-destructive">*</span>
                  </Label>

                  <SearchableCombobox
                    configName="companies"
                    options={companies}
                    recentOptions={recentCompanies}
                    value={company}
                    onChange={setCompany}
                    onOptionsChange={setCompanies}
                    placeholder="업체 검색 또는 입력..."
                  />
                </div>
              </div>
            </div>

            {/* 선택 항목 */}
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                선택 항목
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* LOT 번호 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">LOT 번호</Label>

                  <div className="flex items-stretch">
                    <Input
                      value={lotStart}
                      onChange={e => {
                        const value = e.target.value
                          .replace(/-\d+$/, '')
                          .trim()

                        setLotStart(value)
                        if (/^\d{6}$/.test(value)) {
                          setIssueDate(`20${value}`)
                        } else if (/^\d{8}$/.test(value)) {
                          setIssueDate(value)
                        }
                      }}
                      placeholder="예: 20260918"
                      className="rounded-r-none flex-1 min-w-0"
                    />

                    <Input
                      value={lotStartNo}
                      onChange={e => {
                        setLotStartNo(e.target.value.replace(/\D/g, ''))
                      }}
                      placeholder="1"
                      className="rounded-none border-l-0 w-[3.25rem] shrink-0 text-center px-1.5 font-mono"
                    />

                    <Input
                      value={lotEndNo}
                      onChange={e => {
                        setLotEndNo(e.target.value.replace(/\D/g, ''))
                      }}
                      placeholder="8"
                      className="rounded-l-none border-l-0 w-[3.25rem] shrink-0 text-center px-1.5 font-mono"
                    />
                  </div>
                </div>

                {/* 품목 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">품목</Label>

                  <SearchableCombobox
                    configName="products"
                    options={products}
                    recentOptions={recentProducts}
                    value={product}
                    onChange={setProduct}
                    onOptionsChange={setProducts}
                    placeholder="품목 선택 또는 입력..."
                  />
                </div>

                {/* 재질 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">재질</Label>

                  <SearchableCombobox
                    configName="materials"
                    options={materials}
                    recentOptions={recentMaterials}
                    value={material}
                    onChange={setMaterial}
                    onOptionsChange={setMaterials}
                    placeholder="재질 선택 또는 입력..."
                  />
                </div>

                {/* 도금사양 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">도금사양</Label>

                  <SearchableCombobox
                    configName="specifications"
                    options={specifications}
                    recentOptions={recentSpecifications}
                    value={specification}
                    onChange={setSpecification}
                    onOptionsChange={setSpecifications}
                    placeholder="사양 선택 또는 입력..."
                  />
                </div>

                {platingMatches.length > 1 && (
                  <p className="col-span-1 text-xs text-amber-600 dark:text-amber-400 sm:col-span-2">
                    같은 업체와 품목의 정보가 {platingMatches.length}개 있습니다. 재질과 도금사양을 확인해 주세요.
                  </p>
                )}

                {/* 도금 종류 / 층 */}
                <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">도금 종류</Label>
                    <SearchableCombobox
                      configName="shipment-category"
options={shipmentCategories}
  recentOptions={shipmentCategories.slice(0, 5)}
                      value={shipmentCategory}
                      onChange={setShipmentCategory}
                      placeholder="구분 선택"
                      clearable={!sessionUser?.floor}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">층</Label>
                    <SearchableCombobox
                      configName="shipment-floor"
                      options={['1층', '2층', '3층']}
                      recentOptions={['1층', '2층', '3층']}
                      value={shipmentFloor ? `${shipmentFloor}층` : ''}
                      onChange={value => setShipmentFloor(value.replace('층', ''))}
                      placeholder="층 선택"
                      clearable={!sessionUser?.floor}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* 수량 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">수량</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      placeholder="수량"
                      min={0}
                      className="h-10 min-w-0 flex-1"
                    />
                    <select
                      value={quantityUnit}
                      onChange={e => setQuantityUnit(e.target.value as 'Kg' | 'EA' | 'R')}
                      aria-label="수량 단위"
                      className="h-10 w-20 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="Kg">Kg</option>
                      <option value="EA">EA</option>
                      <option value="R">R</option>
                    </select>
                  </div>
                </div>

                {/* 발행일 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">발행일</Label>

                  <Input
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    placeholder="예: 20260721"
                    className="h-10"
                  />
                </div>

                {/* 비고 */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm">비고</Label>

                  <Textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="추가 메모"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* 액션 */}
            <div className="px-5 py-4 border-t border-border flex gap-3 bg-muted/10">
              <Button
                onClick={handleSubmit}
                disabled={uploading}
                size="default"
                className="gap-2 min-w-[110px]"
              >
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 animate-bounce" />
                    등록 중...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    등록 완료
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    등록하기
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleReset}
              >
                초기화
              </Button>
            </div>
          </div>
        </div>

        {/* ============================= */}
        {/* 오른쪽: PDF 미리보기 */}
        {/* ============================= */}
        {file && formHeight > 0 && (
          <div
            className="sticky top-5 min-h-0"
            style={{ height: `${Math.max(0, formHeight - 1)}px` }}
          >
            <div className="w-full h-full min-h-0 border border-border rounded-xl overflow-hidden bg-background shadow-md">
              <PdfDragPreview file={file} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
