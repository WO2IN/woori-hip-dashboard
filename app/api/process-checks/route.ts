import { NextRequest, NextResponse } from 'next/server'
import { appendAuditLog, appendProcessCheck, deleteProcessCheck, readProcessChecks, updateProcessCheck } from '@/lib/storage'
import { canEdit, getUserFromHeaders } from '@/lib/auth'
import {
  PROCESS_CHECK_COMPANY,
  PROCESS_CHECK_FIELDS,
  PROCESS_CHECK_PRODUCT,
  ProcessAnswer,
  ProcessCheckRecord,
} from '@/lib/process-checklist'

export async function GET() {
  return NextResponse.json({ data: readProcessChecks() })
}

export async function DELETE(req: NextRequest) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canEdit(requestUser.role)) {
    return NextResponse.json({ error: '공정 점검 삭제 권한이 없습니다.' }, { status: 403 })
  }
  const { id } = await req.json().catch(() => ({}))
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: '삭제할 기록 ID가 필요합니다.' }, { status: 400 })
  }
  const removed = deleteProcessCheck(id)
  if (!removed) return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 })
  appendAuditLog({
    action: 'DELETE',
    target: 'process-check',
    detail: `공정 점검 삭제 (ID: ${id})`,
    userId: requestUser.id,
    userName: requestUser.displayName,
  })
  return NextResponse.json({ success: true, data: removed })
}

function parseAnswers(incoming: unknown): Record<string, ProcessAnswer> {
  const answers: Record<string, ProcessAnswer> = {}
  const source = incoming && typeof incoming === 'object' ? incoming as Record<string, unknown> : {}
  for (const field of PROCESS_CHECK_FIELDS) {
    const raw = source[field.id]
    if (raw === '' || raw == null) {
      answers[field.id] = ''
      continue
    }
    if (field.type === 'yesno') {
      answers[field.id] = raw === 'yes' || raw === 'no' ? raw : ''
      continue
    }
    const quantity = Number(raw)
    answers[field.id] = Number.isFinite(quantity) ? quantity : ''
  }
  return answers
}

function parseHeader(body: Record<string, unknown>) {
  const author = String(body.author || '').trim()
  const writtenDate = String(body.writtenDate || '').trim()
  const writtenTime = String(body.writtenTime || '').trim()
  if (!author || !writtenDate || !writtenTime) {
    return { error: '작성일자, 시간, 작성자는 필수입니다.' as const }
  }
  return { author, writtenDate, writtenTime }
}

export async function POST(req: NextRequest) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canEdit(requestUser.role)) {
    return NextResponse.json({ error: '공정 점검 등록 권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const header = parseHeader(body)
  if ('error' in header) {
    return NextResponse.json({ error: header.error }, { status: 400 })
  }

  const now = new Date().toISOString()
  const record: ProcessCheckRecord = {
    id: crypto.randomUUID(),
    company: PROCESS_CHECK_COMPANY,
    product: PROCESS_CHECK_PRODUCT,
    writtenDate: header.writtenDate,
    writtenTime: header.writtenTime,
    author: header.author,
    answers: parseAnswers(body.answers),
    createdAt: now,
    createdBy: requestUser.displayName,
    createdById: requestUser.id,
  }

  appendProcessCheck(record)
  appendAuditLog({
    action: 'CREATE',
    target: 'process-check',
    detail: `공정 점검 등록 (${PROCESS_CHECK_COMPANY} / ${PROCESS_CHECK_PRODUCT})`,
    userId: requestUser.id,
    userName: requestUser.displayName,
  })
  return NextResponse.json({ success: true, data: record })
}

export async function PATCH(req: NextRequest) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canEdit(requestUser.role)) {
    return NextResponse.json({ error: '공정 점검 수정 권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: '수정할 기록 ID가 필요합니다.' }, { status: 400 })
  }
  const header = parseHeader(body)
  if ('error' in header) {
    return NextResponse.json({ error: header.error }, { status: 400 })
  }

  const updated = updateProcessCheck(body.id, {
    writtenDate: header.writtenDate,
    writtenTime: header.writtenTime,
    author: header.author,
    answers: parseAnswers(body.answers),
    updatedAt: new Date().toISOString(),
    updatedBy: requestUser.displayName,
    updatedById: requestUser.id,
  })
  if (!updated) return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 })

  appendAuditLog({
    action: 'UPDATE',
    target: 'process-check',
    detail: `공정 점검 수정 (ID: ${body.id})`,
    userId: requestUser.id,
    userName: requestUser.displayName,
  })
  return NextResponse.json({ success: true, data: updated })
}

