import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { deleteMetadata, getDocumentFilePath } from '@/lib/storage'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const removed = deleteMetadata(id)
  if (!removed) {
    return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  }
  // Delete the physical file
  const filePath = getDocumentFilePath(removed.storagePath)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
  return NextResponse.json({ success: true })
}
