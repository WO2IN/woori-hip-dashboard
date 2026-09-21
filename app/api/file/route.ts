import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { getDocumentFilePath } from '@/lib/storage'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filePath = searchParams.get('path')
  if (!filePath) return NextResponse.json({ error: '경로가 없습니다.' }, { status: 400 })

  // Security: prevent path traversal
  if (filePath.includes('..')) {
    return NextResponse.json({ error: '잘못된 경로입니다.' }, { status: 400 })
  }

  const absPath = getDocumentFilePath(filePath)
  if (!fs.existsSync(absPath)) {
    return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
  }

  const buffer = fs.readFileSync(absPath)
  const download = searchParams.get('download') === 'true'
  const downloadName = searchParams.get('downloadName') || filePath.split('/').pop() || 'document.pdf'
  const safeDownloadName = downloadName.replace(/[\\/:*?"<>|\r\n]/g, '_')

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': download
        ? `attachment; filename*=UTF-8''${encodeURIComponent(safeDownloadName)}`
        : 'inline',
    },
  })
}
