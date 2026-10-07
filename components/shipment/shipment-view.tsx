'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ExcelJS from 'exceljs'
import {
  ArrowLeftRight,
  Download,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/auth/auth-context'
import { buildAuthHeaders, getSession } from '@/lib/auth-client'
import { useDataChanged } from '@/lib/data-events'
import { DocumentMetadata } from '@/lib/types'
import {
  StockGroup,
  StockMovement,
  buildStockGroups,
  collectMovements,
  compactDate,
  displayDate,
  formatQuantity,
  ledgerRows,
  uniqueUnits,
} from '@/lib/stock'

type TabKey = 'stock' | 'in' | 'out'
type InventoryForm = {
  id?: string
  issueDate: string
  company: string
  product: string
  floor: string
  quantity: string
  quantityUnit: string
  lotStart: string
}

const emptyForm = (): InventoryForm => ({
  issueDate: new Date().toISOString().slice(0, 10),
  company: '',
  product: '',
  floor: '1',
  quantity: '',
  quantityUnit: 'EA',
  lotStart: '',
})

function uniqueSorted(values: string[], locale = true) {
  const items = [...new Set(values.filter((item) => item && item !== '-'))]
  return locale ? items.sort((a, b) => a.localeCompare(b, 'ko')) : items.sort()
}

function authHeaders() {
  const session = getSession()
  return {
    'Content-Type': 'application/json',
    ...(session ? buildAuthHeaders(session) : {}),
  }
}

export function ShipmentView() {
  const { user } = useAuth()
  const editable = Boolean(user && user.role !== 'viewer')
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [inventory, setInventory] = useState<DocumentMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [tab, setTab] = useState<TabKey>('stock')
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [floorFilter, setFloorFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<InventoryForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<StockGroup | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({})
  const [isSavingEdits, setIsSavingEdits] = useState(false)
  const [isOutgoingWarningOpen, setIsOutgoingWarningOpen] = useState(false)
  const [quantityEdit, setQuantityEdit] = useState<StockMovement | null>(null)
  const [quantityEditValue, setQuantityEditValue] = useState('')

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      const session = getSession()
      const headers = session ? buildAuthHeaders(session) : {}
      const [docRes, invRes] = await Promise.all([
        fetch('/api/documents', { cache: 'no-store', headers }),
        fetch('/api/inventory', { cache: 'no-store', headers }),
      ])
      if (!docRes.ok) throw new Error('문서 목록을 불러오지 못했습니다.')
      if (!invRes.ok) throw new Error('입고 목록을 불러오지 못했습니다.')
      const docResult = await docRes.json()
      const invResult = await invRes.json()
      setDocuments(docResult.data || [])
      setInventory(invResult.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  useDataChanged(() => void load(true), [load])

  const movements = useMemo(
    () => collectMovements(documents, inventory),
    [documents, inventory],
  )

  const availableCompanies = useMemo(
    () =>
      uniqueSorted(
        movements
          .filter(
            (item) =>
              (productFilter === 'all' || item.product === productFilter) &&
              (floorFilter === 'all' || item.floor === floorFilter),
          )
          .map((item) => item.company),
      ),
    [floorFilter, movements, productFilter],
  )
  const activeCompany =
    companyFilter === 'all' && availableCompanies.length === 1
      ? availableCompanies[0]
      : companyFilter

  const availableProducts = useMemo(
    () =>
      uniqueSorted(
        movements
          .filter(
            (item) =>
              (activeCompany === 'all' || item.company === activeCompany) &&
              (floorFilter === 'all' || item.floor === floorFilter),
          )
          .map((item) => item.product),
      ),
    [activeCompany, floorFilter, movements],
  )
  const activeProduct =
    productFilter === 'all' && availableProducts.length === 1
      ? availableProducts[0]
      : productFilter

  const availableFloors = useMemo(
    () =>
      uniqueSorted(
        movements
          .filter(
            (item) =>
              (activeCompany === 'all' || item.company === activeCompany) &&
              (productFilter === 'all' || item.product === productFilter),
          )
          .map((item) => item.floor),
        false,
      ),
    [activeCompany, movements, productFilter],
  )
  const activeFloor =
    floorFilter === 'all' && availableFloors.length === 1
      ? availableFloors[0]
      : floorFilter

  const formCompanies = useMemo(
    () =>
      uniqueSorted(
        movements
          .filter((item) => !form.product || item.product === form.product)
          .map((item) => item.company),
      ),
    [form.product, movements],
  )
  const formProducts = useMemo(
    () =>
      uniqueSorted(
        movements
          .filter((item) => !form.company || item.company === form.company)
          .map((item) => item.product),
      ),
    [form.company, movements],
  )

  useEffect(() => {
    if (companyFilter !== 'all' && !availableCompanies.includes(companyFilter)) {
      setCompanyFilter('all')
    }
  }, [availableCompanies, companyFilter])
  useEffect(() => {
    if (productFilter !== 'all' && !availableProducts.includes(productFilter)) {
      setProductFilter('all')
    }
  }, [availableProducts, productFilter])
  useEffect(() => {
    if (floorFilter !== 'all' && !availableFloors.includes(floorFilter)) {
      setFloorFilter('all')
    }
  }, [availableFloors, floorFilter])

  const filteredMovements = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ko-KR')
    return movements.filter((item) => {
      const matchesFilter =
        (activeCompany === 'all' || item.company === activeCompany) &&
        (activeProduct === 'all' || item.product === activeProduct) &&
        (activeFloor === 'all' || item.floor === activeFloor)
      if (!matchesFilter) return false
      if (!q) return true
      return [item.company, item.product, item.lot, item.floor, item.unit]
        .join(' ')
        .toLocaleLowerCase('ko-KR')
        .includes(q)
    })
  }, [activeCompany, activeFloor, activeProduct, movements, query])

  const groups = useMemo(
    () => buildStockGroups(filteredMovements, startDate, endDate),
    [endDate, filteredMovements, startDate],
  )

  const inbound = useMemo(
    () =>
      filteredMovements
        .filter((item) => item.kind === '입고')
        .filter((item) => inDateRange(item.issueDate, startDate, endDate))
        .sort((a, b) => b.issueDate.localeCompare(a.issueDate)),
    [endDate, filteredMovements, startDate],
  )

  const outbound = useMemo(
    () =>
      filteredMovements
        .filter((item) => item.kind === '출고')
        .filter((item) => inDateRange(item.issueDate, startDate, endDate))
        .sort((a, b) => b.issueDate.localeCompare(a.issueDate)),
    [endDate, filteredMovements, startDate],
  )

  const units = uniqueUnits(groups)
  const canSum = units.length <= 1
  const unitLabel = units[0] || ''
  const incomingSum = groups.reduce((sum, row) => sum + row.incoming, 0)
  const outgoingSum = groups.reduce((sum, row) => sum + row.outgoing, 0)
  const openingSum = groups.reduce((sum, row) => sum + row.opening, 0)
  const stockSum = groups.reduce((sum, row) => sum + row.stock, 0)
  const negativeCount = groups.filter((row) => row.stock < 0).length

  const selectedLedger = useMemo(() => {
    if (!selectedGroup) return []
    return ledgerRows(
      filteredMovements.filter(
        (item) =>
          item.company === selectedGroup.company &&
          item.product === selectedGroup.product &&
          item.floor === selectedGroup.floor &&
          item.unit === selectedGroup.unit,
      ),
      startDate,
      endDate,
    )
  }, [endDate, filteredMovements, selectedGroup, startDate])

  const saveInventory = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.company || !form.product || !form.quantity) {
      toast.error('업체명, 품목, 수량은 필수입니다.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        id: form.id,
        issueDate: form.issueDate,
        company: form.company,
        product: form.product,
        floor: Number(form.floor),
        quantity: Number(form.quantity),
        quantityUnit: form.quantityUnit,
        lotStart: form.lotStart,
      }
      const response = await fetch('/api/inventory', {
        method: form.id ? 'PATCH' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '입고 저장에 실패했습니다.')
      toast.success(form.id ? '입고 내역을 수정했습니다.' : '입고 내역을 등록했습니다.')
      setFormOpen(false)
      setForm(emptyForm())
      await load(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '입고 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const deleteInventory = async (id: string) => {
    if (!window.confirm('이 입고 내역을 삭제하시겠습니까?')) return
    try {
      const response = await fetch('/api/inventory', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '입고 삭제에 실패했습니다.')
      toast.success('입고 내역을 삭제했습니다.')
      await load(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '입고 삭제에 실패했습니다.')
    }
  }

  const openEdit = (row: StockMovement) => {
    if (row.source !== 'inventory') {
      setQuantityEdit(row)
      setQuantityEditValue(String(row.quantity))
      return
    }
    setForm({
      id: row.id,
      issueDate: row.issueDate.length === 8
        ? `${row.issueDate.slice(0, 4)}-${row.issueDate.slice(4, 6)}-${row.issueDate.slice(6, 8)}`
        : new Date().toISOString().slice(0, 10),
      company: row.company,
      product: row.product,
      floor: row.floor || '1',
      quantity: String(row.quantity),
      quantityUnit: row.unit || 'EA',
      lotStart: row.lot === '-' ? '' : row.lot,
    })
    setFormOpen(true)
  }

  const ledgerKey = (row: Pick<StockMovement, 'source' | 'id'>) => `${row.source}-${row.id}`

  const patchMovementQuantity = async (row: StockMovement, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error('수량은 0 이상이어야 합니다.')
    }
    const response = row.source === 'inventory'
      ? await fetch('/api/inventory', {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ id: row.id, quantity, quantityUnit: row.unit || 'EA' }),
        })
      : await fetch('/api/documents', {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ id: row.id, quantity }),
        })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result.error || (row.kind === '출고' ? '출고 수량 수정에 실패했습니다.' : '입고 수량 수정에 실패했습니다.'))
    }
  }

  const changedLedgerRows = () =>
    selectedLedger.filter((row) => {
      const next = editedQuantities[ledgerKey(row)]
      return next != null && next !== row.quantity
    })

  const saveEditedRows = async (confirmed = false) => {
    const changed = changedLedgerRows()
    if (!changed.length) {
      toast.success('변경된 내용이 없습니다.')
      setIsEditMode(false)
      return
    }
    const outgoingChanged = changed.some((row) => row.kind === '출고')
    if (outgoingChanged && !confirmed) {
      setIsOutgoingWarningOpen(true)
      return
    }
    setIsSavingEdits(true)
    try {
      for (const row of changed) {
        await patchMovementQuantity(row, editedQuantities[ledgerKey(row)])
      }
      toast.success('수정사항을 저장했습니다.')
      setIsEditMode(false)
      setEditedQuantities({})
      setIsOutgoingWarningOpen(false)
      await load(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '수정사항 저장에 실패했습니다.')
    } finally {
      setIsSavingEdits(false)
    }
  }

  const saveQuantityEdit = async (confirmed = false) => {
    if (!quantityEdit) return
    const quantity = Number(quantityEditValue)
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error('수량은 0 이상이어야 합니다.')
      return
    }
    if (quantityEdit.kind === '출고' && !confirmed) {
      setIsOutgoingWarningOpen(true)
      return
    }
    setIsSavingEdits(true)
    try {
      await patchMovementQuantity(quantityEdit, quantity)
      toast.success('수량을 수정했습니다.')
      setQuantityEdit(null)
      setIsOutgoingWarningOpen(false)
      await load(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '수량 수정에 실패했습니다.')
    } finally {
      setIsSavingEdits(false)
    }
  }

  const downloadExcel = async () => {
    setDownloading(true)
    try {
      const workbook = new ExcelJS.Workbook()
      const stockSheet = workbook.addWorksheet('재고현황')
      stockSheet.columns = [
        { header: '업체명', key: 'company', width: 24 },
        { header: '품목', key: 'product', width: 24 },
        { header: '층', key: 'floor', width: 8 },
        { header: '단위', key: 'unit', width: 10 },
        { header: '기초재고', key: 'opening', width: 12 },
        { header: '입고', key: 'incoming', width: 12 },
        { header: '출고', key: 'outgoing', width: 12 },
        { header: '현재고', key: 'stock', width: 12 },
        { header: '최근일자', key: 'lastDate', width: 14 },
      ]
      stockSheet.addRows(
        groups.map((row) => ({
          company: row.company,
          product: row.product,
          floor: row.floor ? `${row.floor}층` : '-',
          unit: row.unit,
          opening: row.opening,
          incoming: row.incoming,
          outgoing: row.outgoing,
          stock: row.stock,
          lastDate: displayDate(row.lastDate),
        })),
      )

      const ledgerSheet = workbook.addWorksheet('수불부')
      ledgerSheet.columns = [
        { header: '일자', key: 'issueDate', width: 14 },
        { header: '구분', key: 'kind', width: 10 },
        { header: '업체명', key: 'company', width: 24 },
        { header: '품목', key: 'product', width: 24 },
        { header: '층', key: 'floor', width: 8 },
        { header: '로트', key: 'lot', width: 22 },
        { header: '수량', key: 'quantity', width: 12 },
        { header: '단위', key: 'unit', width: 10 },
      ]
      ledgerSheet.addRows(
        [...inbound, ...outbound]
          .sort((a, b) => a.issueDate.localeCompare(b.issueDate))
          .map((row) => ({
            issueDate: displayDate(row.issueDate),
            kind: row.kind,
            company: row.company,
            product: row.product,
            floor: row.floor ? `${row.floor}층` : '-',
            lot: row.lot || '-',
            quantity: row.quantity,
            unit: row.unit,
          })),
      )

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `입출고관리_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('엑셀 파일을 다운로드했습니다.')
    } catch {
      toast.error('엑셀 파일 생성에 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <main className="p-6 md:p-8">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">입/출고 관리</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              업체·품목·층·단위별로 재고를 집계하고, 입·출고 수량을 건별로 수정합니다.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button
              onClick={() => {
                setForm(emptyForm())
                setFormOpen(true)
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" /> 입고 등록
            </Button>
          )}
          <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button onClick={() => void downloadExcel()} disabled={loading || downloading || groups.length === 0}>
            <Download className="mr-2 h-4 w-4" /> 엑셀 다운로드
          </Button>
        </div>
      </header>

      <section className="mb-5 rounded-xl border bg-card p-4 shadow-sm">
        <label className="relative mb-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="업체명, 품목, 로트번호 검색..."
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="검색어 지우기"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <FilterSelect label="업체명" value={activeCompany} onChange={setCompanyFilter} allLabel="전체 업체" options={availableCompanies} />
          <FilterSelect label="품목" value={activeProduct} onChange={setProductFilter} allLabel="전체 품목" options={availableProducts} />
          <FilterSelect
            label="층"
            value={activeFloor}
            onChange={setFloorFilter}
            allLabel="전체 층"
            options={availableFloors}
            format={(value) => `${value}층`}
          />
          <label className="space-y-1.5 text-sm font-medium lg:col-span-2">
            <span>날짜 범위</span>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm" />
              <span className="text-muted-foreground">~</span>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm" />
            </div>
          </label>
          <div className="flex items-end justify-end text-sm text-muted-foreground">
            재고 {groups.length}종 · 입고 {inbound.length}건 · 출고 {outbound.length}건
          </div>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="기간 입고" value={canSum ? incomingSum : null} unit={unitLabel} tone="blue" />
        <SummaryCard label="기간 출고" value={canSum ? outgoingSum : null} unit={unitLabel} tone="orange" />
        <SummaryCard
          label={startDate ? '기초 + 기간 = 현재고' : '현재 재고'}
          value={canSum ? stockSum : null}
          unit={unitLabel}
          tone="yellow"
          hint={startDate && canSum ? `기초 ${openingSum.toLocaleString('ko-KR')}` : undefined}
        />
        <SummaryCard label="재고 부족" value={negativeCount} unit="종" tone="rose" />
      </section>

      {!canSum && groups.length > 0 && (
        <p className="mb-4 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <TriangleAlert className="h-4 w-4" /> 단위가 섞여 있어 합계는 표시하지 않습니다. 품목별로 확인하세요.
        </p>
      )}

      <div className="mb-4 flex gap-1 rounded-lg border bg-muted/40 p-1">
        {(
          [
            ['stock', '재고현황', groups.length],
            ['in', '입고내역', inbound.length],
            ['out', '출고내역', outbound.length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            <span className="ml-1 text-xs text-muted-foreground">{count}</span>
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <StockTable
          loading={loading}
          rows={groups}
          onOpen={(row) => {
            setSelectedGroup(row)
            setIsEditMode(false)
            setEditedQuantities({})
          }}
        />
      )}
      {tab === 'in' && (
        <MovementTable
          loading={loading}
          rows={inbound}
          empty="등록된 입고 내역이 없습니다."
          canManage={editable}
          onEdit={openEdit}
          onDelete={deleteInventory}
        />
      )}
      {tab === 'out' && (
        <MovementTable
          loading={loading}
          rows={outbound}
          empty="출고로 잡힌 성적서가 없습니다."
          note="출고 수량을 수정하면 연결된 성적서 수량도 함께 바뀝니다."
          canManage={editable}
          onEdit={openEdit}
        />
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{form.id ? '입고 내역 수정' : '입고 내역 등록'}</DialogTitle>
            <DialogDescription>거래명세표 기준으로 입고 한 건을 저장합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveInventory} className="space-y-3 py-2">
            <Field label="입고일자">
              <Input type="date" value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} required />
            </Field>
            <Field label="업체명">
              <SearchableCombobox
                configName="companies"
                options={formCompanies}
                recentOptions={formCompanies.slice(0, 8)}
                value={form.company}
                onChange={(value) => {
                  const productsForCompany = uniqueSorted(
                    movements.filter((item) => item.company === value).map((item) => item.product),
                  )
                  setForm({
                    ...form,
                    company: value,
                    product: form.product && productsForCompany.includes(form.product)
                      ? form.product
                      : productsForCompany.length === 1 ? productsForCompany[0] : form.product,
                  })
                }}
                placeholder="업체 검색 또는 입력..."
                className="h-10"
              />
            </Field>
            <Field label="품명">
              <SearchableCombobox
                configName="products"
                options={formProducts}
                recentOptions={formProducts.slice(0, 8)}
                value={form.product}
                onChange={(value) => {
                  const companiesForProduct = uniqueSorted(
                    movements.filter((item) => item.product === value).map((item) => item.company),
                  )
                  setForm({
                    ...form,
                    product: value,
                    company: form.company && companiesForProduct.includes(form.company)
                      ? form.company
                      : companiesForProduct.length === 1 ? companiesForProduct[0] : form.company,
                  })
                }}
                placeholder="품명 검색 또는 입력..."
                className="h-10"
              />
            </Field>
            <Field label="층">
              <select
                value={form.floor}
                onChange={(event) => setForm({ ...form, floor: event.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="1">1층</option>
                <option value="2">2층</option>
                <option value="3">3층</option>
              </select>
            </Field>
            <Field label="로트번호">
              <Input value={form.lotStart} onChange={(event) => setForm({ ...form, lotStart: event.target.value })} placeholder="(선택)" />
            </Field>
            <Field label="수량">
              <div className="flex gap-2">
                <Input type="number" min="0" step="any" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
                <select
                  value={form.quantityUnit}
                  onChange={(event) => setForm({ ...form, quantityUnit: event.target.value })}
                  className="w-24 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="EA">EA</option>
                  <option value="Kg">Kg</option>
                  <option value="R">R</option>
                </select>
              </div>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>취소</Button>
              <Button type="submit" disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedGroup(null)
            setIsEditMode(false)
            setEditedQuantities({})
            setIsOutgoingWarningOpen(false)
          }
        }}
      >
        <DialogContent className="!w-[min(96vw,980px)] !max-w-[980px]">
          <DialogHeader className="gap-3 pr-10 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="min-w-0">
              <DialogTitle>
                {selectedGroup?.company} · {selectedGroup?.product}
                {selectedGroup?.floor ? ` · ${selectedGroup.floor}층` : ''}
              </DialogTitle>
              <DialogDescription>
                건별 수불 내역입니다. 출고 수량을 바꾸면 해당 성적서 수량도 함께 변경됩니다.
              </DialogDescription>
            </div>
            {editable && (
              <div className="flex shrink-0 items-center gap-2">
                {isEditMode ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSavingEdits}
                      onClick={() => {
                        setIsEditMode(false)
                        setEditedQuantities({})
                      }}
                    >
                      취소
                    </Button>
                    <Button type="button" disabled={isSavingEdits} onClick={() => void saveEditedRows()}>
                      {isSavingEdits ? '저장 중...' : '저장'}
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setIsEditMode(true)}>
                    편집
                  </Button>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 text-xs text-muted-foreground">
                <tr>
                  {['일자', '구분', '로트', '수량', '누계재고'].map((head) => (
                    <th key={head} className={`border-b px-4 py-3 ${head === '수량' || head === '누계재고' ? 'text-right' : 'text-left'}`}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedLedger.map((row) => (
                  <tr key={ledgerKey(row)} className="border-b last:border-0">
                    <td className="px-4 py-3">{displayDate(row.issueDate)}</td>
                    <td className="px-4 py-3">
                      <KindBadge kind={row.kind} />
                    </td>
                    <td className="px-4 py-3">{row.lot || '-'}</td>
                    <td className="px-4 py-3 text-right tabular-nums" onClick={(event) => event.stopPropagation()}>
                      {isEditMode ? (
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="ml-auto h-8 w-28 text-right"
                          value={editedQuantities[ledgerKey(row)] ?? row.quantity}
                          onChange={(event) =>
                            setEditedQuantities((current) => ({
                              ...current,
                              [ledgerKey(row)]: Number(event.target.value),
                            }))
                          }
                        />
                      ) : (
                        formatQuantity(row.quantity, row.unit)
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.running < 0 ? 'text-destructive' : ''}`}>
                      {formatQuantity(row.running, row.unit)}
                    </td>
                  </tr>
                ))}
                {selectedLedger.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">기간 내 이동이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(quantityEdit)} onOpenChange={(open) => !open && setQuantityEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{quantityEdit?.kind || '출고'} 수량 수정</DialogTitle>
            <DialogDescription>
              {quantityEdit?.company} · {quantityEdit?.product} · {displayDate(quantityEdit?.issueDate)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Input
              type="number"
              min="0"
              step="any"
              value={quantityEditValue}
              onChange={(event) => setQuantityEditValue(event.target.value)}
            />
            <span className="text-sm text-muted-foreground">{quantityEdit?.unit}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQuantityEdit(null)}>취소</Button>
            <Button type="button" disabled={isSavingEdits} onClick={() => void saveQuantityEdit()}>
              {isSavingEdits ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOutgoingWarningOpen} onOpenChange={setIsOutgoingWarningOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-amber-500" aria-hidden="true" />
              출고 수량을 수정하시겠습니까?
            </DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              출고값은 성적서와 연동된 값입니다. 수정하면 연결된 성적서 개수도 함께 변경됩니다.
              그래도 저장하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOutgoingWarningOpen(false)}
              disabled={isSavingEdits}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={isSavingEdits}
              onClick={() => {
                if (quantityEdit) void saveQuantityEdit(true)
                else void saveEditedRows(true)
              }}
            >
              확인하고 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function inDateRange(issueDate: string, startDate: string, endDate: string) {
  const start = startDate ? compactDate(startDate) : ''
  const end = endDate ? compactDate(endDate) : ''
  if (start && issueDate < start) return false
  if (end && issueDate > end) return false
  return true
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
  format,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  allLabel: string
  options: string[]
  format?: (value: string) => string
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {format ? format(option) : option}
          </option>
        ))}
        {value !== 'all' && !options.includes(value) ? (
          <option value={value}>{format ? format(value) : value}</option>
        ) : null}
      </select>
    </label>
  )
}

