import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { appendMetadata, appendAuditLog, STORAGE_DIR } from '@/lib/storage'
import { DocumentMetadata } from '@/lib/types'
import { normalizeLot, normalizeRegisteredLot, buildLotEnd, normalizeIssueDate } from '@/lib/lot'
import { format } from 'date-fns'
import { getUserFromHeaders, canEdit } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canEdit(requestUser.role)) {
    return NextResponse.json({ error: '문서 등록 권한이 없습니다.' }, { status: 403 })
  }
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'PDF 파일만 업로드 가능합니다.' }, { status: 400 })
  }
  const MAX_SIZE = 50 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '파일 크기는 50MB를 초과할 수 없습니다.' }, { status: 400 })
  }

  const company = (formData.get('company') as string)?.trim()
  const documentType = (formData.get('documentType') as string)?.trim()
  const shipmentCategoryRaw = (formData.get('shipmentCategory') as string)?.trim()
  const shipmentFloorRaw = (formData.get('shipmentFloor') as string)?.trim()
  const userFloor = requestUser.floor
  // 사용자에게 층이 지정되어 있으면 클라이언트가 보낸 값보다 서버의 로그인 정보를 우선합니다.
  const effectiveFloor = userFloor ?? (
    ['1', '2', '3'].includes(shipmentFloorRaw)
      ? Number(shipmentFloorRaw) as 1 | 2 | 3
      : undefined
  )
  const shipmentFloor = effectiveFloor
  const shipmentCategory = effectiveFloor === 1
    ? '판재'
    : effectiveFloor === 2
      ? '커넥터'
      : effectiveFloor === 3
        ? '랙'
        : ['판재', '커넥터', '랙'].includes(shipmentCategoryRaw)
          ? shipmentCategoryRaw as DocumentMetadata['shipmentCategory']
          : undefined
  const lotStart = normalizeRegisteredLot(normalizeLot(formData.get('lotStart') as string))
  const lotEndRaw = normalizeLot(formData.get('lotEnd') as string)
  const lotEnd = lotEndRaw.includes('-')
    ? lotEndRaw
    : lotStart && lotEndRaw
      ? buildLotEnd(lotStart, lotEndRaw)
      : lotEndRaw
  const product = (formData.get('product') as string) || ''
  const material = (formData.get('material') as string) || ''
  const specification = (formData.get('specification') as string) || ''
  const quantity = formData.get('quantity') ? Number(formData.get('quantity')) : undefined
  const quantityUnitRaw = (formData.get('quantityUnit') as string)?.trim()
  const quantityUnit = ['Kg', 'EA', 'R'].includes(quantityUnitRaw)
    ? quantityUnitRaw as DocumentMetadata['quantityUnit']
    : undefined
  const issueDate = (formData.get('issueDate') as string) || ''
  const note = (formData.get('note') as string) || ''

  if (!company || !documentType) {
    return NextResponse.json({ error: '업체명과 문서유형은 필수입니다.' }, { status: 400 })
  }

  // 저장 전 서버에서도 발행일 형식과 실제 날짜를 검증합니다.
  let effectiveDate: string
  try {
    effectiveDate = issueDate === '-'
      ? format(new Date(), 'yyyy-MM-dd')
      : normalizeIssueDate(issueDate) || format(new Date(), 'yyyy-MM-dd')
  } catch {
    // 잘못된 발행일도 문서 등록은 허용하고, 표시값은 미지정(-)으로 저장합니다.
    effectiveDate = format(new Date(), 'yyyy-MM-dd')
  }
  const dateStr = effectiveDate.replace(/-/g, '')
  const lotPart = lotStart
  ? (lotEnd ? `${lotStart}_${lotEnd}` : lotStart)
  : format(new Date(), 'HHmmss')

  // 파일명에 사용할 제품명 정리
  const safeProduct = product
    ? product.replace(/[<>:"/\\|?*]/g, '_').trim()
    : '미지정'

  // 날짜 + 제품명 + LOT + UUID로 파일명 생성
  const generatedName =
    `${dateStr}_${safeProduct}_${lotPart}_${uuidv4()}.pdf`

  // Build storage path: /company/documentType/year/filename
  const year = effectiveDate.split('-')[0]
  const relDir = path.join(company, documentType, year)
  const absDir = path.join(STORAGE_DIR, relDir)
  fs.mkdirSync(absDir, { recursive: true })

  const absPath = path.join(absDir, generatedName)
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(absPath, buffer)

  const doc: DocumentMetadata = {
    id: uuidv4(),
    filename: generatedName,
    originalName: file.name,
    company,
    documentType,
    shipmentCategory,
    shipmentFloor,
    floor: shipmentFloor,
    lotStart,
    lotEnd: lotEnd || undefined,
    product,
    material,
    specification: specification || undefined,
    quantity,
    quantityUnit,
    issueDate: issueDate === '-' ? '-' : effectiveDate,
    note: note || undefined,
    fileSize: file.size,
    year,
    storagePath: path.join(relDir, generatedName),
    createdAt: new Date().toISOString(),
    createdBy: requestUser.displayName,
    createdById: requestUser.id,
  }

  appendMetadata(doc)
  appendAuditLog({
    action: 'UPLOAD',
    target: 'document',
    detail: `${doc.originalName} (${doc.company}/${doc.documentType})`,
    userId: requestUser.id,
    userName: requestUser.displayName,
  })

  return NextResponse.json({ success: true, data: doc })
}
