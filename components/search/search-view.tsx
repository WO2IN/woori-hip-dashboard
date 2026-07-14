'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Search, X, SlidersHorizontal, FileText, Download, CheckSquare, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentMetadata } from '@/lib/types'
import { FileCard } from '@/components/explorer/file-card'
import { FilePreviewDrawer } from '@/components/explorer/file-preview-drawer'
import { useDataChanged } from '@/lib/data-events'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { notifyDataChanged } from '@/lib/data-events'
import { cn } from '@/lib/utils'

function FilterField({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

interface SearchViewProps {
  initialQuery?: string
}
export function SearchView({ initialQuery }: SearchViewProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [selectedSpecifications, setSelectedSpecifications] = useState<string[]>([])
  const [query, setQuery] = useState(initialQuery || '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [lotNumber, setLotNumber] = useState('')

  const [companies, setCompanies] = useState<string[]>([])
  const [docTypes, setDocTypes] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [specifications, setSpecifications] = useState<string[]>([])
  const [products, setProducts] = useState<string[]>([])

  const [results, setResults] = useState<DocumentMetadata[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentMetadata | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(true)

  // 선택된 문서
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [downloading, setDownloading] = useState(false)

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

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    const params = new URLSearchParams()
    if (query) params.set('query', query)
      selectedCompanies.forEach(company => {
        params.append('company', company)
      })
      selectedDocTypes.forEach(value => {
        params.append('documentType', value)
      })
      
      selectedProducts.forEach(value => {
        params.append('product', value)
      })
      
      selectedMaterials.forEach(value => {
        params.append('material', value)
      })
      
      selectedSpecifications.forEach(value => {
        params.append('specification', value)
      })
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (lotNumber) params.set('lotNumber', lotNumber)
    const res = await fetch(`/api/documents?${params.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    setResults(data.data || [])
    setLoading(false)
  }, [
    query,
    selectedCompanies,
    selectedDocTypes,
    startDate,
    endDate,
    selectedProducts,
    selectedMaterials,
    selectedSpecifications,
    lotNumber,
  ])

  useDataChanged((scope) => {
    if (scope === 'all' || scope === 'config') loadConfig()
    if ((scope === 'all' || scope === 'documents') && searched) handleSearch()
  }, [loadConfig, searched, handleSearch])

  useEffect(() => {
    handleSearch()
  }, [handleSearch])

  const handleReset = () => {
    setSelectedCompanies([])
    setQuery('')
    setStartDate('')
    setEndDate('')
    setSelectedMaterials([])
    setSelectedDocTypes([])
    setSelectedProducts([])
    setSelectedSpecifications([])
    setLotNumber('')
    setResults([])
    setSelectedDocs([])
    setSearched(false)
  }

  const activeFilters = [
    ...selectedCompanies.map(value => ({
      key: `company-${value}`,
      label: value,
      type: 'company',
      onRemove: () =>
        setSelectedCompanies(prev => prev.filter(v => v !== value)),
    })),
  
    ...selectedDocTypes.map(value => ({
      key: `documentType-${value}`,
      label: value,
      type: 'documentType',
      onRemove: () =>
        setSelectedDocTypes(prev => prev.filter(v => v !== value)),
    })),
  
    ...selectedProducts.map(value => ({
      key: `product-${value}`,
      label: value,
      type: 'product',
      onRemove: () =>
        setSelectedProducts(prev => prev.filter(v => v !== value)),
    })),
  
    ...selectedMaterials.map(value => ({
      key: `material-${value}`,
      label: value,
      type: 'material',
      onRemove: () =>
        setSelectedMaterials(prev => prev.filter(v => v !== value)),
    })),
  
    ...selectedSpecifications.map(value => ({
      key: `specification-${value}`,
      label: value,
      type: 'specification',
      onRemove: () =>
        setSelectedSpecifications(prev => prev.filter(v => v !== value)),
    })),
  ]

  const filterColors: Record<string, string> = {
    company:
      'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300',
  
    documentType:
      'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-300',
  
    product:
      'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950 dark:text-green-300',
  
    material:
      'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-300',
  
    specification:
      'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-950 dark:text-pink-300',
  }

  const toggleSelectDoc = (id: string) => {
    setSelectedDocs(prev =>
      prev.includes(id)
        ? prev.filter(v => v !== id)
        : [...prev, id]
    )
  }
  
  const toggleSelectAll = () => {
    if (selectedDocs.length === results.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(results.map(doc => doc.id))
    }
  }
  
  
  // 문서 삭제
  const handleDeleteDoc = (id: string) => {
    setResults(prev => prev.filter(d => d.id !== id))
    setSelectedDocs(prev => prev.filter(v => v !== id))
  }
  
  
  const selectedDocuments = results.filter(doc =>
    selectedDocs.includes(doc.id)
  )

  const downloadSingleDocument = (doc: DocumentMetadata) => {
    const a = document.createElement('a')
    a.href = `/api/file?path=${encodeURIComponent(doc.storagePath)}&download=true`
    a.download = doc.originalName || doc.filename
    a.click()
  }

  const downloadDocuments = async (docs: DocumentMetadata[]) => {
    if (docs.length === 0) return

    if (docs.length === 1) {
      downloadSingleDocument(docs[0])
      return
    }

    setDownloading(true)
    try {
      const res = await fetch('/api/download-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: docs.map(doc => doc.id),
        }),
      })

      if (!res.ok) {
        toast.error('다운로드 실패')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'documents.zip'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('다운로드 실패')
    } finally {
      setDownloading(false)
    }
  }

  const handleDeleteSelected = async () => {
    setDeleting(true)
    try {
      const ids = [...selectedDocs]
      const responses = await Promise.all(
        ids.map(id => fetch(`/api/documents/${id}`, { method: 'DELETE' }))
      )

      const failedCount = responses.filter(res => !res.ok).length
      const successCount = ids.length - failedCount

      if (successCount === 0) {
        toast.error('삭제에 실패했습니다.')
        return
      }

      setResults(prev => prev.filter(d => !ids.includes(d.id)))
      setSelectedDocs(prev => prev.filter(id => !ids.includes(id)))

      if (failedCount > 0) {
        toast.error(`${successCount}건 삭제, ${failedCount}건 실패`)
      } else {
        toast.success(`${successCount}건의 문서가 삭제되었습니다.`)
      }

      notifyDataChanged('documents')
    } catch {
      toast.error('삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Search input */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          문서 검색
        </h2>

        {/* Query input */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSearch()
              }}
              placeholder="파일명, 업체명, 품목 등으로 검색..."
              className="pl-9"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={() => setFiltersOpen(v => !v)} title="필터">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Filters */}
        {filtersOpen && (
          <div className="animate-fade-in-up space-y-4 border-t border-border/60 pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FilterField label="업체명">
                <MultiSelect
                  options={companies}
                  value={selectedCompanies}
                  onChange={setSelectedCompanies}
                />
              </FilterField>

              <FilterField label="문서유형">
                <MultiSelect
                  options={docTypes}
                  value={selectedDocTypes}
                  onChange={setSelectedDocTypes}
                />
              </FilterField>

              <FilterField label="품목">
                <MultiSelect
                  options={products}
                  value={selectedProducts}
                  onChange={setSelectedProducts}
                />
              </FilterField>

              <FilterField label="재질">
                <MultiSelect
                  options={materials}
                  value={selectedMaterials}
                  onChange={setSelectedMaterials}
                />
              </FilterField>

              <FilterField label="도금사양">
                <MultiSelect
                  options={specifications}
                  value={selectedSpecifications}
                  onChange={setSelectedSpecifications}
                />
              </FilterField>

              <FilterField label="발행일" className="sm:col-span-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="h-9 min-w-0 flex-1"
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">~</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="h-9 min-w-0 flex-1"
                  />
                </div>
              </FilterField>

              <FilterField label="LOT 번호">
                <Input
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  placeholder="LOT 번호 입력"
                  className="h-9"
                />
              </FilterField>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeFilters.map(filter => (
                  <Badge
                    key={filter.key}
                    className={`gap-1 border-0 text-xs ${filterColors[filter.type]}`}
                  >
                    {filter.label}

                    <button
                      type="button"
                      onClick={filter.onRemove}
                      className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                      aria-label={`${filter.label} 필터 제거`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                초기화
              </Button>
              <Button onClick={handleSearch} className="gap-2">
                <Search className="h-4 w-4" />
                검색
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : searched && (
        <div>
          <div className="flex items-center justify-between mb-4">

            <p className="text-sm text-muted-foreground">
              검색 결과:
              <strong className="text-foreground ml-1">
                {results.length}건
              </strong>
            </p>

            <div className="flex gap-2">

              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedDocs.length === results.length
                  ? <CheckSquare className="w-4 h-4 mr-1" />
                  : <Square className="w-4 h-4 mr-1" />
                }

                전체 선택
              </Button>


              <Button
                size="sm"
                disabled={selectedDocs.length === 0 || downloading}
                onClick={() => downloadDocuments(selectedDocuments)}
              >
                <Download className="w-4 h-4 mr-1" />
                다운로드
              </Button>

              <Button
                size="sm"
                variant="destructive"
                disabled={selectedDocs.length === 0 || deleting}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                삭제
              </Button>

            </div>

            </div>
          {results.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">검색 결과가 없습니다</p>
              <p className="text-sm mt-1">다른 검색 조건을 시도해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map(doc => (
                <FileCard
                key={doc.id}
                document={doc}
                onPreview={setPreviewDoc}
                onDelete={handleDeleteDoc}
                viewMode="grid"
                selected={selectedDocs.includes(doc.id)}
                onSelect={() => toggleSelectDoc(doc.id)}
              />
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>문서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedDocs.length}건의 문서를 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={handleDeleteSelected}
            >
              {deleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilePreviewDrawer
        document={previewDoc}
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDelete={handleDeleteDoc}
        onUpdate={doc => setResults(prev => prev.map(d => d.id === doc.id ? doc : d))}
      />
    </div>
  )
}
