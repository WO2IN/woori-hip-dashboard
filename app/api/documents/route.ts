import { NextRequest, NextResponse } from 'next/server'
import { readMetadata, updateMetadata } from '@/lib/storage'
import { normalizeLot, buildLotEnd } from '@/lib/lot'
import { getUserFromHeaders, canEdit } from '@/lib/auth'

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


  // =========================
  // 발행일 검색
  // =========================
  if (startDate || endDate) {
    docs = docs.filter(doc => {

      if (!doc.issueDate) return false

      const date = doc.issueDate.replace(/\./g, '-')

      if (startDate && date < startDate) {
        return false
      }

      if (endDate && date > endDate) {
        return false
      }

      return true
    })
  }


  // =========================
  // 업체
  // =========================
  if (companies.length > 0) {
    docs = docs.filter(doc =>
      companies.includes(doc.company)
    )
  }


  // =========================
  // 문서유형
  // =========================
  if (documentTypes.length > 0) {
    docs = docs.filter(doc =>
      documentTypes.includes(doc.documentType)
    )
  }


  // =========================
  // 품목
  // =========================
  if (products.length > 0) {
    docs = docs.filter(doc =>
      doc.product &&
      products.includes(doc.product)
    )
  }


  // =========================
  // 재질
  // =========================
  if (materials.length > 0) {
    docs = docs.filter(doc =>
      doc.material &&
      materials.includes(doc.material)
    )
  }


  // =========================
  // 도금사양
  // =========================
  if (specifications.length > 0) {
    docs = docs.filter(doc =>
      doc.specification &&
      specifications.includes(doc.specification)
    )
  }


  // =========================
  // LOT 번호 검색
  // =========================
  if (lotNumber) {

    const lot = lotNumber.toLowerCase()

    docs = docs.filter(doc => {

      const start =
        doc.lotStart?.toLowerCase() || ''

      const end =
        doc.lotEnd?.toLowerCase() || ''


      return (
        start.includes(lot) ||
        end.includes(lot)
      )
    })
  }


  // =========================
  // 통합 검색
  // =========================
  if (query) {

    const q = query.toLowerCase()


    docs = docs.filter(doc => {

      const fields = [
        doc.company,
        doc.documentType,
        doc.product,
        doc.material,
        doc.specification,
        doc.lotStart,
        doc.lotEnd,
        doc.filename,
        doc.originalName,
        doc.note,
      ]


      return fields.some(value =>
        value?.toLowerCase().includes(q)
      )
    })
  }



  // =========================
  // 발행일 최신순
  // =========================
  docs.sort((a,b)=>{

    const dateA = Number(String(a.issueDate || '').replace(/[^0-9]/g, '').slice(0, 8)) || 0
    const dateB = Number(String(b.issueDate || '').replace(/[^0-9]/g, '').slice(0, 8)) || 0


    return dateB - dateA

  })



  return NextResponse.json({
    data: docs,
    total: docs.length
  })

}




export async function PATCH(req: NextRequest) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canEdit(requestUser.role)) {
    return NextResponse.json({ error: '문서 수정 권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json()

  const { id, ...updates } = body

  Object.keys(updates).forEach(key => {
    if (typeof updates[key] === 'string') {
      updates[key] = updates[key].trim()
    }
  })


  if (!id) {

    return NextResponse.json(
      {
        error:'ID가 필요합니다.'
      },
      {
        status:400
      }
    )

  }



  if (updates.lotStart) {

    updates.lotStart =
      normalizeLot(updates.lotStart)

  }



  if (updates.lotEnd) {


    if(updates.lotEnd.includes('-')){

      updates.lotEnd =
        normalizeLot(updates.lotEnd)

    }
    else if(updates.lotStart){

      updates.lotEnd =
        buildLotEnd(
          updates.lotStart,
          updates.lotEnd
        )

    }

  }



  updates.updatedAt = new Date().toISOString()
  updates.updatedBy = requestUser.displayName
  updates.updatedById = requestUser.id

  const success =
    updateMetadata(id, updates)



  if(!success){

    return NextResponse.json(
      {
        error:'문서를 찾을 수 없습니다.'
      },
      {
        status:404
      }
    )

  }



  return NextResponse.json({
    success:true
  })

}
