import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { readUsers, writeUsers, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, displayName, password } = body

  if (!username || !displayName || !password) {
    return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 })
  }

  if (username.length < 3) {
    return NextResponse.json({ error: '아이디는 3자 이상이어야 합니다.' }, { status: 400 })
  }

  if (password.length < 4) {
    return NextResponse.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400 })
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
    role: 'viewer' as const,
    createdAt: new Date().toISOString(),
  }

  users.push(newUser)
  writeUsers(users)

  return NextResponse.json({
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      role: newUser.role,
    },
  })
}
