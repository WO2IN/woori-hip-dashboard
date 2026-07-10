import { NextRequest, NextResponse } from 'next/server'
import { readMetadata, updateMetadata } from '@/lib/storage'
import { normalizeLot, buildLotEnd } from '@/lib/lot'
import { SearchFilters } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const company = searchParams.get('company') || ''
  const documentType = searchParams.get('documentType') || ''
  const year = searchParams.get('year') || ''
  const product = searchParams.get('product') || ''
  const material = searchParams.get('material') || ''
  const specification = searchParams.get('specification') || ''
  const lotNumber = searchParams.get('lotNumber') || ''
  const query = searchParams.get('query') || ''

  let docs = readMetadata()

  if (company) docs = docs.filter(d => d.company === company)
  if (documentType) docs = docs.filter(d => d.documentType === documentType)
  if (year) docs = docs.filter(d => d.year === year)
  if (product) docs = docs.filter(d => d.product === product)
  if (material) docs = docs.filter(d => d.material === material)
  if (specification) docs = docs.filter(d => d.specification === specification)
  if (lotNumber) {
    docs = docs.filter(d =>
      d.lotStart?.includes(lotNumber) || d.lotEnd?.includes(lotNumber)
    )
  }
  if (query) {
    const q = query.toLowerCase()
    docs = docs.filter(d =>
      d.company.toLowerCase().includes(q) ||
      d.documentType.toLowerCase().includes(q) ||
      d.product.toLowerCase().includes(q) ||
      d.lotStart?.toLowerCase().includes(q) ||
      d.filename.toLowerCase().includes(q)
    )
  }

  // Sort by createdAt desc
  docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json({ data: docs, total: docs.length })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
  }

  updates.lotStart = normalizeLot(updates.lotStart)

  if (updates.lotEnd) {
    if (updates.lotEnd.includes('-')) {
      updates.lotEnd = normalizeLot(updates.lotEnd)
    } else if (updates.lotStart) {
      updates.lotEnd = buildLotEnd(updates.lotStart, updates.lotEnd)
    }
  }

  const success = updateMetadata(id, updates)

  if (!success) {
    return NextResponse.json(
      { error: '문서를 찾을 수 없습니다.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}