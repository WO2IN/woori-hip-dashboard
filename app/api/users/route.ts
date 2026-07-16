import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { readUsers, writeUsers, hashPassword, getUserFromHeaders } from '@/lib/auth'
import { canManageUsers } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canManageUsers(requestUser.role)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const users = readUsers().map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    createdAt: u.createdAt,
  }))

  return NextResponse.json({ data: users })
}

export async function POST(req: NextRequest) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canManageUsers(requestUser.role)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json()
  const { username, displayName, password, role } = body

  if (!username || !displayName || !password || !role) {
    return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 })
  }

  if (!['viewer', 'editor', 'admin'].includes(role)) {
    return NextResponse.json({ error: '유효하지 않은 권한입니다.' }, { status: 400 })
  }

  const users = readUsers()
  if (users.find(u => u.username === username)) {
    return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const newUser = {
    id: uuidv4(),
    username,
    displayName,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  }

  users.push(newUser)
  writeUsers(users)

  return NextResponse.json({
    success: true,
    user: { id: newUser.id, username, displayName, role, createdAt: newUser.createdAt },
  })
}
