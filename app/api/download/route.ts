import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const file = searchParams.get('file')

  if (!file) {
    return NextResponse.json(
      { error: '파일 없음' },
      { status: 400 }
    )
  }

  const filePath = path.join(
    process.cwd(),
    'storage',
    file
  )

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
      'Content-Disposition': `attachment; filename="${file}"`,
    },
  })
}