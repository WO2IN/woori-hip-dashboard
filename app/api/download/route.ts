import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const file = searchParams.get('file')

  if (!file || file.includes('..') || file.includes('/') || file.includes('\\')) {
    return NextResponse.json(
      { error: '잘못된 파일명입니다.' },
      { status: 400 }
    )
  }

  if (!file) {
    return NextResponse.json(
      { error: '파일 없음' },
      { status: 400 }
    )
  }

  const storageDir = path.resolve(process.cwd(), 'storage')
  const filePath = path.resolve(storageDir, file)

  if (!filePath.startsWith(storageDir)) {
    return NextResponse.json(
      { error: '잘못된 요청입니다.' },
      { status: 400 }
    )
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: '파일 없음' },
      { status: 404 }
    )
  }

  const buffer = fs.readFileSync(filePath)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file)}`,
    },
  })
}