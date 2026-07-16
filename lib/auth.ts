import fs from 'fs'
import path from 'path'
import { User, UserRole } from './types'

const USERS_FILE = path.join(process.cwd(), 'config', 'users.json')

// ─── User storage ────────────────────────────────────────────────────────────

export function readUsers(): User[] {
  if (!fs.existsSync(USERS_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')) as User[]
  } catch {
    return []
  }
}

export function writeUsers(users: User[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
}

// ─── Password hashing (SHA-256, no external deps) ───────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Authenticate ────────────────────────────────────────────────────────────

export async function authenticate(
  username: string,
  password: string
): Promise<User | null> {
  const users = readUsers()
  const user = users.find(u => u.username === username)
  if (!user) return null

  const hash = await hashPassword(password)
  if (hash !== user.passwordHash) return null

  return user
}

// ─── Permission helpers ──────────────────────────────────────────────────────

const ROLE_LEVEL: Record<UserRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
}

export function hasPermission(userRole: UserRole, required: UserRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[required]
}

export function canEdit(role: UserRole): boolean {
  return hasPermission(role, 'editor')
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, 'admin')
}

// ─── Session header extraction ───────────────────────────────────────────────

export function getUserFromHeaders(headers: Headers): {
  id: string
  displayName: string
  role: UserRole
} | null {
  const id = headers.get('x-user-id')
  const displayName = headers.get('x-user-name')
  const role = headers.get('x-user-role') as UserRole | null

  if (!id || !displayName || !role) return null
  if (!['viewer', 'editor', 'admin'].includes(role)) return null

  return { id, displayName, role }
}
