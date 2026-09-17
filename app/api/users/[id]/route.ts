import { NextRequest, NextResponse } from 'next/server'
import { readUsers, writeUsers, hashPassword, getUserFromHeaders, canManageUsers } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canManageUsers(requestUser.role)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { displayName, role, password, floor } = body

  const users = readUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (displayName) users[idx].displayName = displayName
  if (role && ['viewer', 'editor', 'admin'].includes(role)) users[idx].role = role
  if (floor !== undefined && [1, 2, 3].includes(Number(floor))) users[idx].floor = Number(floor) as 1 | 2 | 3
  if (password) users[idx].passwordHash = await hashPassword(password)

  writeUsers(users)

  return NextResponse.json({
    success: true,
    user: {
      id: users[idx].id,
      username: users[idx].username,
      displayName: users[idx].displayName,
      role: users[idx].role,
      floor: users[idx].floor,
      createdAt: users[idx].createdAt,
    },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestUser = getUserFromHeaders(req.headers)
  if (!requestUser || !canManageUsers(requestUser.role)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

  // Prevent deleting yourself
  if (requestUser.id === id) {
    return NextResponse.json({ error: '자신의 계정은 삭제할 수 없습니다.' }, { status: 400 })
  }

  const users = readUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
  }

  users.splice(idx, 1)
  writeUsers(users)

  return NextResponse.json({ success: true })
}
