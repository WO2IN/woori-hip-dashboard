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
import { normalizeLot, buildLotEnd } from '@/lib/lot'
import dynamic from 'next/dynamic'

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

  // Optional fields
  const [lotStart, setLotStart] = useState('')
  const [lotEnd, setLotEnd] = useState('')
  const [product, setProduct] = useState('')
  const [material, setMaterial] = useState('')
  const [specification, setSpecification] = useState('')
  const [quantity, setQuantity] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [note, setNote] = useState('')

  // Config lists
  const [companies, setCompanies] = useState<string[]>([])
  const [docTypes, setDocTypes] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [specifications, setSpecifications] = useState<string[]>([])
  const [products, setProducts] = useState<string[]>([])

  const loadConfig = useCallback(async () => {
    const [c, dt, m, s, p] = await Promise.all([
      fetch('/api/config?name=companies', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=document-types', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=materials', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=specifications', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=products', { cache: 'no-store' }).then(r => r.json()),
    ])

    setCompanies(c.data || [])
    setDocTypes(dt.data || [])
    setMaterials(m.data || [])
    setSpecifications(s.data || [])
    setProducts(p.data || [])
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

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

      const normalizedLotStart = normalizeLot(lotStart)

      if (normalizedLotStart) {
        formData.append('lotStart', normalizedLotStart)
      }

      if (lotEnd) {
        formData.append(
          'lotEnd',
          buildLotEnd(normalizedLotStart, lotEnd)
        )
      }

      if (product) formData.append('product', product)
      if (material) formData.append('material', material)
      if (specification) formData.append('specification', specification)
      if (quantity) formData.append('quantity', quantity)

      if (issueDate) {
        formData.append('issueDate', normalizeDate(issueDate))
      }

      if (note) formData.append('note', note)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '업로드에 실패했습니다.')
      }

      toast.success('문서가 성공적으로 등록되었습니다.')
      notifyDataChanged('documents')
      setSuccess(true)

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
                  value={documentType}
                  onChange={setDocumentType}
                  onOptionsChange={setDocTypes}
                  placeholder="성적서, 도면, 시험성적서..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">
                  업체명 <span className="text-destructive">*</span>
                </Label>

                <SearchableCombobox
                  configName="companies"
                  options={companies}
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
                    onChange={e => setLotStart(e.target.value)}
                    placeholder="예: 20260708-1"
                    className="rounded-r-none flex-1 min-w-0"
                  />

                  <Input
                    value={lotEnd}
                    onChange={e => {
                      const value = e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 2)

                      setLotEnd(value)
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
                  value={specification}
                  onChange={setSpecification}
                  onOptionsChange={setSpecifications}
                  placeholder="사양 선택 또는 입력..."
                />
              </div>

              {/* 수량 */}
              <div className="space-y-1.5">
                <Label className="text-sm">수량</Label>

                <Input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="수량"
                  min={0}
                />
              </div>

              {/* 발행일 */}
              <div className="space-y-1.5">
                <Label className="text-sm">발행일</Label>

                <Input
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  placeholder="예: 2025-07-07 또는 25.07.07"
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
          style={{ height: `${Math.max(0, formHeight)}px` }}
        >
          <div className="w-full h-full min-h-0 border border-border rounded-xl overflow-hidden bg-background shadow-md">
            <PdfDragPreview file={file} />
          </div>
        </div>
      )}
    </div>
  )
}