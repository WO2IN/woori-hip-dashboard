import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PassThrough } from 'stream'
import { ZipArchive } from 'archiver'
import { readMetadata } from '@/lib/storage'

export const runtime = 'nodejs'

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
      name: doc.originalName || doc.filename
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
})}