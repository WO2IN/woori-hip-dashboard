'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Folder,
  FolderOpen,
  ChevronRight,
  LayoutGrid,
  List,
  SortAsc,
  SortDesc,
  FileText,
  CheckSquare,
  Square,
  Download,
  Trash2,
  Search,
  X,
  SlidersHorizontal,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { DocumentMetadata } from '@/lib/types'
import { FileCard } from './file-card'
import { FilePreviewDrawer } from './file-preview-drawer'
import { cn } from '@/lib/utils'
import { FILTER_CONSONANTS, matchesChosung } from '@/lib/korean'
import { useDataChanged } from '@/lib/data-events'
import { getSession, buildAuthHeaders } from '@/lib/auth-client'
import { toast } from 'sonner'

type Level = 'docType' | 'year' | 'files'
type SortField =
  | 'filename'
  | 'documentType'
  | 'product'  
  | 'lot'
  | 'issueDate'
  | 'size'
  | 'company'
type SortDir = 'asc' | 'desc'

function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function ListHeader({
  handleListSort,
  sortField,
  sortDir,
}: {
  handleListSort: (field: SortField) => void
  sortField: SortField
  sortDir: SortDir
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/40">

      {/* 아이콘 자리 */}
      <div className="w-[68px] flex-shrink-0" />

      {/* 데이터 컬럼 */}
      <div className="flex-1 min-w-0 grid grid-cols-[2fr_1fr_1.2fr_1.8fr_1fr_0.7fr] gap-4">

        <button
          onClick={() => handleListSort('filename')}
          className="hidden md:flex items-center justify-start justify-self-start gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider transition-colors hover:bg-muted/80 hover:text-foreground"
        >
          파일명 / LOT
          {sortField === 'filename' && (
            sortDir === 'asc'
              ? <SortAsc className="w-3.5 h-3.5" />
              : <SortDesc className="w-3.5 h-3.5" />
          )}
        </button>


        <button
          onClick={() => handleListSort('documentType')}
          className="hidden md:flex items-center justify-center gap-1 rounded px-2 py-1 text-sm font-medium text-muted-foreground uppercase tracking-wider transition-all hover:bg-muted hover:text-foreground hover:font-bold"
        >
          타입
          {sortField === 'documentType' && (
            sortDir === 'asc'
              ? <SortAsc className="w-3.5 h-3.5" />
              : <SortDesc className="w-3.5 h-3.5" />
          )}
        </button>


        <button
          onClick={() => handleListSort('product')}
          className="hidden md:flex items-center justify-center gap-1 rounded px-2 py-1 text-sm font-medium text-muted-foreground uppercase tracking-wider transition-all hover:bg-muted hover:text-foreground hover:font-bold"
        >
          품목
          {sortField === 'product' && (
            sortDir === 'asc'
              ? <SortAsc className="w-3.5 h-3.5" />
              : <SortDesc className="w-3.5 h-3.5" />
          )}
        </button>


        <button
          onClick={() => handleListSort('lot')}
          className="hidden md:flex items-center justify-start gap-1 rounded px-17 py-1 text-sm font-medium text-muted-foreground uppercase tracking-wider transition-all hover:bg-muted hover:text-foreground hover:font-bold"
        >
          로트번호
          {sortField === 'lot' && (
            sortDir === 'asc'
              ? <SortAsc className="w-3.5 h-3.5" />
              : <SortDesc className="w-3.5 h-3.5" />
          )}
        </button>


        <button
          onClick={() => handleListSort('issueDate')}
          className="hidden md:flex items-center justify-center gap-1 rounded px-2 py-1 text-sm font-medium text-muted-foreground uppercase tracking-wider transition-all hover:bg-muted hover:text-foreground hover:font-bold"
        >
          발행일
          {sortField === 'issueDate' && (
            sortDir === 'asc'
              ? <SortAsc className="w-3.5 h-3.5" />
              : <SortDesc className="w-3.5 h-3.5" />
          )}
        </button>


        <button
          onClick={() => handleListSort('size')}
          className="hidden md:flex items-center justify-center gap-1 rounded px-2 py-1 text-sm font-medium text-muted-foreground uppercase tracking-wider transition-all hover:bg-muted hover:text-foreground hover:font-bold"
        >
          크기
          {sortField === 'size' && (
            sortDir === 'asc'
              ? <SortAsc className="w-3.5 h-3.5" />
              : <SortDesc className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}

function getInitialConsonant(name: string) {
  const firstChar = name.charCodeAt(0)

  if (firstChar < 0xac00 || firstChar > 0xd7a3) {
    return '#'
  }

  const index = Math.floor((firstChar - 0xac00) / 588)

  const initials = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ',
    'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ',
    'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ]

  const initial = initials[index]

  const normalize: Record<string, string> = {
    'ㄲ': 'ㄱ',
    'ㄸ': 'ㄷ',
    'ㅃ': 'ㅂ',
    'ㅆ': 'ㅅ',
    'ㅉ': 'ㅈ',
  }

  return normalize[initial] || initial
}

interface ExplorerViewProps {
  initialCompany?: string
  initialDocType?: string
}

export function ExplorerView({ initialCompany, initialDocType }: ExplorerViewProps = {}) {
  const [allDocs, setAllDocs] = useState<DocumentMetadata[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  const [docTypes, setDocTypes] = useState<string[]>([])
  
  const [products, setProducts] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [specifications, setSpecifications] = useState<string[]>([])
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Sidebar state
  const [consonant, setConsonant] = useState<string | null>(null)
  const [selectedInitial, setSelectedInitial] = useState<string | null>(null)


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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [sortField, setSortField] = useState<SortField>('issueDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleListSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }
  const [previewDoc, setPreviewDoc] = useState<DocumentMetadata | null>(null)

  // Search
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [selectedSpecifications, setSelectedSpecifications] = useState<string[]>([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [
      docsRes,
      compRes,
      dtRes,
      productRes,
      materialRes,
      specificationRes
    ] = await Promise.all([
    
      fetch('/api/documents', {
        cache:'no-store'
      }).then(r=>r.json()),
    
      fetch('/api/config?name=companies', {
        cache:'no-store'
      }).then(r=>r.json()),
    
      fetch('/api/config?name=document-types', {
        cache:'no-store'
      }).then(r=>r.json()),
    
      fetch('/api/config?name=products', {
        cache:'no-store'
      }).then(r=>r.json()),
    
      fetch('/api/config?name=materials', {
        cache:'no-store'
      }).then(r=>r.json()),
    
      fetch('/api/config?name=specifications', {
        cache:'no-store'
      }).then(r=>r.json()),
    
    ])
    setAllDocs(docsRes.data || [])
    setCompanies(compRes.data || [])
    setDocTypes(dtRes.data || [])
    setProducts(productRes.data || [])
    setMaterials(materialRes.data || [])
    setSpecifications(specificationRes.data || [])
    setLoading(false)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
  
    try {
      await loadData()
      toast.success('데이터를 새로고침했습니다.')
    } catch {
      toast.error('새로고침 실패')
    } finally {
      setRefreshing(false)
    }
  }

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
    return companies.filter(c =>
      consonant ? matchesChosung(c, consonant) : true
    )
  }, [companies, consonant])

  const companiesByInitial = useMemo(() => {
    return FILTER_CONSONANTS
      .map(initial => ({
        initial,
        companies: companies.filter(
          company => getInitialConsonant(company) === initial
        ),
      }))
      .filter(group => group.companies.length > 0)
  }, [companies])

  // --- Content level ---
  const level: Level | null = selectedCompany
    ? selectedDocType
      ? selectedYear ? 'files' : 'year'
      : 'docType'
    : null

  // 업체 변경 시 하위 상태를 동일 렌더 사이클에서 원자적으로 초기화
  const handleSelectCompany = (c: string) => {
    if (c === selectedCompany) return
  
    setSelectedDocs([])
  
    setNav({
      company: c,
      docType: null,
      year: null
    })
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
    const keyword = query.trim().toLowerCase()
  
    const docs = allDocs.filter(d => {

      const issueDate = d.issueDate
        ? d.issueDate.replace(/\./g, '-')
        : ''
      return (
        // 트리 선택
        (!selectedCompany ||
          d.company === selectedCompany)
        &&
        (!selectedDocType ||
          d.documentType === selectedDocType)
        &&
        (!selectedYear ||
          d.year === selectedYear)
        &&
        // 업체 필터
        (
          selectedCompanies.length === 0 ||
          selectedCompanies.includes(d.company)
        )
        &&
        // 문서유형 필터
        (
          selectedDocTypes.length === 0 ||
          selectedDocTypes.includes(d.documentType)
        )
        &&
        // 품목
        (
          selectedProducts.length === 0 ||
          selectedProducts.includes(d.product)
        )
        &&
        // 재질
        (
          selectedMaterials.length === 0 ||
          selectedMaterials.includes(d.material)
        )
        &&
        // 규격
        (
          selectedSpecifications.length === 0 ||
          selectedSpecifications.includes(d.specification ?? '')
        )
        &&
        // 시작일
        (
          !startDate ||
          issueDate >= startDate
        )
        &&
        // 종료일
        (
          !endDate ||
          issueDate <= endDate
        )
        &&
        // LOT
        (
          !lotNumber ||
          d.lotStart?.includes(lotNumber) ||
          d.lotEnd?.includes(lotNumber)
        )
        &&
        // 통합 검색창
        (
          !keyword ||
          d.filename?.toLowerCase().includes(keyword) ||
          d.originalName?.toLowerCase().includes(keyword) ||
          d.company?.toLowerCase().includes(keyword) ||
          d.documentType?.toLowerCase().includes(keyword) ||
          d.product?.toLowerCase().includes(keyword) ||
          d.material?.toLowerCase().includes(keyword) ||
          d.specification?.toLowerCase().includes(keyword) ||
          d.lotStart?.toLowerCase().includes(keyword) ||
          d.lotEnd?.toLowerCase().includes(keyword) ||
          d.note?.toLowerCase().includes(keyword)
        )
      )
    })
  
    return docs.sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
    
      switch (sortField) {
        case 'filename':
          va = a.originalName || a.filename || ''
          vb = b.originalName || b.filename || ''
          break
    
        case 'documentType':
          va = a.documentType || ''
          vb = b.documentType || ''
          break
        
        case 'product':
          va = a.product || ''
          vb = b.product || ''
          break
        
        case 'lot':
          va = a.lotStart || ''
          vb = b.lotStart || ''
          break
    
        case 'issueDate':
          va = Number(a.issueDate || 0)
          vb = Number(b.issueDate || 0)
          break
    
        case 'size':
          va = a.fileSize || 0
          vb = b.fileSize || 0
          break
    
        case 'company':
          va = a.company || ''
          vb = b.company || ''
          break
      }
    
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va
      }
    
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb), 'ko-KR', { numeric: true })
        : String(vb).localeCompare(String(va), 'ko-KR', { numeric: true })
    })
  }, [
    allDocs,
   
    selectedCompany,
    selectedDocType,
    selectedYear,
   
    selectedCompanies,
    selectedDocTypes,
    selectedProducts,
    selectedMaterials,
    selectedSpecifications,
   
    startDate,
    endDate,
    lotNumber,
   
    sortField,
    sortDir,
   
    query
   ])

  const handleDeleteDoc = (id: string) => {

    setAllDocs(prev =>
      prev.filter(d => d.id !== id)
    )
   
    setSelectedDocs(prev =>
      prev.filter(v => v !== id)
   )
   
   }
  const handleUpdateDoc = (updated: DocumentMetadata) =>
    setAllDocs(prev => prev.map(d => d.id === updated.id ? updated : d))

  const downloadSingleDocument = (doc: DocumentMetadata) => {
    const a = document.createElement('a')
  
    a.href =
      `/api/file?path=${encodeURIComponent(doc.storagePath)}&download=true`
  
    a.download = doc.originalName || doc.filename
  
    a.click()
  }
  
  
  const downloadDocuments = async (
    docs: DocumentMetadata[]
  ) => {
  
    if (docs.length === 0) return
  
  
    if (docs.length === 1) {
      downloadSingleDocument(docs[0])
      return
    }
  
  
    setDownloading(true)
  
    try {
  
      const res = await fetch('/api/download-zip', {
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          ids:docs.map(doc=>doc.id)
        })
      })
  
  
      if(!res.ok){
        toast.error('다운로드 실패')
        return
      }
  
  
      const blob = await res.blob()
  
      const url = window.URL.createObjectURL(blob)
  
      const a = document.createElement('a')
  
      a.href=url
      a.download='documents.zip'
  
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
      const session = getSession()
      const authHeaders = session ? buildAuthHeaders(session) : {}
  
      const responses = await Promise.all(
        ids.map(id =>
          fetch(`/api/documents/${id}`, {
            method: 'DELETE',
            headers: authHeaders,
          })
        )
      )
  
      const failedCount =
        responses.filter(res => !res.ok).length
  
      const successCount =
        ids.length - failedCount
  
  
      if (successCount === 0) {
        toast.error('삭제에 실패했습니다.')
        setDeleteOpen(false)
        return
      }
  
  
      setAllDocs(prev =>
        prev.filter(doc => !ids.includes(doc.id))
      )
  
      setSelectedDocs([])
  
  
      if (failedCount > 0) {
        toast.error(
          `${successCount}건 삭제, ${failedCount}건 실패`
        )
      } else {
        toast.success(
          `${successCount}건의 문서가 삭제되었습니다.`
        )
      }
  
  
    } catch {
      toast.error('삭제 실패')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const toggleSelectDoc = (id: string) => {
    setSelectedDocs(prev =>
      prev.includes(id)
        ? prev.filter(v => v !== id)
        : [...prev, id]
    )
  }
  
  
  const toggleSelectAll = () => {
    if (selectedDocs.length === filteredDocs.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(filteredDocs.map(doc => doc.id))
    }
  }
  
  
  const selectedDocuments = filteredDocs.filter(doc =>
    selectedDocs.includes(doc.id)
  )

  const SelectionToolbar = () => (
    <div className="flex items-center gap-2">
  
      <Button
        variant="outline"
        className="h-10 px-4 gap-2"
        onClick={toggleSelectAll}
      >
        {selectedDocs.length === filteredDocs.length && filteredDocs.length > 0
          ? <CheckSquare className="w-5 h-5" />
          : <Square className="w-5 h-5" />
        }
        전체 선택
      </Button>
  
  
      <Button
        className="h-10 px-4 gap-2"
        disabled={selectedDocs.length === 0 || downloading}
        onClick={() => downloadDocuments(selectedDocuments)}
      >
        <Download className="w-5 h-5" />
        다운로드
      </Button>
  
  
      <Button
        variant="destructive"
        className="h-10 px-4 gap-2"
        disabled={selectedDocs.length === 0 || deleting}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="w-5 h-5" />
        삭제
      </Button>
  
    </div>
  )

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
      <aside
        className={cn(
          "flex-shrink-0 border-r border-border flex flex-col bg-muted/20 transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-64" : "w-14"
        )}
      >
          <div className="px-3 pt-3 pb-2 border-b border-border space-y-2">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarOpen(prev => !prev)}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </Button>
            </div>

            {sidebarOpen && (
              <p className="text-sm font-semibold text-foreground px-1">
                업체
              </p>
            )}
          {/* 초성 필터 */}
          {sidebarOpen && (
            <div className="grid grid-cols-8 gap-0.5">
          <button
            onClick={() => {
              setConsonant(null)

              setSelectedDocs([])

              setNav({
                company: null,
                docType: null,
                year: null
              })
            }}
            className={cn(
              'col-span-2 py-1 rounded text-sm font-semibold transition-colors',
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
          )}
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
            sidebarOpen && filteredCompanies.map(c => {
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

        {sidebarOpen && (
          <div className="px-3 py-2 border-t border-border">
            <p className="text-[16px] text-muted-foreground">
              {filteredCompanies.length}개 업체
            </p>
          </div>
        )}
        </aside>
        {/* ──── MAIN CONTENT ──── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar / breadcrumb */}
        <div className="flex flex-col border-b border-border bg-card/60 flex-shrink-0">


        {/* 검색 영역 */}
        <div className="px-4 pt-3 pb-2">

        <div className="flex gap-2">

          <div className="relative flex-1">

            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            />

            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="파일명, 업체명, 품목 등으로 검색..."
              className="pl-9"
            />

            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

          </div>


          <Button
            variant="outline"
            size="icon"
            onClick={() => setFiltersOpen(prev => !prev)}
            title="필터"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>

        </div>


        {filtersOpen && (
          <div className="mt-3 border-t border-border/60 pt-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

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


              <FilterField label="규격">
                <MultiSelect
                  options={specifications}
                  value={selectedSpecifications}
                  onChange={setSelectedSpecifications}
                />
              </FilterField>
              <FilterField label="발행 시작일">
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </FilterField>


              <FilterField label="발행 종료일">
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </FilterField>


              <FilterField label="LOT 번호">
                <Input
                  placeholder="LOT 검색"
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                />
              </FilterField>

            </div>

          </div>

        )}

        </div>

        {/* 상단줄 : breadcrumb + 최신순 + 보기 */}
        <div className="flex items-center gap-2 px-4 py-2.5">

        {breadcrumbs.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            전체 문서
          </span>
        ) : (
        <nav className="flex items-center gap-1 flex-1 min-w-0">

          {/* 전체로 이동 */}
          <button
            onClick={() => {
              setSelectedDocs([])
              setNav({
                company: null,
                docType: null,
                year: null
              })
            }}
            className="text-sm text-primary hover:underline"
          >
            전체
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />

          {breadcrumbs.map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              )}

              {item.action ? (
                <button
                  onClick={item.action}
                  className="text-sm text-primary hover:underline truncate max-w-[140px]"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

        <div className="ml-auto flex items-center gap-2">
        {viewMode === 'grid' && (
          <Button
            variant="ghost"
            className="h-10 px-4 gap-2 text-base font-medium"
            onClick={() => {
              if (sortField === 'issueDate' && sortDir === 'desc') {
                // 최신순 → 오래된순
                setSortDir('asc')
              } else if (sortField === 'issueDate' && sortDir === 'asc') {
                // 오래된순 → 이름순
                setSortField('company')
                setSortDir('asc')
              } else if (sortField === 'company') {
                // 이름순 → 최신순
                setSortField('issueDate')
                setSortDir('desc')
              }
            }}
          >
            {sortField === 'issueDate' ? (
              sortDir === 'desc' ? (
                <>
                  <SortDesc className="w-5 h-5" />
                  최신순
                </>
              ) : (
                <>
                  <SortAsc className="w-5 h-5" />
                  오래된순
                </>
              )
            ) : (
              <>
                <SortAsc className="w-5 h-5" />
                이름순
              </>
            )}
          </Button>
        )}

        <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleRefresh}
            disabled={refreshing}
            title="데이터 새로고침"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4",
                refreshing && "animate-spin"
              )}
            />
          </Button>
          
        <div className="flex items-center border border-border rounded overflow-hidden">

          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-none"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>


          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-none"
            onClick={() => setViewMode('list')}
          >
            <List className="w-3.5 h-3.5" />
          </Button>

        </div>

        </div>

      </div>
      </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
        {!selectedCompany ? (
  <>
    <div className="flex items-center justify-between mb-4">
      <p className="text-xs text-muted-foreground">
        전체 문서 {filteredDocs.length}개
      </p>
      <SelectionToolbar />
    </div>
    
    {filteredDocs.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <FileText className="w-12 h-12 opacity-25" />
        <p className="text-sm">등록된 문서가 없습니다.</p>
      </div>
    ) : (
      viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocs.map(doc => (
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
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <ListHeader
            handleListSort={handleListSort}
            sortField={sortField}
            sortDir={sortDir}
          />
          {filteredDocs.map(doc => (
            <FileCard
              key={doc.id}
              document={doc}
              onPreview={setPreviewDoc}
              onDelete={handleDeleteDoc}
              viewMode="list"
              selected={selectedDocs.includes(doc.id)}
              onSelect={() => toggleSelectDoc(doc.id)}
            />
          ))}
        </div>
         ) 
      )}
  </>
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
                      onClick={() => {
                        setSelectedDocs([])
                        setNav(n => ({
                          ...n,
                          docType: dt.name,
                          year: null
                        }))
                      }}
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
                      onClick={() => {
                        setSelectedDocs([])
                        setNav(n => ({
                          ...n,
                          year: item.year
                        }))
                      }}
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
          ) : level === 'files' || !selectedCompany ? (
            <>
              <div className="flex items-center justify-between mb-4">

                <p className="text-xs text-muted-foreground">
                  {filteredDocs.length}개 문서
                </p>
                <SelectionToolbar />
              </div>
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
                      selected={selectedDocs.includes(doc.id)}
                      onSelect={() => toggleSelectDoc(doc.id)}
                    />
                  ))}
                </div>
              ) : (
                // List view
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <ListHeader
                    handleListSort={handleListSort}
                    sortField={sortField}
                    sortDir={sortDir}
                  />

                  {filteredDocs.map(doc => (
                    <FileCard
                      key={doc.id}
                      document={doc}
                      onPreview={setPreviewDoc}
                      onDelete={handleDeleteDoc}
                      viewMode="list"
                      selected={selectedDocs.includes(doc.id)}
                      onSelect={() => toggleSelectDoc(doc.id)}
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


      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>

          <AlertDialogHeader>
            <AlertDialogTitle>
              문서 삭제
            </AlertDialogTitle>

            <AlertDialogDescription>
              선택한 {selectedDocs.length}개의 문서를 삭제하시겠습니까?
              <br />
              삭제 후에는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>


          <AlertDialogFooter>

            <AlertDialogCancel>
              취소
            </AlertDialogCancel>


            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-red-500/20 text-red-600 hover:bg-red-500/30 dark:text-red-400"
            >
              삭제
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
