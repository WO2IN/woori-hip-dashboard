'use client'

import { useState } from 'react'
import { FileText, Eye, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DocumentMetadata } from '@/lib/types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FilePreviewDrawer } from '@/components/explorer/file-preview-drawer'

interface RecentDocumentsProps {
  documents: DocumentMetadata[]
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
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

  if (documents.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">등록된 문서가 없습니다.</p>
        <p className="text-sm text-muted-foreground mt-1">
          문서를 등록하면 여기에 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  파일명
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  업체
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  유형
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  LOT
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  발행일
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                  크기
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {documents.map(doc => (
                <tr
                  key={doc.id}
                  className="
                    hover:bg-muted/30
                    transition-colors
                    group
                    cursor-pointer
                  "
                  onClick={() => setPreview(doc)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-red-50 dark:bg-red-950/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                          {doc.filename}
                        </p>

                        <p className="text-xs text-muted-foreground md:hidden">
                          {doc.company} · {doc.documentType}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-foreground">
                      {doc.company}
                    </span>
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="secondary" className="text-xs">
                      {doc.documentType}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground font-mono">
                      {doc.lotStart}
                      {doc.lotEnd ? ` ~ ${doc.lotEnd}` : ''}
                    </span>
                  </td>

                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatIssueDate(doc.issueDate)}
                    </span>
                  </td>

                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatBytes(doc.fileSize)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
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
                        href={`/api/file?path=${encodeURIComponent(doc.storagePath)}&download=true`}
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