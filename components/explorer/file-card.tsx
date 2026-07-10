'use client'

import { useState } from 'react'
import { FileText, Eye, Download, Trash2, MoreVertical, Calendar, Hash, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { notifyDataChanged } from '@/lib/data-events'

interface FileCardProps {
  document: DocumentMetadata
  onPreview: (doc: DocumentMetadata) => void
  onDelete: (id: string) => void
  viewMode?: 'grid' | 'list'
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FileCard({ document, onPreview, onDelete, viewMode = 'grid' }: FileCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('문서가 삭제되었습니다.')
      onDelete(document.id)
      notifyDataChanged('documents')
    } catch {
      toast.error('삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (viewMode === 'list') {
    return (
      <>
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/50 group cursor-pointer"
          onClick={() => onPreview(document)}>
          <div className="w-9 h-9 bg-red-50 dark:bg-red-950/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-4.5 h-4.5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-[2fr_1fr_1.2fr_1fr_0.7fr] gap-4">
            <div className="md:col-span-1">
              <p className="text-sm font-medium text-foreground truncate">{document.filename}</p>
              <p className="text-xs text-muted-foreground">{document.company}</p>
              {/* 비고 추가 */}
              {document.note && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded truncate max-w-[100px]">
                  {document.note}
                </span>
                )}
            </div>
            <div className="hidden md:flex items-center justify-center">
              <Badge variant="secondary" className="text-xs">
                {document.documentType}
              </Badge>
            </div>
            <div className="hidden md:flex items-center justify-center">
            <span className="text-sm text-muted-foreground font-mono text-xs">
              {document.lotStart}{document.lotEnd ? ` ~ ${document.lotEnd}` : ''}
            </span>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {format(new Date(document.issueDate), 'yyyy.MM.dd')}
              </span>
            </div>

            <div className="hidden md:flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {formatBytes(document.fileSize)}
              </span>
            </div>
          </div>
          <div className="w-[108px] flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onPreview(document)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <a
              href={`/api/file?path=${encodeURIComponent(document.storagePath)}&download=true`}
              download
            >
              <Button variant="ghost" size="icon" className="w-7 h-7">
                <Download className="w-3.5 h-3.5" />
              </Button>
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <DeleteDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} deleting={deleting} filename={document.filename} />
      </>
    )
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-primary/30 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center"
            onClick={() => onPreview(document)}
          >
            <FileText className="w-6 h-6 text-red-500" />
          </div>
          <DropdownMenu>
          <DropdownMenuTrigger
            className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md hover:bg-accent"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onPreview(document)}>
                <Eye className="w-3.5 h-3.5 mr-2" /> 미리보기
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = `/api/file?path=${encodeURIComponent(document.storagePath)}&download=true`
                }}
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                다운로드
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* File name */}
        <div onClick={() => onPreview(document)}>
          <p className="text-sm font-semibold text-foreground truncate mb-1" title={document.filename}>
            {document.filename}
          </p>
          <Badge variant="secondary" className="text-xs mb-3">{document.documentType}</Badge>

          <div className="space-y-1.5 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Package className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{document.product}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hash className="w-3 h-3 flex-shrink-0" />
              <span className="font-mono truncate">
                {document.lotStart}{document.lotEnd ? ` ~ ${document.lotEnd}` : ''}
              </span>
            </div>

            {/* 비고 */}
            {document.note && (
              <div className="text-xs">
                <span className="font-medium text-amber-600 mr-1">비고</span>
                <span className="text-muted-foreground break-all">
                  {document.note}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span>{format(new Date(document.issueDate), 'yyyy.MM.dd', { locale: ko })}</span>
              <span className="ml-auto">{formatBytes(document.fileSize)}</span>
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="flex gap-1.5 mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => onPreview(document)}>
            <Eye className="w-3 h-3" /> 미리보기
          </Button>
          <a
            href={`/api/file?path=${encodeURIComponent(document.storagePath)}&download=true`}
            download
          >
            <Button variant="outline" size="icon" className="h-7 w-7">
              <Download className="w-3 h-3" />
            </Button>
          </a>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        deleting={deleting}
        filename={document.filename}
      />
    </>
  )
}

function DeleteDialog({ open, onClose, onConfirm, deleting, filename }: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
  filename: string
}) {
  return (
    <AlertDialog open={open} onOpenChange={v => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>문서 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{filename}</strong> 을(를) 삭제하시겠습니까?
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
