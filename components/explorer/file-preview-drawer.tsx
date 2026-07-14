'use client'

import { useState } from 'react'
import { X, Download, Edit, Trash2, FileText, Maximize2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DocumentMetadata } from '@/lib/types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { notifyDataChanged } from '@/lib/data-events'
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
import { EditDocumentDialog } from '@/components/explorer/edit-document-dialog'
import { PdfViewerModal } from '@/components/explorer/pdf-viewer-modal'

interface FilePreviewDrawerProps {
  document: DocumentMetadata | null
  open: boolean
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate: (doc: DocumentMetadata) => void
}

function normalizeDate(value?: string | null) {
  if (!value) return null

  const date = value.replace(/\./g, '-')

  // 20260713
  if (/^\d{8}$/.test(date)) {
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
  }

  // 2026-07-13
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }

  return null
}

function MetaRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground flex-1 break-all">{value}</span>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FilePreviewDrawer({ document, open, onClose, onDelete, onUpdate }: FilePreviewDrawerProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [fullViewOpen, setFullViewOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!document) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('문서가 삭제되었습니다.')
      onDelete(document.id)
      notifyDataChanged('documents')
      onClose()
    } catch {
      toast.error('삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (!document) return null

  const fileUrl = `/api/file?path=${encodeURIComponent(document.storagePath)}`

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col gap-0">
          <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-sm font-semibold truncate">{document.filename}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{document.company} · {document.documentType}</p>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto">
            {/* PDF Preview */}
            <div className="p-4">
              <div
              className="group relative w-full bg-muted/40 rounded-xl overflow-hidden border border-border"
              style={{ height: '340px' }}
              >
                <iframe
                  src={fileUrl}
                  className="w-full h-full"
                  title={document.filename}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="absolute top-15 right-5 z-10
                            gap-2 px-5 py-2.5 h-auto text-sm
                            opacity-0 group-hover:opacity-100
                            transition-opacity duration-200"
                  onClick={() => setFullViewOpen(true)}
                >
                  <Maximize2 className="w-4 h-4" />
                  크게 보기
                </Button>
              </div>
            </div>

            {/* Metadata */}
            <div className="px-6 pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">문서 정보</p>
              <Separator className="mb-3" />
              <div className="divide-y divide-border/50">
                <MetaRow label="업체명" value={document.company} />
                <MetaRow label="문서유형" value={document.documentType} />
                <MetaRow label="LOT 시작" value={document.lotStart} />
                <MetaRow label="LOT 종료" value={document.lotEnd} />
                <MetaRow label="품목" value={document.product} />
                <MetaRow label="재질" value={document.material} />
                <MetaRow label="도금사양" value={document.specification} />
                <MetaRow label="수량" value={document.quantity ? `${document.quantity.toLocaleString()} Kg` : null} />
                <MetaRow
                  label="발행일"
                  value={
                    normalizeDate(document.issueDate)
                      ? format(
                          new Date(normalizeDate(document.issueDate)!),
                          'yyyy년 MM월 dd일',
                          { locale: ko }
                        )
                      : '-'
                  }
                />
                <MetaRow label="파일크기" value={formatBytes(document.fileSize)} />
                <MetaRow label="비고" value={document.note} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-6 py-4 border-t border-border flex-shrink-0 flex gap-2">
            <Button
              variant="default"
              className="flex-1 gap-1.5"
              onClick={() => {
                window.location.href = `${fileUrl}&download=true`
              }}
            >
              <Download className="w-4 h-4" />
              다운로드
            </Button>
            <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} title="수정">
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* PDF full view modal */}
      <PdfViewerModal
        open={fullViewOpen}
        onClose={() => setFullViewOpen(false)}
        fileUrl={fileUrl}
        filename={document.filename}
        subtitle={`${document.company} · ${document.documentType}`}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>문서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{document.filename}</strong> 을(를) 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      {editOpen && (
        <EditDocumentDialog
          document={document}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onUpdate={doc => {
            onUpdate(doc)
            setEditOpen(false)
          }}
        />
      )}
    </>
  )
}
