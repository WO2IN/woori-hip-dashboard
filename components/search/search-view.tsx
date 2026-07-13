'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, SlidersHorizontal, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentMetadata } from '@/lib/types'
import { FileCard } from '@/components/explorer/file-card'
import { FilePreviewDrawer } from '@/components/explorer/file-preview-drawer'
import { useDataChanged } from '@/lib/data-events'
import { MultiSelect } from '@/components/ui/multi-select'

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
    if (initialQuery) handleSearch()
  }, []) // eslint-disable-line

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

  const handleDeleteDoc = (id: string) => {
    setResults(prev => prev.filter(d => d.id !== id))
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
          <div className="space-y-4 animate-fade-in-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1행: 업체명 / 문서유형 / 품목 / LOT 번호 */}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">업체명</Label>
              <MultiSelect
                options={companies}
                value={selectedCompanies}
                onChange={setSelectedCompanies}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">문서유형</Label>
              <MultiSelect
                options={docTypes}
                value={selectedDocTypes}
                onChange={setSelectedDocTypes}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">품목</Label>
              <MultiSelect
                options={products}
                value={selectedProducts}
                onChange={setSelectedProducts}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">재질</Label>
              <MultiSelect
                options={materials}
                value={selectedMaterials}
                onChange={setSelectedMaterials}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">도금사양</Label>
              <MultiSelect
                options={specifications}
                value={selectedSpecifications}
                onChange={setSelectedSpecifications}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">발행 시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9 w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">발행 종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-9 w-full"
              />
            </div>
          </div>

            {/* Active filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeFilters.map(filter => (
                  <Badge
                    key={filter.key}
                    className={`text-xs gap-1 border-0 ${filterColors[filter.type]}`}
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

            <div className="flex gap-2">
              <Button onClick={handleSearch} className="gap-2">
                <Search className="w-4 h-4" />
                검색
              </Button>
              <Button variant="outline" onClick={handleReset}>초기화</Button>
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
              검색 결과: <strong className="text-foreground">{results.length}건</strong>
            </p>
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
                />
              ))}
            </div>
          )}
        </div>
      )}

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
