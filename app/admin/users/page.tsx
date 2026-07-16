'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Edit, ShieldCheck, Eye, Pencil,
  RefreshCw, UserRound
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/auth-context'
import { getSession, buildAuthHeaders } from '@/lib/auth-client'
import { UserRole } from '@/lib/types'

interface UserRow {
  id: string
  username: string
  displayName: string
  role: UserRole
  createdAt: string
}

const ROLE_LABEL: Record<UserRole, string> = {
  viewer: '뷰어',
  editor: '편집자',
  admin: '관리자',
}

const ROLE_COLOR: Record<UserRole, string> = {
  viewer: 'bg-muted text-muted-foreground',
  editor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  admin: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

const ROLE_ICON: Record<UserRole, React.ReactNode> = {
  viewer: <Eye className="w-3 h-3" />,
  editor: <Pencil className="w-3 h-3" />,
  admin: <ShieldCheck className="w-3 h-3" />,
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[role]}`}>
      {ROLE_ICON[role]}
      {ROLE_LABEL[role]}
    </span>
  )
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ username: '', displayName: '', password: '', role: 'viewer' as UserRole })
  const [creating, setCreating] = useState(false)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState({ displayName: '', role: 'viewer' as UserRole, password: '' })
  const [editing, setEditing] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const authHeaders = useCallback(() => {
    const session = getSession()
    return session ? buildAuthHeaders(session) : {}
  }, [])

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/')
    }
  }, [user, router])

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { headers: authHeaders(), cache: 'no-store' })
      if (!res.ok) {
        toast.error('사용자 목록을 불러올 수 없습니다.')
        return
      }
      const data = await res.json()
      setUsers(data.data || [])
    } catch {
      toast.error('서버와 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadUsers()
    setRefreshing(false)
  }

  const handleCreate = async () => {
    if (!createForm.username || !createForm.displayName || !createForm.password) {
      toast.error('모든 필드를 입력해주세요.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('사용자가 추가되었습니다.')
      setUsers(prev => [...prev, data.user])
      setCreateOpen(false)
      setCreateForm({ username: '', displayName: '', password: '', role: 'viewer' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '추가에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!editTarget) return
    setEditing(true)
    try {
      const body: Record<string, string> = {}
      if (editForm.displayName) body.displayName = editForm.displayName
      if (editForm.role) body.role = editForm.role
      if (editForm.password) body.password = editForm.password

      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('사용자 정보가 수정되었습니다.')
      setUsers(prev => prev.map(u => u.id === editTarget.id ? { ...u, ...data.user } : u))
      setEditTarget(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('사용자가 삭제되었습니다.')
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  if (user && user.role !== 'admin') return null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">사용자 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            계정을 추가하거나 권한을 변경합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            사용자 추가
          </Button>
        </div>
      </div>

      {/* User list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <UserRound className="w-10 h-10 opacity-30" />
            <p className="text-sm">등록된 사용자가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 bg-muted/40">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">아이디 / 이름</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">권한</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">등록일</span>
              <span className="w-16" />
            </div>
            {users.map(u => (
              <div key={u.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-muted/20 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.displayName}</p>
                  <p className="text-xs text-muted-foreground">{u.username}</p>
                </div>
                <div>
                  <RoleBadge role={u.role} />
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '-'}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditTarget(u)
                      setEditForm({ displayName: u.displayName, role: u.role, password: '' })
                    }}
                    title="수정"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(u)}
                    disabled={u.id === user?.id}
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>사용자 추가</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="new-username">아이디</Label>
              <Input
                id="new-username"
                value={createForm.username}
                onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))}
                placeholder="로그인에 사용할 아이디"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-display">이름</Label>
              <Input
                id="new-display"
                value={createForm.displayName}
                onChange={e => setCreateForm(p => ({ ...p, displayName: e.target.value }))}
                placeholder="표시 이름 (예: 홍길동)"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                value={createForm.password}
                onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                placeholder="초기 비밀번호"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>권한</Label>
              <Select
                value={createForm.role}
                onValueChange={v => setCreateForm(p => ({ ...p, role: v as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">뷰어 — 조회 및 다운로드만 가능</SelectItem>
                  <SelectItem value="editor">편집자 — 등록, 수정, 삭제 가능</SelectItem>
                  <SelectItem value="admin">관리자 — 전체 권한</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? '추가 중...' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editTarget} onOpenChange={v => !v && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>사용자 수정 — {editTarget?.username}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-display">이름</Label>
              <Input
                id="edit-display"
                value={editForm.displayName}
                onChange={e => setEditForm(p => ({ ...p, displayName: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>권한</Label>
              <Select
                value={editForm.role}
                onValueChange={v => setEditForm(p => ({ ...p, role: v as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">뷰어</SelectItem>
                  <SelectItem value="editor">편집자</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-pw">새 비밀번호 (변경 시에만 입력)</Label>
              <Input
                id="edit-pw"
                type="password"
                value={editForm.password}
                onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                placeholder="변경하지 않으면 비워두세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>취소</Button>
            <Button onClick={handleEdit} disabled={editing}>
              {editing ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.displayName}</strong> ({deleteTarget?.username}) 계정을 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
