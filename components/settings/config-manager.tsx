'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { notifyDataChanged } from '@/lib/data-events'
import { cn } from '@/lib/utils'

interface ConfigManagerProps {
  configName: string
  label: string
  placeholder?: string
}

export function ConfigManager({ configName, label, placeholder }: ConfigManagerProps) {
  const [items, setItems] = useState<string[]>([])
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deletingItem, setDeletingItem] = useState<string | null>(null)

  const loadItems = async () => {
    setLoading(true)
    const res = await fetch(`/api/config?name=${configName}`)
    const data = await res.json()
    setItems(data.data || [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [configName])

  const handleAdd = async () => {
    const trimmed = newItem.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: configName, value: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.data)
      setNewItem('')
      notifyDataChanged('config')
      toast.success(`"${trimmed}"이(가) 추가되었습니다.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '추가에 실패했습니다.'
      toast.error(msg)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (value: string) => {
    setDeletingItem(value)
  
    try {
      let res = await fetch('/api/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: configName,
          value,
        }),
      })
  
      let data = await res.json()
  
      if (res.status === 409 && data.used === true) {
        const confirmDelete = window.confirm(
          '등록된 문서에서 사용 중인 항목입니다.\n그래도 삭제하시겠습니까?'
        )
  
        if (!confirmDelete) {
          return
        }
  
        res = await fetch('/api/config', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: configName,
            value,
            force: true,
          }),
        })
  
        data = await res.json()
      }
  
      if (!res.ok) {
        throw new Error(data.error)
      }
  
      setItems(data.data)
      notifyDataChanged('config')
      toast.success(`"${value}"이(가) 삭제되었습니다.`)
  
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : '삭제에 실패했습니다.'
  
      toast.error(msg)
  
    } finally {
      setDeletingItem(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {label} 목록을 관리합니다.
        <span className="ml-2 font-medium text-foreground">{items.length}개</span>
      </div>

      {/* Current list */}
      <div className="border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            등록된 항목이 없습니다.
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="divide-y divide-border">
              {items.map(item => (
                <div
                  key={item}
                  className={cn(
                    'flex items-center justify-between px-4 py-2.5 group hover:bg-muted/30 transition-colors',
                    deletingItem === item && 'opacity-50'
                  )}
                >
                  <span className="text-sm text-foreground">{item}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(item)}
                    disabled={deletingItem === item}
                  >
                    {deletingItem === item
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAdd()
          }}
          placeholder={placeholder || `새 ${label} 입력`}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={adding || !newItem.trim()} size="icon">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
