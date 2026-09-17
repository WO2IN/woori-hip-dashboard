'use client'

import { useState, useMemo } from 'react'
import { FileText, Eye, Download, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentMetadata } from '@/lib/types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FilePreviewDrawer } from '@/components/explorer/file-preview-drawer'

interface RecentDocumentsProps {
  documents: DocumentMetadata[]
}

function formatIssueDate(date: string | null | undefined) {
  if (!date) return '-'

  const value = String(date).trim()

  let parsed: Date | null = null

  // 20260713
  if (/^\d{8}$/.test(value)) {
    parsed = new Date(
      Number(value.slice(0, 4)),
      Number(value.slice(4, 6)) - 1,
      Number(value.slice(6, 8))
    )
  }

  // 260713 → 2026.07.13
  else if (/^\d{6}$/.test(value)) {
    parsed = new Date(
      Number(`20${value.slice(0, 2)}`),
      Number(value.slice(2, 4)) - 1,
      Number(value.slice(4, 6))
    )
  }

  // 구분자 제거 후 숫자 날짜 처리
  else if (/^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(value)) {
    const numbers = value.split(/[./-]/)

    parsed = new Date(
      Number(numbers[0]),
      Number(numbers[1]) - 1,
      Number(numbers[2])
    )
  }

  // 25.07.07 → 2025.07.07
  else if (/^\d{2}[./-]\d{1,2}[./-]\d{1,2}$/.test(value)) {
    const numbers = value.split(/[./-]/)

    parsed = new Date(
      Number(`20${numbers[0]}`),
      Number(numbers[1]) - 1,
      Number(numbers[2])
    )
  }

  // 기본 JS 날짜 파싱
  else {
    const temp = new Date(value)

    if (!isNaN(temp.getTime())) {
      parsed = temp
    }
  }

  if (!parsed || isNaN(parsed.getTime())) {
    return '-'
  }

  return format(parsed, 'yyyy.MM.dd', { locale: ko })
}

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  const [preview, setPreview] = useState<DocumentMetadata | null>(null)

  type SortKey =
  | 'filename'
  | 'company'
  | 'documentType'
  | 'lotStart'
  | 'issueDate'
  | 'quantity'  

const [sortKey, setSortKey] = useState<SortKey>('issueDate')
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

const handleSort = (key: SortKey) => {
  if (sortKey === key) {
    setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
  } else {
    setSortKey(key)
    setSortDir('asc')
  }
}

const SortIcon = ({ column }: { column: SortKey }) => {
  if (sortKey !== column) return null

  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 ml-1" />
    : <ChevronDown className="w-3.5 h-3.5 ml-1" />
}

const sortedDocuments = useMemo(() => {
  return [...documents].sort((a, b) => {

    let av: any = a[sortKey]
    let bv: any = b[sortKey]

    if (sortKey === 'quantity') {
      av = Number(a.quantity ?? 0)
      bv = Number(b.quantity ?? 0)
    }

    if (sortKey === 'issueDate') {
      av = a.issueDate ?? ''
      bv = b.issueDate ?? ''
    }

    let result = 0

    if (sortKey === 'quantity') {
      result = av - bv
    } else {
      result = String(av ?? '')
        .localeCompare(String(bv ?? ''), 'ko')
    }
 
    return sortDir === 'asc'
      ? result
      : -result
  })
}, [documents, sortKey, sortDir])

  if (documents.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground mb-1">등록된 문서가 없습니다</p>
        <p className="text-sm text-muted-foreground">
          문서를 등록하면 여기에 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[0_1px_3px_oklch(0_0_0/0.05)] dark:shadow-[0_1px_3px_oklch(0_0_0/0.25)]">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">

              <th
                onClick={() => handleSort('filename')}
                className="cursor-pointer text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
              >
                <div className="flex items-center gap-1">
                  파일명
                  <SortIcon column="filename" />
                </div>
              </th>

              <th
                onClick={() => handleSort('company')}
                className="cursor-pointer text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell"
              >
                <div className="flex items-center gap-1">
                  업체
                  <SortIcon column="company" />
                </div>
              </th>

              <th
                onClick={() => handleSort('documentType')}
                className="cursor-pointer text-center px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell"
              >
                <div className="flex items-center justify-center gap-1">
                  유형
                  <SortIcon column="documentType" />
                </div>
              </th>

              <th
                onClick={() => handleSort('lotStart')}
                className="cursor-pointer text-center px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell"
              >
                <div className="flex items-center justify-center gap-1">
                  LOT
                  <SortIcon column="lotStart" />
                </div>
              </th>
              <th
                onClick={() => handleSort('issueDate')}
                className="cursor-pointer text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell"
              >
                <div className="flex items-center gap-1">
                  발행일
                  <SortIcon column="issueDate" />
                </div>
              </th>

              <th
                onClick={() => handleSort('quantity')}
                className="cursor-pointer text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell"
              >
                <div className="flex items-center gap-1">
                  수량
                  <SortIcon column="quantity" />
                </div>
              </th>

              <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                작업
              </th>

            </tr>
          </thead>

            <tbody className="divide-y divide-border">
              {sortedDocuments.map(doc => (
                <tr
                  key={doc.id}
                  className="hover:bg-muted/20 transition-colors group cursor-pointer"
                  onClick={() => setPreview(doc)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[oklch(0.577_0.245_27.325/0.1)] dark:bg-[oklch(0.577_0.245_27.325/0.15)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-[oklch(0.52_0.22_27)] dark:text-[oklch(0.70_0.20_27)]" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                          {doc.filename}
                        </p>

                        <p className="text-xs text-muted-foreground md:hidden mt-0.5">
                          {doc.company} · {doc.documentType}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-foreground">
                      {doc.company}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 hidden md:table-cell text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-accent text-accent-foreground border border-border">
                      {doc.documentType}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <div className="flex justify-center">
                    <div className="w-[210px] text-left pl-4">
                        {doc.lotEnd ? (
                          <span className="text-sm text-muted-foreground font-mono">
                            {doc.lotStart} ~ {doc.lotEnd}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground font-mono">
                            {doc.lotStart}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatIssueDate(doc.issueDate)}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 hidden xl:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {doc.quantity ? `${doc.quantity.toLocaleString()} ${doc.quantityUnit || 'Kg'}` : '-'}
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreview(doc)
                        }}
                        title="미리보기"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      <a
                        href={`/api/file?path=${encodeURIComponent(doc.storagePath ?? '')}&download=true`}
                        download
                        title="다운로드"
                        onClick={e => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FilePreviewDrawer
        document={preview}
        open={!!preview}
        onClose={() => setPreview(null)}
        onDelete={() => setPreview(null)}
        onUpdate={() => {}}
      />
    </>
  )
}
  
