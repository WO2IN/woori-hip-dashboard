import { NextRequest, NextResponse } from 'next/server'
import { readConfig, writeConfig } from '@/lib/storage'
import { readMetadata } from '@/lib/storage'

const VALID_CONFIGS = ['companies', 'document-types', 'materials', 'specifications', 'products']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  if (!name || !VALID_CONFIGS.includes(name)) {
    return NextResponse.json({ error: '유효하지 않은 설정 파일입니다.' }, { status: 400 })
  }
  const data = readConfig(name)
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, value } = body

  if (!name || !VALID_CONFIGS.includes(name) || !value?.trim()) {
    return NextResponse.json(
      { error: '유효하지 않은 요청입니다.' },
      { status: 400 }
    )
  }

  const data = readConfig(name)
  const trimmed = value.trim()

  // 기존 값 제거 후 맨 앞으로 이동
  const updated = [
    trimmed,
    ...data.filter(v => v !== trimmed),
  ]

  writeConfig(name, updated)

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { name, value } = body
  if (!name || !VALID_CONFIGS.includes(name) || !value?.trim()) {
    return NextResponse.json({ error: '유효하지 않은 요청입니다.' }, { status: 400 })
  }

  // Check if any document uses this value
  const metadata = readMetadata()
  const fieldMap: Record<string, string> = {
    companies: 'company',
    'document-types': 'documentType',
    materials: 'material',
    specifications: 'specification',
    products: 'product',
  }
  const field = fieldMap[name] as keyof typeof metadata[0]
  if (field) {
    const inUse = metadata.some(doc => doc[field] === value)
    if (inUse) {
      return NextResponse.json(
        { error: '등록된 문서가 존재하여 삭제할 수 없습니다.' },
        { status: 409 }
      )
    }
  }

  const data = readConfig(name)
  const updated = data.filter(v => v !== value)
  writeConfig(name, updated)
  return NextResponse.json({ data: updated })
}
