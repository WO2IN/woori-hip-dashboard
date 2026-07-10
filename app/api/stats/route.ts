import { NextResponse } from 'next/server'
import { readMetadata, readConfig } from '@/lib/storage'

export async function GET() {
  const docs = readMetadata()
  const companies = readConfig('companies')
  const documentTypes = readConfig('document-types')

  const today = new Date().toISOString().split('T')[0]
  const todayCount = docs.filter(d => d.createdAt.startsWith(today)).length

  const recent = [...docs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)

  return NextResponse.json({
    totalDocuments: docs.length,
    todayUploads: todayCount,
    companyCount: companies.length,
    documentTypeCount: documentTypes.length,
    recentDocuments: recent,
  })
}
