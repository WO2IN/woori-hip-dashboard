import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getUserFromHeaders } from '@/lib/auth'
import { appendAuditLog } from '@/lib/storage'
import type { UserRole } from '@/lib/types'

const ORGANIZATION_FILE = path.join(process.cwd(), 'config', 'organization.json')
const DEFAULT_EXECUTIVES = [
  { label: '회장 배준기', kind: 'person' },
  { label: '대표이사 홍성호', kind: 'person' },
  { label: '상무이사 임종배', kind: 'person' },
]

function normalizeOrganization(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const record = value as { executive?: { people?: unknown[] }; departments?: unknown }
  const people = Array.isArray(record.executive?.people)
    ? record.executive.people.filter((person): person is { label: string; kind: 'person' } => (
      !!person && typeof person === 'object' && typeof (person as { label?: unknown }).label === 'string'
    ))
    : []

  return {
    executive: { people: people.length > 0 ? people : DEFAULT_EXECUTIVES },
    departments: Array.isArray(record.departments) ? record.departments : [],
  }
}

function readOrganization() {
  if (!fs.existsSync(ORGANIZATION_FILE)) return null
  try {
    return normalizeOrganization(JSON.parse(fs.readFileSync(ORGANIZATION_FILE, 'utf-8')))
  } catch {
    return null
  }
}

export async function GET() {
  return NextResponse.json({ data: readOrganization() })
}

export async function PUT(request: NextRequest) {
  const user = getUserFromHeaders(request.headers)
  const role = user?.role as UserRole | undefined

  if (role !== 'admin') {
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 })
  }

  const body = await request.json()
  if (!Array.isArray(body?.departments)) {
    return NextResponse.json({ error: '조직도 데이터가 올바르지 않습니다.' }, { status: 400 })
  }

  const executive = body.executive
  if (!executive || typeof executive !== 'object' || !Array.isArray(executive.people) || executive.people.length === 0 || executive.people.some((person: unknown) => !person || typeof person !== 'object' || typeof (person as { label?: unknown }).label !== 'string' || !(person as { kind?: unknown }).kind || (person as { kind?: unknown }).kind !== 'person')) {
    return NextResponse.json({ error: '임원 데이터가 올바르지 않습니다.' }, { status: 400 })
  }

  const data = { executive, departments: body.departments }
  fs.writeFileSync(ORGANIZATION_FILE, JSON.stringify(data, null, 2), 'utf-8')
  appendAuditLog({ action: 'UPDATE', target: 'organization', detail: '조직도 수정', userId: user!.id, userName: user!.displayName })
  return NextResponse.json({ data })
}

export const dynamic = 'force-dynamic'
