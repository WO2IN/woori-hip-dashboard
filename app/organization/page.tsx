"use client"

import { useMemo, useState } from "react"
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react"

type Person = { label: string; kind: "person" | "group" | "floor" }
type Department = { name: string; color: "blue" | "orange"; people: Person[] }

const initialDepartments: Department[] = [
  { name: "관리부", color: "blue", people: [{ label: "김민수", kind: "person" }, { label: "이서연", kind: "person" }, { label: "경영지원", kind: "group" }] },
  { name: "생산부", color: "orange", people: [{ label: "박준혁", kind: "person" }, { label: "최유진", kind: "person" }, { label: "정우성", kind: "person" }, { label: "1층", kind: "floor" }] },
  { name: "품질부", color: "blue", people: [{ label: "한지민", kind: "person" }, { label: "강도윤", kind: "person" }, { label: "수입검사", kind: "group" }, { label: "연구/개발팀", kind: "group" }] },
  { name: "영업부", color: "orange", people: [{ label: "윤서준", kind: "person" }, { label: "김하늘", kind: "person" }] },
]

export default function OrganizationPage() {
  const [departments, setDepartments] = useState(initialDepartments)
  const [editMode, setEditMode] = useState(false)
  const [newMember, setNewMember] = useState<Record<number, string>>({})
  const [newGroup, setNewGroup] = useState<Record<number, string>>({})
  const [draggedItem, setDraggedItem] = useState<{ departmentIndex: number; personIndex: number } | null>(null)

  const memberCount = (department: Department) => department.people.filter(person => person.kind === "person").length
  const total = useMemo(() => departments.reduce((sum, department) => sum + memberCount(department), 0) + 3, [departments])

  const updateDepartmentName = (departmentIndex: number, name: string) => {
    setDepartments(current => current.map((department, index) => index === departmentIndex ? { ...department, name } : department))
  }

  const addItem = (departmentIndex: number, kind: Person["kind"]) => {
    const values = kind === "person" ? newMember : newGroup
    const label = values[departmentIndex]?.trim()
    if (!label) return
    setDepartments(current => current.map((department, index) => index !== departmentIndex ? department : { ...department, people: [...department.people, { label, kind }] }))
    if (kind === "person") setNewMember(current => ({ ...current, [departmentIndex]: "" }))
    else setNewGroup(current => ({ ...current, [departmentIndex]: "" }))
  }

  const updateItemLabel = (departmentIndex: number, personIndex: number, label: string) => {
    setDepartments(current => current.map((department, index) => index !== departmentIndex ? department : {
      ...department,
      people: department.people.map((person, itemIndex) => itemIndex === personIndex ? { ...person, label } : person),
    }))
  }

  const removeItem = (departmentIndex: number, personIndex: number) => {
    setDepartments(current => current.map((department, index) => index !== departmentIndex ? department : { ...department, people: department.people.filter((_, itemIndex) => itemIndex !== personIndex) }))
  }

  const moveItem = (targetDepartmentIndex: number, targetPersonIndex: number) => {
    if (!draggedItem) return
    setDepartments(current => {
      const next = current.map(department => ({ ...department, people: [...department.people] }))
      const [item] = next[draggedItem.departmentIndex].people.splice(draggedItem.personIndex, 1)
      next[targetDepartmentIndex].people.splice(targetPersonIndex, 0, item)
      return next
    })
    setDraggedItem(null)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#278e78]">PEOPLE & ORGANIZATION</p>
          <h2 className="text-2xl font-bold tracking-tight">조직 현황</h2>
          <p className="mt-1 text-sm text-slate-500">WOORI-HIP의 부서별 구성과 담당자를 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#e8faf5] px-3 py-1.5 text-xs font-semibold text-[#246455]">총원 {total}명</span>
          <button onClick={() => setEditMode(value => !value)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><Pencil className="size-3.5" />{editMode ? "편집 완료" : "조직도 수정"}</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-100 bg-[#f8fafc] p-4 sm:p-7">
        <div className="mx-auto min-w-[920px] max-w-[1180px]">
          <div className="mx-auto w-64 rounded-xl border border-[#9cb7e8] bg-[#eaf1ff] px-5 py-3 text-center shadow-sm"><p className="text-[11px] font-semibold tracking-[0.16em] text-[#5272a8]">EXECUTIVE</p><p className="mt-1 font-bold text-[#17243a]">회장 배준기</p><p className="mt-0.5 text-xs text-slate-500">대표이사 홍성호 · 상무이사 임종배</p></div>
          <div className="mx-auto h-8 w-px bg-[#9cb7e8]" />
          <div className="grid grid-cols-4 gap-4 border-t border-[#9cb7e8] pt-7">
            {departments.map((department, departmentIndex) => (
              <div key={departmentIndex} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-1 text-center text-xs font-medium text-slate-500">{memberCount(department)}명</p>
                {editMode ? <input aria-label={`${department.name} 부서명`} value={department.name} onChange={event => updateDepartmentName(departmentIndex, event.target.value)} className={`w-full rounded-lg border px-3 py-2 text-center font-bold outline-none focus:ring-2 focus:ring-violet-200 ${department.color === "blue" ? "border-[#b8cbed] bg-[#eaf1ff] text-[#2d5da8]" : "border-[#f0c5a8] bg-[#fff1e8] text-[#b85e27]"}`} /> : <div className={`rounded-lg px-3 py-2 text-center font-bold ${department.color === "blue" ? "bg-[#eaf1ff] text-[#2d5da8]" : "bg-[#fff1e8] text-[#b85e27]"}`}>{department.name}</div>}
                <div className="mt-3 flex flex-col gap-2">
                  {department.people.map((person, personIndex) => <div key={personIndex} draggable={editMode} onDragStart={() => setDraggedItem({ departmentIndex, personIndex })} onDragOver={event => event.preventDefault()} onDrop={() => moveItem(departmentIndex, personIndex)} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${person.kind === "person" ? "border-slate-100 bg-white text-slate-700" : person.kind === "group" ? "border-violet-200 bg-violet-50 text-violet-800" : "border-amber-200 bg-amber-50 text-amber-800"} ${editMode ? "cursor-grab active:cursor-grabbing" : ""}`}><span className="flex min-w-0 flex-1 items-center gap-1.5">{editMode && <GripVertical className="size-3.5 shrink-0 text-slate-400" />}{editMode ? <input aria-label={`${person.label} 이름`} value={person.label} onChange={event => updateItemLabel(departmentIndex, personIndex, event.target.value)} onMouseDown={event => event.stopPropagation()} className="min-w-0 flex-1 bg-transparent font-medium outline-none" /> : person.label}</span>{editMode && <button aria-label={`${person.label} 삭제`} onClick={() => removeItem(departmentIndex, personIndex)} className="ml-2 shrink-0 text-slate-400 hover:text-red-500"><Trash2 className="size-3.5" /></button>}</div>)}
                </div>
                {editMode && <div className="mt-3 space-y-2 border-t border-slate-100 pt-3"><div className="flex gap-2"><input value={newMember[departmentIndex] ?? ""} onChange={event => setNewMember(current => ({ ...current, [departmentIndex]: event.target.value }))} onKeyDown={event => { if (event.key === "Enter") addItem(departmentIndex, "person") }} placeholder="구성원 이름" className="min-w-0 flex-1 rounded-md border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-[#278e78]" /><button aria-label="구성원 추가" onClick={() => addItem(departmentIndex, "person")} className="rounded-md bg-[#278e78] px-2 text-white"><Plus className="size-4" /></button></div><div className="flex gap-2"><input value={newGroup[departmentIndex] ?? ""} onChange={event => setNewGroup(current => ({ ...current, [departmentIndex]: event.target.value }))} onKeyDown={event => { if (event.key === "Enter") addItem(departmentIndex, "group") }} placeholder="팀/조직 이름" className="min-w-0 flex-1 rounded-md border border-violet-200 px-2.5 py-2 text-xs outline-none focus:border-violet-400" /><button aria-label="팀/조직 추가" onClick={() => addItem(departmentIndex, "group")} className="rounded-md bg-violet-600 px-2 text-white"><Plus className="size-4" /></button></div></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
