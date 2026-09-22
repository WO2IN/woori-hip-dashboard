import { NextRequest, NextResponse } from 'next/server'
import { readConfig, writeConfig, appendAuditLog } from '@/lib/storage'
import { getUserFromHeaders } from '@/lib/auth'
import { readMetadata } from '@/lib/storage'

const VALID_CONFIGS = ['companies', 'document-types', 'materials', 'specifications', 'products', 'shipment-categories']
const CONFIG_ALIASES: Record<string, string> = {
  'shipment-category': 'shipment-categories',
}

function normalizeConfigName(name: unknown) {
  const value = typeof name === 'string' ? name.trim() : ''
  return CONFIG_ALIASES[value] ?? value
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = normalizeConfigName(searchParams.get('name'))
  if (!name || !VALID_CONFIGS.includes(name)) {
    return NextResponse.json({ error: '유효하지 않은 설정 파일입니다.' }, { status: 400 })
  }
  const data = readConfig(name)
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')

  if (role === 'viewer') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    )
  }
  const body = await req.json()
  const name = normalizeConfigName(body.name)
  const { value } = body

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
  const user = getUserFromHeaders(req.headers)
  if (user) appendAuditLog({ action: 'CREATE', target: 'config', detail: `${name}: ${trimmed}`, userId: user.id, userName: user.displayName })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest) {
  const role = req.headers.get('x-user-role')

  if (role === 'viewer') {
    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    )
  }
  const body = await req.json()
  const name = normalizeConfigName(body.name)
  const { value, force } = body
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
    'shipment-categories': 'shipmentCategory',
  }
  const field = fieldMap[name] as keyof typeof metadata[0]
  if (field) {
    const inUse = metadata.some(doc => doc[field] === value)
    if (inUse && !force) {
      return NextResponse.json(
        { 
          error: '등록된 문서가 존재합니다.',
          used: true
        },
        { status: 409 }
      )
    }
  }

  const data = readConfig(name)
  const updated = data.filter(v => v !== value)
  writeConfig(name, updated)
  const user = getUserFromHeaders(req.headers)
  if (user) appendAuditLog({ action: 'DELETE', target: 'config', detail: `${name}: ${value}`, userId: user.id, userName: user.displayName })
  return NextResponse.json({ data: updated })
}
