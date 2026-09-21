import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PassThrough } from 'stream'
import { ZipArchive } from 'archiver'
import { readMetadata } from '@/lib/storage'
import { DocumentMetadata } from '@/lib/types'

export const runtime = 'nodejs'

function getDownloadName(doc: DocumentMetadata) {
  const date = String(doc.issueDate || '').replace(/[^0-9]/g, '').slice(0, 8) || '날짜없음'
  const quantity = doc.quantity != null
    ? `${doc.quantity}${doc.quantityUnit || 'Kg'}`
    : '수량없음'
  const sanitize = (value: string) =>
    value.replace(/[\\/:?"<>|\r\n]/g, '_').replace(/\s+/g, '_').trim() || '미입력'

  const product = String(doc.product || '').replace(/\*/g, 'x').replace(/\s+/g, '_')

  return `${date}_${sanitize(doc.company)}_${product}_${quantity}.pdf`
}

export async function POST(req: NextRequest) {
  const { ids } = await req.json()

  if (!ids || ids.length === 0) {
    return NextResponse.json(
      { error: '파일 없음' },
      { status: 400 }
    )
  }

  const metadata = await readMetadata()

  const stream = new PassThrough()

  const archive = new ZipArchive({
    zlib: { level: 9 }
  })

  archive.pipe(stream)

  for (const id of ids) {
    const doc = metadata.find(
      (item: any) => item.id === id
    )

    if (!doc) continue

    const filePath = path.join(
      process.cwd(),
      'public',
      'storage',
      doc.storagePath
    )

    if (fs.existsSync(filePath)) {
      archive.file(filePath, {
        name: getDownloadName(doc)
      })
    }
  }

  archive.finalize()

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition':
        'attachment; filename="documents.zip"',
    },
  })
}
