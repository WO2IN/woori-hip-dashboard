'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardCheck, Pencil, Plus, RefreshCw, Trash2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/auth/auth-context'
import { buildAuthHeaders, getSession } from '@/lib/auth-client'
import { useDataChanged } from '@/lib/data-events'
import { cn } from '@/lib/utils'
import {
  PROCESS_CHECK_COMPANY,
  PROCESS_CHECK_FIELDS,
  PROCESS_CHECK_PRODUCT,
  PROCESS_CHECK_SECTIONS,
  ProcessAnswer,
  ProcessCheckRecord,
  ProcessFieldSpec,
  countFilled,
  emptyAnswers,
  isOutOfRange,
  mergeAnswers,
} from '@/lib/process-checklist'

type TabKey = 'form' | 'list'

function nowDate() {
  return new Date().toISOString().slice(0, 10)
}

function nowTime() {
  const date = new Date()
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function authHeaders() {
  const session = getSession()
  return {
    'Content-Type': 'application/json',
    ...(session ? buildAuthHeaders(session) : {}),
  }
}

export function ProcessCheckView() {
  const { user } = useAuth()
  const editable = Boolean(user && user.role !== 'viewer')
  const [tab, setTab] = useState<TabKey>('form')
  const [records, setRecords] = useState<ProcessCheckRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [writtenDate, setWrittenDate] = useState(nowDate)
  const [writtenTime, setWrittenTime] = useState(nowTime)
  const [author, setAuthor] = useState('')
  const [answers, setAnswers] = useState<Record<string, ProcessAnswer>>(emptyAnswers)
  const [viewing, setViewing] = useState<ProcessCheckRecord | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sectionId, setSectionId] = useState(PROCESS_CHECK_SECTIONS[0].id)
  const activeSection = PROCESS_CHECK_SECTIONS.find((section) => section.id === sectionId) ?? PROCESS_CHECK_SECTIONS[0]

  useEffect(() => {
    if (user?.displayName && !author) setAuthor(user.displayName)
  }, [author, user?.displayName])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const session = getSession()
      const response = await fetch('/api/process-checks', {
        cache: 'no-store',
        headers: session ? buildAuthHeaders(session) : {},
      })
      if (!response.ok) throw new Error('기록을 불러오지 못했습니다.')
      const result = await response.json()
      setRecords(result.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '기록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  useDataChanged(() => void load(), [load])

  const filled = countFilled(answers)
  const outOfRangeCount = PROCESS_CHECK_FIELDS.filter((field) => isOutOfRange(field, answers[field.id])).length
  const noCount = PROCESS_CHECK_FIELDS.filter((field) => field.type === 'yesno' && answers[field.id] === 'no').length

  const startNew = () => {
    setEditingId(null)
    setViewing(null)
    setAnswers(emptyAnswers())
    setWrittenDate(nowDate())
    setWrittenTime(nowTime())
    if (user?.displayName) setAuthor(user.displayName)
    setSectionId(PROCESS_CHECK_SECTIONS[0].id)
    setTab('form')
  }

  const startEdit = (record: ProcessCheckRecord) => {
    setEditingId(record.id)
    setViewing(null)
    setWrittenDate(record.writtenDate)
    setWrittenTime(record.writtenTime)
    setAuthor(record.author)
    setAnswers(mergeAnswers(record.answers))
    setSectionId(PROCESS_CHECK_SECTIONS[0].id)
    setTab('form')
  }

  const save = async () => {
    if (!writtenDate || !writtenTime || !author.trim()) {
      toast.error('작성일자, 시간, 작성자를 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/process-checks', {
        method: editingId ? 'PATCH' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          id: editingId,
          writtenDate,
          writtenTime,
          author: author.trim(),
          answers,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '저장에 실패했습니다.')
      toast.success(editingId ? '공정 점검 기록을 수정했습니다.' : '공정 점검 기록을 저장했습니다.')
      setEditingId(null)
      setAnswers(emptyAnswers())
      setWrittenDate(nowDate())
      setWrittenTime(nowTime())
      setSectionId(PROCESS_CHECK_SECTIONS[0].id)
      await load()
      setTab('list')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('이 공정 점검 기록을 삭제하시겠습니까?')) return
    try {
      const response = await fetch('/api/process-checks', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '삭제에 실패했습니다.')
      toast.success('기록을 삭제했습니다.')
      if (viewing?.id === id) setViewing(null)
      if (editingId === id) {
        setEditingId(null)
        setAnswers(emptyAnswers())
        setWrittenDate(nowDate())
        setWrittenTime(nowTime())
      }
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다.')
    }
  }

  const setAnswer = (id: string, value: ProcessAnswer) => {
    setAnswers((current) => ({ ...current, [id]: value }))
  }

  return (
    <main className="p-4 md:p-8">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">공정 점검</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {PROCESS_CHECK_COMPANY} · {PROCESS_CHECK_PRODUCT} 라인 온도와 작업 흐름을 현장에서 기록합니다.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" /> 새로고침
          </Button>
          {editable && tab === 'list' && (
            <Button onClick={startNew}>
              <Plus className="mr-2 h-4 w-4" /> 새 기록
            </Button>
          )}
        </div>
      </header>

      <div className="mb-5 flex gap-1 rounded-lg border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => { setTab('form'); setViewing(null) }}
          className={cn('flex-1 rounded-md px-3 py-2 text-sm font-medium', tab === 'form' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
        >
          {editingId ? '점검 수정' : '점검 작성'}
        </button>
        <button
          type="button"
          onClick={() => setTab('list')}
          className={cn('flex-1 rounded-md px-3 py-2 text-sm font-medium', tab === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
        >
          기록 목록 <span className="text-xs text-muted-foreground">{records.length}</span>
        </button>
      </div>

      {tab === 'form' ? (
        <div className="space-y-5">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{editingId ? '기본 정보 수정' : '기본 정보'}</h2>
              <p className="text-xs text-muted-foreground">
                항목 {filled}/{PROCESS_CHECK_FIELDS.length}
                {outOfRangeCount > 0 ? ` · 규격 이탈 ${outOfRangeCount}` : ''}
                {noCount > 0 ? ` · No ${noCount}` : ''}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm font-medium">
                <span>작성일자</span>
                <Input type="date" value={writtenDate} onChange={(event) => setWrittenDate(event.target.value)} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                <span>시간</span>
                <Input type="time" value={writtenTime} onChange={(event) => setWrittenTime(event.target.value)} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                <span>작성자</span>
                <Input placeholder="이름을 입력해주세요." value={author} onChange={(event) => setAuthor(event.target.value)} />
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <SectionNav value={sectionId} onChange={setSectionId} />
            <div className="divide-y">
              {activeSection.fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  value={answers[field.id]}
                  onChange={(value) => setAnswer(field.id, value)}
                  disabled={!editable}
                />
              ))}
            </div>
            <SectionPager value={sectionId} onChange={setSectionId} />
          </section>

          {editable && (
            <div className="sticky bottom-3 flex gap-2">
              {editingId && (
                <Button type="button" variant="outline" className="h-12 flex-1 sm:flex-none" disabled={saving} onClick={startNew}>
                  수정 취소
                </Button>
              )}
              <Button size="lg" className="h-12 flex-1 shadow-lg sm:min-w-40" disabled={saving} onClick={() => void save()}>
                {saving ? '저장 중...' : editingId ? '수정 내용 저장' : '점검 기록 저장'}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <RecordList
          loading={loading}
          records={records}
          editable={editable}
          viewing={viewing}
          onView={setViewing}
          onEdit={startEdit}
          onDelete={remove}
        />
      )}
    </main>
  )
}

function FieldRow({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ProcessFieldSpec
  value: ProcessAnswer
  onChange: (value: ProcessAnswer) => void
  disabled?: boolean
}) {
  const out = isOutOfRange(field, value)
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[72px_1fr_minmax(180px,280px)] sm:items-center">
      <span className="text-xs font-semibold text-muted-foreground">#{field.no}</span>
      <div>
        <p className="text-sm font-medium">{field.label}</p>
        {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
        {out && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <TriangleAlert className="h-3.5 w-3.5" /> 규격 범위를 벗어났습니다.
          </p>
        )}
      </div>
      {field.type === 'yesno' ? (
        <YesNo value={value} onChange={onChange} disabled={disabled} />
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="any"
            disabled={disabled}
            value={value === '' ? '' : value}
            onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
            className={cn('h-11 text-base', out && 'border-amber-500')}
          />
          {field.unit && <span className="w-10 shrink-0 text-sm text-muted-foreground">{field.unit}</span>}
        </div>
      )}
    </div>
  )
}

function YesNo({
  value,
  onChange,
  disabled,
}: {
  value: ProcessAnswer
  onChange: (value: ProcessAnswer) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('yes')}
        className={cn(
          'h-11 rounded-lg border text-sm font-semibold',
          value === 'yes'
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-input bg-background hover:bg-muted',
        )}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('no')}
        className={cn(
          'h-11 rounded-lg border text-sm font-semibold',
          value === 'no'
            ? 'border-rose-600 bg-rose-600 text-white'
            : 'border-input bg-background hover:bg-muted',
        )}
      >
        No
      </button>
    </div>
  )
}

function RecordList({
  loading,
  records,
  editable,
  viewing,
  onView,
  onEdit,
  onDelete,
}: {
  loading: boolean
  records: ProcessCheckRecord[]
  editable: boolean
  viewing: ProcessCheckRecord | null
  onView: (record: ProcessCheckRecord | null) => void
  onEdit: (record: ProcessCheckRecord) => void
  onDelete: (id: string) => void
}) {
  const detailAnswers = useMemo(() => viewing?.answers ?? emptyAnswers(), [viewing])
  const [detailSectionId, setDetailSectionId] = useState(PROCESS_CHECK_SECTIONS[0].id)
  const detailSection = PROCESS_CHECK_SECTIONS.find((section) => section.id === detailSectionId) ?? PROCESS_CHECK_SECTIONS[0]

  useEffect(() => {
    setDetailSectionId(PROCESS_CHECK_SECTIONS[0].id)
  }, [viewing?.id])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3 font-semibold">저장 기록</div>
        <div className="max-h-[70vh] overflow-auto">
          {records.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">아직 저장된 점검 기록이 없습니다.</p>
          ) : (
            records.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => onView(record)}
                className={cn(
                  'flex w-full flex-col items-start gap-1 border-b px-4 py-3 text-left hover:bg-muted/40',
                  viewing?.id === record.id && 'bg-muted/60',
                )}
              >
                <span className="text-sm font-medium">{record.writtenDate} {record.writtenTime}</span>
                <span className="text-xs text-muted-foreground">{record.author} · {countFilled(record.answers)}/{PROCESS_CHECK_FIELDS.length}항</span>
              </button>
            ))
          )}
        </div>
      </section>
      <section className="rounded-xl border bg-card shadow-sm">
        {!viewing ? (
          <p className="p-10 text-center text-sm text-muted-foreground">왼쪽에서 기록을 선택하면 상세 내용이 표시됩니다.</p>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <h2 className="font-semibold">{viewing.writtenDate} {viewing.writtenTime}</h2>
                <p className="text-xs text-muted-foreground">{viewing.author} · {viewing.company} · {viewing.product}</p>
              </div>
              {editable && (
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" onClick={() => onEdit(viewing)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> 수정
                  </Button>
                  <Button variant="outline" className="border-destructive/40 text-destructive" onClick={() => onDelete(viewing.id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> 삭제
                  </Button>
                </div>
              )}
            </div>
            <SectionNav value={detailSectionId} onChange={setDetailSectionId} />
            {detailSection.fields.map((field) => {
              const value = detailAnswers[field.id]
              const out = isOutOfRange(field, value)
              return (
                <div key={field.id} className="flex items-start justify-between gap-3 border-b px-4 py-2 text-sm last:border-0">
                  <span className="text-muted-foreground">#{field.no} {field.label}</span>
                  <span className={cn('shrink-0 font-medium', value === 'no' || out ? 'text-rose-600' : '')}>
                    {formatAnswer(field, value)}
                  </span>
                </div>
              )
            })}
            <SectionPager value={detailSectionId} onChange={setDetailSectionId} />
          </div>
        )}
      </section>
    </div>
  )
}

