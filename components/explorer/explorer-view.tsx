'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Folder, FolderOpen, ChevronRight, LayoutGrid, List,
  SortAsc, SortDesc, Search, X, FileText, Download, Eye, Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentMetadata } from '@/lib/types'
import { FileCard } from './file-card'
import { FilePreviewDrawer } from './file-preview-drawer'
import { cn } from '@/lib/utils'
import { chosungSearch, FILTER_CONSONANTS, matchesChosung } from '@/lib/korean'
import { useDataChanged } from '@/lib/data-events'

type Level = 'docType' | 'year' | 'files'
type SortField = 'issueDate'
type SortDir = 'asc' | 'desc'

interface ExplorerViewProps {
  initialCompany?: string
  initialDocType?: string
}

export function ExplorerView({ initialCompany, initialDocType }: ExplorerViewProps = {}) {
  const [allDocs, setAllDocs] = useState<DocumentMetadata[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  const [docTypes, setDocTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Sidebar state
  const [companySearch, setCompanySearch] = useState('')
  const [consonant, setConsonant] = useState<string | null>(null)
  const companySearchRef = useRef<HTMLInputElement>(null)

  // Navigation — 세 상태를 하나의 객체로 관리하여 항상 원자적으로 업데이트
  const [nav, setNav] = useState<{
    company: string | null
    docType: string | null
    year: string | null
  }>({
    company: initialCompany ?? null,
    docType: initialDocType ?? null,
    year: null,
  })

  const selectedCompany = nav.company
  const selectedDocType = nav.docType
  const selectedYear = nav.year

  // View
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortField] = useState<SortField>('issueDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [previewDoc, setPreviewDoc] = useState<DocumentMetadata | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [docsRes, compRes, dtRes] = await Promise.all([
      fetch('/api/documents', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=companies', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/config?name=document-types', { cache: 'no-store' }).then(r => r.json()),
    ])
    setAllDocs(docsRes.data || [])
    setCompanies(compRes.data || [])
    setDocTypes(dtRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useDataChanged(() => { loadData() }, [loadData])

  // 사이드바 트리(쿼리 파라미터)에서 업체/문서유형 선택 시 nav 동기화
  useEffect(() => {
    const company = initialCompany ?? null
    const docType = initialDocType ?? null
    setNav(prev => {
      if (prev.company === company && prev.docType === docType) return prev
      return { company, docType, year: null }
    })
  }, [initialCompany, initialDocType])

  // --- Sidebar: filtered companies ---
  const activeConsonants = useMemo(() => {
    return new Set(FILTER_CONSONANTS.filter(fc => companies.some(c => matchesChosung(c, fc))))
  }, [companies])

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const passConsonant = consonant ? matchesChosung(c, consonant) : true
      const passSearch = companySearch ? chosungSearch(c, companySearch) : true
      return passConsonant && passSearch
    })
  }, [companies, consonant, companySearch])

  // --- Content level ---
  const level: Level | null = selectedCompany
    ? selectedDocType
      ? selectedYear ? 'files' : 'year'
      : 'docType'
    : null

  // 업체 변경 시 하위 상태를 동일 렌더 사이클에서 원자적으로 초기화
  const handleSelectCompany = (c: string) => {
    if (c === selectedCompany) return
    setNav({ company: c, docType: null, year: null })
  }

  // useCallback → useMemo: 렌더마다 함수를 중복 호출하지 않고 결과값을 메모이제이션
  const docTypesForCompany = useMemo(() => {
    if (!selectedCompany) return []
    const docs = allDocs.filter(d => d.company === selectedCompany)
    return docTypes
      .filter(dt => docs.some(d => d.documentType === dt))
      .map(dt => ({ name: dt, count: docs.filter(d => d.documentType === dt).length }))
  }, [allDocs, docTypes, selectedCompany])

  const yearsForDocType = useMemo(() => {
    if (!selectedCompany || !selectedDocType) return []
    const docs = allDocs.filter(d => d.company === selectedCompany && d.documentType === selectedDocType)
    const years = [...new Set(docs.map(d => d.year))].sort((a, b) => Number(b) - Number(a))
    return years.map(y => ({ year: y, count: docs.filter(d => d.year === y).length }))
  }, [allDocs, selectedCompany, selectedDocType])

  const filteredDocs = useMemo(() => {
    const docs = allDocs.filter(d =>
      (!selectedCompany || d.company === selectedCompany) &&
      (!selectedDocType || d.documentType === selectedDocType) &&
      (!selectedYear || d.year === selectedYear)
    )
    return docs.sort((a, b) => {
      const va = (a[sortField] as string) ?? ''
      const vb = (b[sortField] as string) ?? ''
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [allDocs, selectedCompany, selectedDocType, selectedYear, sortField, sortDir])

  const handleDeleteDoc = (id: string) => setAllDocs(prev => prev.filter(d => d.id !== id))
  const handleUpdateDoc = (updated: DocumentMetadata) =>
    setAllDocs(prev => prev.map(d => d.id === updated.id ? updated : d))

  // Breadcrumb back navigation — setNav으로 원자적 업데이트
  const breadcrumbs = [
    selectedCompany ? {
      label: selectedCompany,
      action: () => setNav(n => ({ ...n, docType: null, year: null }))
    } : null,
    selectedDocType ? {
      label: selectedDocType,
      action: () => setNav(n => ({ ...n, year: null }))
    } : null,
    selectedYear ? { label: `${selectedYear}년`, action: undefined } : null,
  ].filter(Boolean) as { label: string; action: (() => void) | undefined }[]

  const docCount = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of allDocs) {
      counts[d.company] = (counts[d.company] || 0) + 1
    }
    return counts
  }, [allDocs])

  return (
    <div className="flex h-full overflow-hidden">
      {/* ──── LEFT SIDEBAR ──── */}
      <aside className="w-64 flex-shrink-0 border-r border-border flex flex-col bg-muted/20">
        <div className="px-3 pt-3 pb-2 border-b border-border space-y-2">
        <p className="text-sm font-semibold text-foreground px-1">업체</p>
          {/* 검색 */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 py-1.5">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={companySearchRef}
              value={companySearch}
              onChange={e => setCompanySearch(e.target.value)}
              placeholder="업체 검색..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
            />
            {companySearch && (
              <button onClick={() => setCompanySearch('')} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {/* 초성 필터 */}
          <div className="grid grid-cols-8 gap-0.5">
            <button
              onClick={() => setConsonant(null)}
              className={cn(
                'col-span-2 py-1 rounded text-[11px] font-semibold transition-colors',
                consonant === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              전체
            </button>
            {FILTER_CONSONANTS.map(fc => (
              <button
                key={fc}
                onClick={() => setConsonant(prev => prev === fc ? null : fc)}
                disabled={!activeConsonants.has(fc)}
                title={`${fc}으로 시작하는 업체`}
                className={cn(
                  'py-1.5 rounded text-sm font-medium transition-colors leading-none',
                  consonant === fc
                    ? 'bg-primary text-primary-foreground'
                    : activeConsonants.has(fc)
                    ? 'bg-muted text-foreground hover:bg-accent hover:text-foreground'
                    : 'opacity-25 cursor-not-allowed bg-transparent text-muted-foreground'
                )}
              >
                {fc}
              </button>
            ))}
          </div>
        </div>

        {/* Company list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="space-y-1 px-2 pt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 px-3">검색 결과 없음</p>
          ) : (
            filteredCompanies.map(c => {
              const isSelected = c === selectedCompany
              const count = docCount[c] || 0
              return (
                <button
                  key={c}
                  onClick={() => handleSelectCompany(c)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold border-r-2 border-primary'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  {isSelected
                    ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                    : <Folder className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                  }
                  <span className="flex-1 truncate font-medium">{c}</span>
                  {count > 0 && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{count}</span>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="px-3 py-2 border-t border-border">
          <p className="text-[16px] text-muted-foreground">{filteredCompanies.length}개 업체</p>
        </div>
      </aside>

      {/* ──── MAIN CONTENT ──── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar / breadcrumb */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60 flex-shrink-0">
          {breadcrumbs.length === 0 ? (
            <span className="text-sm text-muted-foreground">업체를 선택하세요</span>
          ) : (
            <nav className="flex items-center gap-1 flex-1 min-w-0">
              {breadcrumbs.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                  {item.action ? (
                    <button onClick={item.action} className="text-sm text-primary hover:underline truncate max-w-[140px]">
                      {item.label}
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">{item.label}</span>
                  )}
                </div>
              ))}
            </nav>
          )}

          {level === 'files' && (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                className="h-10 px-4 gap-2 text-base font-medium"
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              >
                {sortDir === 'asc' ? (
                  <>
                    <SortAsc className="w-5 h-5" />
                    오래된순
                  </>
                ) : (
                  <>
                    <SortDesc className="w-5 h-5" />
                    최신순
                  </>
                )}
              </Button>
              <div className="flex items-center border border-border rounded overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon" className="h-9 w-9 rounded-none"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon" className="h-9 w-9 rounded-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {!selectedCompany ? (
            // No selection
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Folder className="w-16 h-16 opacity-20" />
              <p className="text-sm">왼쪽에서 업체를 선택하세요</p>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : level === 'docType' ? (
            // Document types
            <>
              <p className="text-xs text-muted-foreground mb-4">
                {docTypesForCompany.length}개 문서 유형
              </p>
              {docTypesForCompany.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                  <FolderOpen className="w-12 h-12 opacity-25" />
                  <p className="text-sm">등록된 문서가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {docTypesForCompany.map(dt => (
                    <button
                      key={dt.name}
                      onClick={() => setNav(n => ({ ...n, docType: dt.name, year: null }))}
                      className="bg-card border border-border rounded-2xl p-6 text-left hover:border-primary/40 hover:shadow-md transition-all group"
                    >
                      <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center mb-4">
                        <FolderOpen className="w-7 h-7 text-blue-500" />
                      </div>
                      <p className="font-semibold text-base text-foreground truncate">{dt.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{dt.count}개 문서</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : level === 'year' ? (
            // Years
            <>
              <p className="text-xs text-muted-foreground mb-4">
                {yearsForDocType.length}개 연도
              </p>
              {yearsForDocType.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                  <Folder className="w-12 h-12 opacity-25" />
                  <p className="text-sm">문서가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {yearsForDocType.map(item => (
                    <button
                      key={item.year}
                      onClick={() => setNav(n => ({ ...n, year: item.year }))}
                      className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      <div className="w-10 h-10 bg-green-50 dark:bg-green-950/30 rounded-lg flex items-center justify-center mb-2.5">
                        <Folder className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="font-bold text-lg text-foreground">
                        {selectedDocType}_{item.year}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.count}개 문서
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : level === 'files' ? (
            // Files
            <>
              <p className="text-xs text-muted-foreground mb-4">
                {filteredDocs.length}개 문서
              </p>
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                  <FileText className="w-12 h-12 opacity-25" />
                  <p className="text-sm">문서가 없습니다.</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredDocs.map(doc => (
                    <FileCard
                      key={doc.id}
                      document={doc}
                      onPreview={setPreviewDoc}
                      onDelete={handleDeleteDoc}
                      viewMode="grid"
                    />
                  ))}
                </div>
              ) : (
                // List view
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/40">

                    {/* 아이콘 자리 */}
                    <div className="w-9 flex-shrink-0" />

                    {/* 데이터 컬럼 */}
                    <div className="flex-1 min-w-0 grid grid-cols-[2fr_1fr_1.2fr_1fr_0.7fr] gap-4">

                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        파일명 / LOT
                      </span>

                      <span className="hidden md:block text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        타입
                      </span>

                      <span className="hidden md:block text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        로트번호
                      </span>

                      <span className="hidden md:block text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        발행일
                      </span>

                      <span className="hidden md:block text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        크기
                      </span>
                    </div>
                    {/* 버튼 자리 */}
                    <div className="w-[108px]" />
                  </div>
                  {filteredDocs.map(doc => (
                    <FileCard
                      key={doc.id}
                      document={doc}
                      onPreview={setPreviewDoc}
                      onDelete={handleDeleteDoc}
                      viewMode="list"
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      <FilePreviewDrawer
        document={previewDoc}
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDelete={handleDeleteDoc}
        onUpdate={handleUpdateDoc}
      />
    </div>
  )
}
