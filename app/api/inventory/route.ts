import { NextRequest, NextResponse } from 'next/server'
import { appendAuditLog, appendInventory, deleteInventory, readInventory, updateInventory } from '@/lib/storage'
import { canEdit, getUserFromHeaders } from '@/lib/auth'
import { normalizeIssueDate } from '@/lib/lot'

function parseIssueDate(value: unknown) {
  if (value == null || String(value).trim() === '') return ''
  try {
    return normalizeIssueDate(String(value))
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '입고일자가 올바르지 않습니다.')
  }
}

export async function GET() {
  return NextResponse.json({ data: readInventory() })
}

export async function DELETE(req: NextRequest) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canEdit(requestUser.role)) {
    return NextResponse.json({ error: '입고 삭제 권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await req.json().catch(() => ({}))
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: '삭제할 입고 ID가 필요합니다.' }, { status: 400 })
  }

  const removed = deleteInventory(id)
  if (!removed) {
    return NextResponse.json({ error: '입고 내역을 찾을 수 없습니다.' }, { status: 404 })
  }

  appendAuditLog({
    action: 'DELETE',
    target: 'inventory',
    detail: `입고 내역 삭제 (ID: ${id})`,
    userId: requestUser.id,
    userName: requestUser.displayName,
  })

  return NextResponse.json({ success: true, data: removed })
}

export async function PATCH(req: NextRequest) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canEdit(requestUser.role)) {
    return NextResponse.json({ error: '입고 수정 권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: '수정할 입고 ID가 필요합니다.' }, { status: 400 })
  }
  const quantity = Number(body.quantity)
  if (!Number.isFinite(quantity) || quantity < 0) {
    return NextResponse.json({ error: '수량은 0 이상이어야 합니다.' }, { status: 400 })
  }
  let issueDate: string | undefined
  try {
    issueDate = parseIssueDate(body.issueDate) || undefined
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '입고일자가 올바르지 않습니다.' }, { status: 400 })
  }
  const floor = body.floor == null ? undefined : Math.min(3, Math.max(1, Number(body.floor) || 1)) as 1 | 2 | 3
  const updated = updateInventory(body.id, {
    quantity,
    quantityUnit: body.quantityUnit || 'EA',
    ...(issueDate ? { issueDate } : {}),
    ...(body.company != null ? { company: String(body.company).trim() } : {}),
    ...(body.product != null ? { product: String(body.product).trim() } : {}),
    ...(floor != null ? { floor } : {}),
    ...(body.lotStart != null ? { lotStart: String(body.lotStart).trim() } : {}),
  })
  if (!updated) return NextResponse.json({ error: '입고 내역을 찾을 수 없습니다.' }, { status: 404 })

  appendAuditLog({
    action: 'UPDATE',
    target: 'inventory',
    detail: `입고 수량 수정 (ID: ${body.id})`,
    userId: requestUser.id,
    userName: requestUser.displayName,
  })
  return NextResponse.json({ success: true, data: updated })
}

export async function POST(req: NextRequest) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canEdit(requestUser.role)) {
    return NextResponse.json({ error: '입고 등록 권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.company || !body.product || !body.quantity || Number(body.quantity) <= 0) {
    return NextResponse.json({ error: '업체명, 품목, 수량은 필수입니다.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  let issueDate = now.slice(0, 10)
  try {
    issueDate = parseIssueDate(body.issueDate) || issueDate
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '입고일자가 올바르지 않습니다.' }, { status: 400 })
  }
  const record = {
    id: crypto.randomUUID(),
    company: String(body.company).trim(),
    product: String(body.product).trim(),
    floor: Math.min(3, Math.max(1, Number(body.floor) || 1)) as 1 | 2 | 3,
    quantity: Number(body.quantity),
    quantityUnit: body.quantityUnit || 'EA',
    issueDate,
    lotStart: body.lotStart || '',
    movementType: '입고' as const,
    storagePath: 'INVENTORY' as const,
    createdAt: now,
    createdBy: requestUser.displayName,
    createdById: requestUser.id,
  }

  appendInventory(record)
  appendAuditLog({
    action: 'CREATE',
    target: 'inventory',
    detail: `입고 내역 등록 (ID: ${record.id})`,
    userId: requestUser.id,
    userName: requestUser.displayName,
  })

  return NextResponse.json({ success: true, data: record })
}