function SummaryCard({
  label,
  value,
  unit,
  tone,
  hint,
}: {
  label: string
  value: number | null
  unit: string
  tone: 'blue' | 'orange' | 'yellow' | 'rose'
  hint?: string
}) {
  const tones = {
    blue: 'text-blue-700 dark:text-blue-300',
    orange: 'text-orange-700 dark:text-orange-300',
    yellow: 'text-amber-800 dark:text-amber-300',
    rose: 'text-rose-700 dark:text-rose-300',
  }
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <p className={`mt-2 text-xl font-bold tabular-nums ${tones[tone]}`}>
        {value == null ? '—' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}{' '}
        <span className="text-xs font-normal text-muted-foreground">{value == null ? '단위 혼재' : unit}</span>
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function KindBadge({ kind }: { kind: '입고' | '출고' }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        kind === '입고'
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
          : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
      }`}
    >
      {kind}
    </span>
  )
}

function StockTable({
  loading,
  rows,
  onOpen,
}: {
  loading: boolean
  rows: StockGroup[]
  onOpen: (row: StockGroup) => void
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <PackageCheck className="h-4 w-4 text-muted-foreground" />
        <div>
          <h2 className="font-semibold">재고 현황</h2>
          <p className="text-xs text-muted-foreground">날짜 범위를 지정하면 기간 전 수량은 기초재고로 잡힙니다.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {['업체명', '품목', '층', '단위', '기초', '입고', '출고', '현재고', '최근일자'].map((head) => (
                <th key={head} className={`px-4 py-3 ${['기초', '입고', '출고', '현재고'].includes(head) ? 'text-right' : 'text-left'}`}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index}>
                  {Array.from({ length: 9 }).map((__, cell) => (
                    <td key={cell} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">표시할 재고가 없습니다.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.key}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => onOpen(row)}
                >
                  <td className="px-4 py-3 font-medium">{row.company}</td>
                  <td className="px-4 py-3">{row.product}</td>
                  <td className="px-4 py-3">{row.floor ? `${row.floor}층` : '-'}</td>
                  <td className="px-4 py-3">{row.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatQuantity(row.opening)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatQuantity(row.incoming)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-orange-600">{formatQuantity(row.outgoing)}</td>
                  <td className={`px-4 py-3 text-right font-bold tabular-nums ${row.stock < 0 ? 'text-destructive' : 'bg-yellow-50/80 dark:bg-yellow-950/20'}`}>
                    {formatQuantity(row.stock)}
                  </td>
                  <td className="px-4 py-3">{displayDate(row.lastDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MovementTable({
  loading,
  rows,
  empty,
  note,
  canManage,
  onEdit,
  onDelete,
}: {
  loading: boolean
  rows: StockMovement[]
  empty: string
  note?: string
  canManage?: boolean
  onEdit?: (row: StockMovement) => void
  onDelete?: (id: string) => void
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {note && <p className="border-b px-5 py-3 text-xs text-muted-foreground">{note}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {['일자', '구분', '업체명', '품목', '층', '로트', '수량', ...(canManage ? ['관리'] : [])].map((head) => (
                <th key={head} className={`px-4 py-3 ${head === '수량' ? 'text-right' : 'text-left'}`}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  {Array.from({ length: canManage ? 8 : 7 }).map((__, cell) => (
                    <td key={cell} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="px-4 py-16 text-center text-muted-foreground">{empty}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.source}-${row.id}`} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{displayDate(row.issueDate)}</td>
                  <td className="px-4 py-3"><KindBadge kind={row.kind} /></td>
                  <td className="px-4 py-3 font-medium">{row.company}</td>
                  <td className="px-4 py-3">{row.product}</td>
                  <td className="px-4 py-3">{row.floor ? `${row.floor}층` : '-'}</td>
                  <td className="px-4 py-3">{row.lot || '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatQuantity(row.quantity, row.unit)}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => onEdit?.(row)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> 수정
                        </Button>
                        {row.source === 'inventory' && onDelete ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete(row.id)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> 삭제
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-4 items-center gap-3">
      <span className="text-right text-sm font-medium">{label}</span>
      <div className="col-span-3">{children}</div>
    </div>
  )
}
