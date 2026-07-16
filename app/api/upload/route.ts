import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { appendMetadata, STORAGE_DIR } from '@/lib/storage'
import { DocumentMetadata } from '@/lib/types'
import { normalizeLot, buildLotEnd } from '@/lib/lot'
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
  const lotStart = normalizeLot(formData.get('lotStart') as string)
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
  const issueDate = (formData.get('issueDate') as string) || ''
  const note = (formData.get('note') as string) || ''

  if (!company || !documentType) {
    return NextResponse.json({ error: '업체명과 문서유형은 필수입니다.' }, { status: 400 })
  }

  // Normalize various date formats → yyyy-MM-dd
  function normalizeDate(raw: string): string {
    if (!raw) return format(new Date(), 'yyyy-MM-dd')
    // Already yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
    // yyyyMMdd
    if (/^\d{8}$/.test(raw)) return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`
    // yy.MM.dd or yy-MM-dd or yy/MM/dd
    const short = raw.match(/^(\d{2})[.\-\/](\d{2})[.\-\/](\d{2})$/)
    if (short) return `20${short[1]}-${short[2]}-${short[3]}`
    // yyyy.MM.dd or yyyy/MM/dd
    const long = raw.match(/^(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})$/)
    if (long) return `${long[1]}-${long[2]}-${long[3]}`
    // fallback: return as-is and let the year extraction handle it
    return raw
  }

  const effectiveDate = normalizeDate(issueDate)
  const dateStr = effectiveDate.replace(/-/g, '')
  const lotPart = lotStart
    ? (lotEnd ? `${lotStart}_${lotEnd}` : lotStart)
    : format(new Date(), 'HHmmss')
  const generatedName = `${dateStr}_${lotPart}.pdf`

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
    lotStart,
    lotEnd: lotEnd || undefined,
    product,
    material,
    specification: specification || undefined,
    quantity,
    issueDate: issueDate || effectiveDate,
    note: note || undefined,
    fileSize: file.size,
    year,
    storagePath: path.join(relDir, generatedName),
    createdAt: new Date().toISOString(),
    createdBy: requestUser.displayName,
    createdById: requestUser.id,
  }

  appendMetadata(doc)

  return NextResponse.json({ success: true, data: doc })
}
