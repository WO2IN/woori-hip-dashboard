import { NextRequest, NextResponse } from 'next/server'
import { readMetadata, updateMetadata } from '@/lib/storage'
import { normalizeLot, buildLotEnd } from '@/lib/lot'
import { SearchFilters } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companies = searchParams.getAll('company')
  const documentTypes = searchParams.getAll('documentType')
  const products = searchParams.getAll('product')
  const materials = searchParams.getAll('material')
  const specifications = searchParams.getAll('specification')
  
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const lotNumber = searchParams.get('lotNumber') || ''
  const query = searchParams.get('query') || ''

  let docs = readMetadata()

  if (companies.length > 0) {
    docs = docs.filter(d => d.company && companies.includes(d.company))
  }
  
  if (documentTypes.length > 0) {
    docs = docs.filter(d =>
      d.documentType && documentTypes.includes(d.documentType)
    )
  }
  
  if (products.length > 0) {
    docs = docs.filter(d =>
      d.product && products.includes(d.product)
    )
  }
  
  if (materials.length > 0) {
    docs = docs.filter(d =>
      d.material && materials.includes(d.material)
    )
  }
  
  if (specifications.length > 0) {
    docs = docs.filter(d =>
      d.specification && specifications.includes(d.specification)
    )
  }

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