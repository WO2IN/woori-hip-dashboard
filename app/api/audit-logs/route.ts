import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeaders } from '@/lib/auth'
import { readAuditLogs } from '@/lib/storage'

export async function GET(request: NextRequest) {
  const user = getUserFromHeaders(request.headers)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 200, 500)
  return NextResponse.json({ data: readAuditLogs().slice(0, limit) })
}

export const dynamic = 'force-dynamic'
