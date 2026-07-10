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

interface SearchViewProps {
  initialQuery?: string
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => String(CURRENT_YEAR - i))

export function SearchView({ initialQuery }: SearchViewProps) {
  const [query, setQuery] = useState(initialQuery || '')
  const [company, setCompany] = useState('전체')
  const [docType, setDocType] = useState('전체')
  const [year, setYear] = useState('전체')
  const [product, setProduct] = useState('전체')
  const [material, setMaterial] = useState('전체')
  const [specification, setSpecification] = useState('전체')
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
    if (company && company !== '전체') params.set('company', company)
    if (docType && docType !== '전체') params.set('documentType', docType)
    if (year && year !== '전체') params.set('year', year)
    if (product && product !== '전체') params.set('product', product)
    if (material && material !== '전체') params.set('material', material)
    if (specification && specification !== '전체') params.set('specification', specification)
    if (lotNumber) params.set('lotNumber', lotNumber)
    const res = await fetch(`/api/documents?${params.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    setResults(data.data || [])
    setLoading(false)
  }, [query, company, docType, year, product, material, specification, lotNumber])

  useDataChanged((scope) => {
    if (scope === 'all' || scope === 'config') loadConfig()
    if ((scope === 'all' || scope === 'documents') && searched) handleSearch()
  }, [loadConfig, searched, handleSearch])

  useEffect(() => {
    if (initialQuery) handleSearch()
  }, []) // eslint-disable-line

  const handleReset = () => {
    setQuery('')
    setCompany('전체')
    setDocType('전체')
    setYear('전체')
    setProduct('전체')
    setMaterial('전체')
    setSpecification('전체')
    setLotNumber('')
    setResults([])
    setSearched(false)
  }

  const activeFilters = [
    company !== '전체' && company,
    docType !== '전체' && docType,
    year !== '전체' && year,
    product !== '전체' && product,
    material !== '전체' && material,
    specification !== '전체' && specification,
    lotNumber,
  ].filter(Boolean) as string[]

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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">업체명</Label>
                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="전체" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">문서유형</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="전체" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    {docTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">연도</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="전체" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    {YEARS.map(y => <SelectItem key={y} value={y}>{y}년</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">품목</Label>
                <Select value={product} onValueChange={setProduct}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="전체" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">재질</Label>
                <Select value={material} onValueChange={setMaterial}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="전체" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    {materials.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">도금사양</Label>
                <Select value={specification} onValueChange={setSpecification}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="전체" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    {specifications.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">LOT 번호</Label>
                <Input
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  placeholder="LOT 번호 입력"
                  className="h-9"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSearch()
                  }}
                />
              </div>
            </div>

            {/* Active filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(activeFilters)].map(f => (
                  <Badge key={f} variant="secondary" className="text-xs gap-1">
                    {f}
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
