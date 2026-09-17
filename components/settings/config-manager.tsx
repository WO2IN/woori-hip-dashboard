'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { notifyDataChanged } from '@/lib/data-events'
import { getSession, buildAuthHeaders } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

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

interface ConfigManagerProps {
  configName: string
  label: string
  placeholder?: string
}

export function ConfigManager({
  configName,
  label,
  placeholder
}: ConfigManagerProps) {

  const [items, setItems] = useState<string[]>([])
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const [deletingItem, setDeletingItem] = useState<string | null>(null)

  // 강제 삭제 확인 대상
  const [forceDeleteTarget, setForceDeleteTarget] = useState<string | null>(null)

  const loadItems = async () => {
    setLoading(true)

    const res = await fetch(`/api/config?name=${configName}`)
    const data = await res.json()

    setItems(data.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
  }, [configName])

  const handleAdd = async () => {
    const trimmed = newItem.trim()
    if (!trimmed) return
    setAdding(true)

    try {

      const res = await fetch('/api/config', {
        method: 'POST',
headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(getSession()!),
      },
        body:JSON.stringify({
          name:configName,
          value:trimmed
        })
      })

      const data = await res.json()

      if(!res.ok)
        throw new Error(data.error)

      setItems(data.data)
      setNewItem('')
      notifyDataChanged('config')

      toast.success(`"${trimmed}"이(가) 추가되었습니다.`)

    } catch(err:unknown){

      toast.error(
        err instanceof Error
          ? err.message
          : '추가에 실패했습니다.'
      )
    } finally {
      setAdding(false)
    }
  }

  // 일반 삭제 요청
  const handleDelete = async(value:string)=>{

    setDeletingItem(value)

    try{
      const res = await fetch('/api/config',{
        method:'DELETE',
headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(getSession()!),
      },
        body:JSON.stringify({
          name:configName,
          value
        })
      })

      const data = await res.json()

      // 사용중이면 팝업 표시
      if(res.status === 409 && data.used === true){

        setForceDeleteTarget(value)
        return

      }
      if(!res.ok)
        throw new Error(data.error)
      setItems(data.data)
      notifyDataChanged('config')
      toast.success(
        `"${value}"이(가) 삭제되었습니다.`
      )

    }catch(err:unknown){
      toast.error(
        err instanceof Error
        ? err.message
        : '삭제에 실패했습니다.'
      )

    }finally{
      setDeletingItem(null)
    }
  }

  // 강제 삭제
  const handleForceDelete = async()=>{

    if(!forceDeleteTarget)
      return
    const value = forceDeleteTarget
    setDeletingItem(value)

    try{
      const res = await fetch('/api/config',{
        method:'DELETE',
headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(getSession()!),
      },
        body:JSON.stringify({
          name:configName,
          value,
          force:true
        })
      })
      const data = await res.json()
      if(!res.ok)
        throw new Error(data.error)
      setItems(data.data)
      notifyDataChanged('config')
      toast.success(
        `"${value}"이(가) 삭제되었습니다.`
      )
    }catch(err:unknown){

      toast.error(
        err instanceof Error
        ? err.message
        : '삭제에 실패했습니다.'
      )
    }finally{
      setDeletingItem(null)
      setForceDeleteTarget(null)
    }
  }
  return (
    <>
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {label} 목록을 관리합니다.
        <span className="ml-2 font-medium text-foreground">
          {items.length}개
        </span>
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
      {
        loading ? (

          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            등록된 항목이 없습니다.
          </div>

        ) : (
          <ScrollArea className="h-64">
            <div className="divide-y divide-border">
            {
              items.map(item=>(
                <div
                  key={item}
                  className={cn(
                    'flex items-center justify-between px-4 py-2.5 group hover:bg-muted/30 transition-colors',
                    deletingItem===item && 'opacity-50'
                  )}
                >
                  <span className="text-sm">
                    {item}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="
                    w-7 h-7
                    opacity-0
                    group-hover:opacity-100
                    text-destructive
                    hover:text-destructive
                    hover:bg-destructive/10
                    "
                    onClick={()=>handleDelete(item)}
                    disabled={deletingItem===item}
                  >
                    {
                      deletingItem===item
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                      : <Trash2 className="w-3.5 h-3.5"/>
                    }
                  </Button>
                </div>
              ))
            }
            </div>
          </ScrollArea>
        )
      }
      </div>
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={e=>setNewItem(e.target.value)}
          onKeyDown={e=>{
            if(
              e.key==='Enter' &&
              !e.nativeEvent.isComposing
            )
              handleAdd()
          }}
          placeholder={
            placeholder || `새 ${label} 입력`
          }
          className="flex-1"
        />
        <Button
          onClick={handleAdd}
          disabled={
            adding ||
            !newItem.trim()
          }
          size="icon"
        >
          {
            adding
            ? <Loader2 className="w-4 h-4 animate-spin"/>
            : <Plus className="w-4 h-4"/>
          }
        </Button>
      </div>
    </div>
    {/* 강제 삭제 확인 팝업 */}
    <AlertDialog
      open={!!forceDeleteTarget}
      onOpenChange={(open)=>{

        if(!open)
          setForceDeleteTarget(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            사용 중인 항목 삭제
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>
              {forceDeleteTarget}
            </strong>
            은(는) 등록된 문서에서 사용 중입니다.
            <br/>
            그래도 삭제하시겠습니까?
            <br/>
            삭제 후에는 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleForceDelete}
            className="
            bg-destructive
            text-white
            hover:bg-destructive/90
            "
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
