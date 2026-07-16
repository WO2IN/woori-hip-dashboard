import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import {
  deleteMetadata,
  getDocumentFilePath,
  readMetadata,
  readConfig,
  writeConfig,
} from '@/lib/storage'
import { getUserFromHeaders, canEdit } from '@/lib/auth'

const CONFIG_FIELDS = {
  companies: 'company',
  'document-types': 'documentType',
  materials: 'material',
  specifications: 'specification',
  products: 'product',
} as const


function cleanupUnusedConfigValues() {
  const documents = readMetadata()

  Object.entries(CONFIG_FIELDS).forEach(([configName, field]) => {
    const configValues = readConfig(configName)

    const usedValues = new Set(
      documents
        .map(doc => doc[field])
        .filter(
          (value): value is string =>
            typeof value === 'string' &&
            value.trim().length > 0
        )
    )

    const filtered = configValues.filter(value =>
      usedValues.has(value)
    )

    if (filtered.length !== configValues.length) {
      writeConfig(configName, filtered)
    }
  })
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canEdit(requestUser.role)) {
    return NextResponse.json({ error: '문서 삭제 권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

  const removed = deleteMetadata(id)

  if (!removed) {
    return NextResponse.json(
      { error: '문서를 찾을 수 없습니다.' },
      { status: 404 }
    )
  }

  // Delete the physical file
  const filePath = getDocumentFilePath(removed.storagePath)

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  // 사용하지 않는 설정값 자동 제거
  cleanupUnusedConfigValues()

  return NextResponse.json({
    success: true,
  })
}