function sectionIndex(id: string) {
  return PROCESS_CHECK_SECTIONS.findIndex((section) => section.id === id)
}

function SectionNav({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const current = PROCESS_CHECK_SECTIONS.find((section) => section.id === value) ?? PROCESS_CHECK_SECTIONS[0]
  const index = sectionIndex(current.id)

  return (
    <div className="border-b bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">[{current.title}]</h2>
        <span className="text-xs text-muted-foreground">{index + 1} / {PROCESS_CHECK_SECTIONS.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {PROCESS_CHECK_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={cn(
              'h-11 rounded-lg border px-2 text-sm font-medium leading-tight',
              section.id === current.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background text-foreground',
            )}
          >
            {section.title}
          </button>
        ))}
      </div>
    </div>
  )
}

function SectionPager({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const index = sectionIndex(value)
  const prev = index > 0 ? PROCESS_CHECK_SECTIONS[index - 1] : null
  const next = index < PROCESS_CHECK_SECTIONS.length - 1 ? PROCESS_CHECK_SECTIONS[index + 1] : null

  return (
    <div className="flex gap-2 border-t p-3">
      <Button
        type="button"
        variant="outline"
        className="h-11 flex-1"
        disabled={!prev}
        onClick={() => prev && onChange(prev.id)}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {prev ? prev.title : '이전'}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 flex-1"
        disabled={!next}
        onClick={() => next && onChange(next.id)}
      >
        {next ? next.title : '다음'}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  )
}

function formatAnswer(field: ProcessFieldSpec, value: ProcessAnswer) {
  if (value === '' || value == null) return '-'
  if (value === 'yes') return 'Yes'
  if (value === 'no') return 'No'
  return field.unit ? `${value} ${field.unit}` : String(value)
}
