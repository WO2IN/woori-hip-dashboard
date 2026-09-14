'use client'

import { useState } from 'react'
import {
  Check,
  ChevronDown,
  Download,
  FileCheck,
  Plus,
  Printer,
  RotateCcw,
  Settings2,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

type InspectionRow = { id: number; item: string; standard: string; value: string; result: string }
type ThicknessRow = { id: number; point: string; value: string; result: string }

const initialVisualRows: InspectionRow[] = [
  { id: 1, item: '전폭', standard: '규격 입력', value: '', result: 'OK' },
  { id: 2, item: '외관', standard: '흠집 / 이물 없음', value: '', result: 'OK' },
  { id: 3, item: '변색', standard: '변색 없음', value: '', result: 'OK' },
]
const initialThicknessRows: ThicknessRow[] = [
  { id: 1, point: '1차', value: '', result: 'OK' },
  { id: 2, point: '2차', value: '', result: 'OK' },
  { id: 3, point: '3차', value: '', result: 'OK' },
]

function SectionTitle({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border pb-4">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{number}</span>
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2"><Label className="text-xs font-medium text-muted-foreground">{label}{required && <span className="ml-1 text-destructive">*</span>}</Label>{children}</div>
}

export default function ReportWritingPage() {
  const { user, loading } = useAuth()
  const [platingType, setPlatingType] = useState('Ni')
  const [customer, setCustomer] = useState('')
  const [product, setProduct] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [specification, setSpecification] = useState('')
  const [lotSize, setLotSize] = useState('')
  const [inspectionDate, setInspectionDate] = useState('')
  const [visualRows, setVisualRows] = useState(initialVisualRows)
  const [thicknessRows, setThicknessRows] = useState(initialThicknessRows)

  if (loading) return null
  if (user?.role === 'viewer') {
    return <div className="flex h-[70vh] items-center justify-center p-6"><div className="text-center"><FileCheck className="mx-auto mb-4 size-12 text-destructive" /><h1 className="text-2xl font-bold">권한이 없습니다.</h1><p className="mt-2 text-muted-foreground">성적서 작성은 편집자 및 관리자만 사용할 수 있습니다.</p></div></div>
  }

  const updateVisual = (id: number, key: keyof InspectionRow, value: string) => setVisualRows(rows => rows.map(row => row.id === id ? { ...row, [key]: value } : row))
  const updateThickness = (id: number, key: keyof ThicknessRow, value: string) => setThicknessRows(rows => rows.map(row => row.id === id ? { ...row, [key]: value } : row))
  const reset = () => { setCustomer(''); setProduct(''); setLotNumber(''); setIssueDate(''); setSpecification(''); setLotSize(''); setInspectionDate(''); setVisualRows(initialVisualRows); setThicknessRows(initialThicknessRows); toast.success('입력 내용을 초기화했습니다.') }
  const save = () => { if (!customer || !product || !lotNumber) { toast.error('고객명, 품명, 로트번호를 입력해주세요.'); return } toast.success('성적서 초안이 저장되었습니다.') }
  const printReport = () => window.print()

  return (
    <main className="report-page min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileCheck className="size-5" /></div>
            <div><p className="text-sm font-medium text-primary">QUALITY ASSURANCE</p><h1 className="text-2xl font-bold tracking-tight text-foreground">성적서 작성</h1><p className="mt-1 text-sm text-muted-foreground">검사 정보를 입력해 품질보증 성적서를 작성하세요.</p></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={reset}><RotateCcw data-icon="inline-start" />초기화</Button><Button variant="outline" onClick={printReport}><Printer data-icon="inline-start" />인쇄</Button><Button variant="outline" onClick={printReport}><Download data-icon="inline-start" />PDF 다운로드</Button><Button onClick={save}><Check data-icon="inline-start" />성적서 저장</Button></div>
        </div>

        <Tabs defaultValue="write" className="gap-5">
          <TabsList><TabsTrigger value="write">성적서 작성</TabsTrigger><TabsTrigger value="saved">저장된 성적서</TabsTrigger></TabsList>
          <TabsContent value="write" className="flex flex-col gap-5">
            <Card><CardHeader><SectionTitle number="01" title="기본 정보" description="성적서 상단에 표시될 제품 및 검사 정보를 입력합니다." /></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="고객명" required><Input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="고객명을 입력하세요" /></Field>
              <Field label="품명" required><Input value={product} onChange={e => setProduct(e.target.value)} placeholder="품명을 입력하세요" /></Field>
              <Field label="로트번호" required><Input value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="예: 20260910-01" /></Field>
              <Field label="발행일자"><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></Field>
              <Field label="규격"><Input value={specification} onChange={e => setSpecification(e.target.value)} placeholder="제품 규격" /></Field>
              <Field label="LOT SIZE (수량)"><Input value={lotSize} onChange={e => setLotSize(e.target.value)} placeholder="예: 343.8 Kg" /></Field>
              <Field label="검사일자"><Input type="date" value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} /></Field>
            </CardContent></Card>

            <Card><CardHeader><SectionTitle number="02" title="외관검사" description="검사 항목과 기준을 자유롭게 수정하고 측정값을 입력합니다." /></CardHeader><CardContent className="flex flex-col gap-4"><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted/60"><tr><th className="w-12 px-3 py-3 text-center font-medium text-muted-foreground">NO.</th><th className="px-3 py-3 text-left font-medium text-muted-foreground">검사 항목</th><th className="px-3 py-3 text-left font-medium text-muted-foreground">규격 / 기준</th><th className="px-3 py-3 text-left font-medium text-muted-foreground">검사값</th><th className="w-28 px-3 py-3 text-center font-medium text-muted-foreground">판정</th><th className="w-12" /></tr></thead><tbody>{visualRows.map(row => <tr key={row.id} className="border-t"><td className="px-3 py-2 text-center text-muted-foreground">{row.id}</td><td className="px-2 py-2"><Input value={row.item} onChange={e => updateVisual(row.id, 'item', e.target.value)} placeholder="예: 전폭" /></td><td className="px-2 py-2"><Input value={row.standard} onChange={e => updateVisual(row.id, 'standard', e.target.value)} placeholder="검사 기준" /></td><td className="px-2 py-2"><Input value={row.value} onChange={e => updateVisual(row.id, 'value', e.target.value)} placeholder="값 입력" /></td><td className="px-2 py-2"><Input className="text-center" value={row.result} onChange={e => updateVisual(row.id, 'result', e.target.value)} /></td><td className="px-2"><Button variant="ghost" size="icon" onClick={() => setVisualRows(rows => rows.filter(item => item.id !== row.id))} aria-label="검사 항목 삭제"><Trash2 className="size-4 text-muted-foreground" /></Button></td></tr>)}</tbody></table></div><Button variant="outline" className="w-fit" onClick={() => setVisualRows(rows => [...rows, { id: rows.length + 1, item: '', standard: '', value: '', result: 'OK' }])}><Plus data-icon="inline-start" />검사 항목 추가</Button></CardContent></Card>

            <Card><CardHeader><div className="flex items-center justify-between gap-4"><SectionTitle number="03" title="도금두께" description="도금 종류와 측정 포인트를 설정할 수 있습니다." /><Button variant="outline" size="sm"><Settings2 data-icon="inline-start" />항목 설정</Button></div></CardHeader><CardContent className="flex flex-col gap-4"><div className="grid gap-4 rounded-lg bg-muted/40 p-4 sm:grid-cols-[minmax(0,240px)_1fr]"><Field label="도금 종류"><div className="relative"><select value={platingType} onChange={e => setPlatingType(e.target.value)} className="h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"><option>Ni</option><option>Sn</option><option>Au</option><option>Cu</option><option>Zn</option><option>Ag</option></select><ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-muted-foreground" /></div></Field><div className="flex items-end pb-1 text-sm text-muted-foreground"><span className="rounded-md border bg-background px-3 py-2">측정 단위: μm</span></div></div><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[560px] text-sm"><thead className="bg-muted/60"><tr><th className="w-20 px-3 py-3 text-center font-medium text-muted-foreground">NO.</th><th className="px-3 py-3 text-left font-medium text-muted-foreground">측정 포인트</th><th className="px-3 py-3 text-left font-medium text-muted-foreground">도금두께 (μm)</th><th className="w-28 px-3 py-3 text-center font-medium text-muted-foreground">판정</th><th className="w-12" /></tr></thead><tbody>{thicknessRows.map(row => <tr key={row.id} className="border-t"><td className="px-3 py-2 text-center text-muted-foreground">{row.id}</td><td className="px-2 py-2"><Input value={row.point} onChange={e => updateThickness(row.id, 'point', e.target.value)} placeholder="예: 1차" /></td><td className="px-2 py-2"><Input value={row.value} onChange={e => updateThickness(row.id, 'value', e.target.value)} placeholder="측정값" /></td><td className="px-2 py-2"><Input className="text-center" value={row.result} onChange={e => updateThickness(row.id, 'result', e.target.value)} /></td><td className="px-2"><Button variant="ghost" size="icon" onClick={() => setThicknessRows(rows => rows.filter(item => item.id !== row.id))} aria-label="측정 항목 삭제"><Trash2 className="size-4 text-muted-foreground" /></Button></td></tr>)}</tbody></table></div><Button variant="outline" className="w-fit" onClick={() => setThicknessRows(rows => [...rows, { id: rows.length + 1, point: '', value: '', result: 'OK' }])}><Plus data-icon="inline-start" />측정 포인트 추가</Button></CardContent></Card>

            <Card className="report-preview"><CardHeader><SectionTitle number="04" title="성적서 미리보기" description="입력한 정보가 성적서에 어떻게 표시되는지 확인합니다." /></CardHeader><CardContent><div className="rounded-lg border bg-background p-5"><div className="mb-5 flex items-center justify-between border-b pb-4"><div><p className="text-xs font-medium tracking-wider text-primary">WOORI</p><h3 className="text-lg font-bold">QUALITY ASSURANCE REPORT</h3></div><div className="text-right text-xs text-muted-foreground"><p>성적서 No.</p><p className="font-medium text-foreground">{lotNumber || '미입력'}</p></div></div><div className="grid grid-cols-2 gap-px overflow-hidden rounded border bg-border text-sm sm:grid-cols-4"><div className="bg-muted/50 p-3"><p className="text-xs text-muted-foreground">고객명</p><p className="mt-1 font-medium">{customer || '-'}</p></div><div className="bg-muted/50 p-3"><p className="text-xs text-muted-foreground">품명</p><p className="mt-1 font-medium">{product || '-'}</p></div><div className="bg-muted/50 p-3"><p className="text-xs text-muted-foreground">규격</p><p className="mt-1 font-medium">{specification || '-'}</p></div><div className="bg-muted/50 p-3"><p className="text-xs text-muted-foreground">도금 종류</p><p className="mt-1 font-medium">{platingType}</p></div></div><div className="mt-5 flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3"><span className="text-sm font-medium">종합 판정</span><span className="text-xl font-bold text-primary">PASS / OK</span></div></div></CardContent></Card>
          </TabsContent>
          <TabsContent value="saved"><Card><CardContent className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">저장된 성적서가 없습니다.</CardContent></Card></TabsContent>
        </Tabs>
      </div>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
          body * { visibility: hidden; }
          .report-preview, .report-preview * { visibility: visible; }
          .report-preview { position: absolute; inset: 0; width: 100%; margin: 0; border: 0; box-shadow: none; }
          .report-preview > div:first-child { display: none; }
          .report-preview .rounded-lg { border-radius: 0; }
        }
      `}</style>
    </main>
  )
}

