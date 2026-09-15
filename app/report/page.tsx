'use client'

import { useState } from 'react'
import { FileText, Printer, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const visualRows = [
  ['1', 'APPEARANCE (외관검사)', '0/1', 'OK'], ['2', 'STAIN (오염)', '0/1', 'OK'], ['3', 'RUST (부식)', '0/1', 'OK'], ['4', 'CONTAMINATION (오염)', '0/1', 'OK'], ['5', 'BENT (변형)', '0/1', 'OK'], ['6', 'NO PLATING (도금누락)', '0/1', 'OK'], ['7', 'PEELING (도금박리)', '0/1', 'OK'], ['8', 'LUMP (도금돌기)', '0/1', 'OK'], ['9', 'CAMBER (휨)', '0/1', 'OK'], ['10', 'PLATING BURR (도금버)', '0/1', 'OK'],
]
const dimensionRows = [
  ['1', '전폭 (Width)', '187.0', '-0.1', '187.05', '187.03', '187.04', 'OK'], ['2', '두께 (Thickness)', '0.15', '+0.01', '0.150', '0.151', '0.150', 'OK'], ['3', '길이 (Length)', '-', '-', '-', '-', '-', 'OK'], ['4', '폭 편차 (Width Variation)', '-', '-', '-', '-', '-', 'OK'], ['5', '기타 (Others)', '-', '-', '-', '-', '-', 'OK'],
]

type ReportValues = { customer: string; product: string; lotNo: string; issueDate: string; specification: string; quantity: string; inspectionDate: string }

function Field({ label, value, onChange }: { label: string; value: string; onChange?: (value: string) => void }) {
  return <label className="report-field"><span>{label}</span><Input value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} readOnly={!onChange} /></label>
}
function SectionTitle({ roman, title, plan }: { roman: string; title: string; plan: string }) {
  return <div className="report-section-title"><strong>{roman}. {title}</strong><span>Sampling Plan : {plan}</span></div>
}

export default function ReportPage() {
  const [status, setStatus] = useState('저장되지 않음')
  const [values, setValues] = useState<ReportValues>({ customer: '(주)고객사', product: '0.15*187', lotNo: '20260910-01', issueDate: '2026-09-10', specification: '0.15*187 / CU', quantity: '343.8 Kg', inspectionDate: '2026-09-10' })
  const update = (key: keyof ReportValues) => (value: string) => setValues((current) => ({ ...current, [key]: value }))
  const save = () => { setStatus('저장됨'); window.setTimeout(() => setStatus('저장되지 않음'), 1800) }

  return <div className="report-page">
    <div className="report-toolbar no-print"><div><p className="eyebrow">QUALITY ASSURANCE</p><h1>성적서 작성</h1></div><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{status}</span><Button variant="outline" onClick={() => window.print()}><Printer data-icon="inline-start" />인쇄</Button><Button onClick={save}><Save data-icon="inline-start" />저장</Button></div></div>
    <div className="report-workspace">
      <aside className="report-editor no-print"><div className="report-editor-heading"><FileText /> <div><strong>성적서 정보</strong><p>입력한 값이 미리보기에 반영됩니다.</p></div></div><div className="report-editor-fields">
        <label>고객명<Input value={values.customer} onChange={(e) => update('customer')(e.target.value)} /></label>
        <label>품명<Input value={values.product} onChange={(e) => update('product')(e.target.value)} /></label>
        <label>로트번호<Input value={values.lotNo} onChange={(e) => update('lotNo')(e.target.value)} /></label>
        <label>발행일자<Input type="date" value={values.issueDate} onChange={(e) => update('issueDate')(e.target.value)} /></label>
        <label>규격<Input value={values.specification} onChange={(e) => update('specification')(e.target.value)} /></label>
        <label>수량<Input value={values.quantity} onChange={(e) => update('quantity')(e.target.value)} /></label>
        <label>검사일자<Input type="date" value={values.inspectionDate} onChange={(e) => update('inspectionDate')(e.target.value)} /></label>
      </div></aside>
      <div className="quality-report">
        <header className="report-header-grid"><div className="report-logo">WOORI</div><div className="report-main-title">QUALITY ASSURANCE REPORT<span>성적서</span></div><Field label="성적서 No." value="QA-2026-0001" /><Field label="CUSTOMER (고객명)" value={values.customer} onChange={update('customer')} /><Field label="DESCRIPTION (품명)" value={values.product} onChange={update('product')} /><Field label="LOT NO. (로트번호)" value={values.lotNo} onChange={update('lotNo')} /><Field label="ISSUED DATE (발행일자)" value={values.issueDate} onChange={update('issueDate')} /><Field label="규격 (제품)" value={values.specification} onChange={update('specification')} /><Field label="LOT SIZE (수량)" value={values.quantity} onChange={update('quantity')} /><Field label="검사일자" value={values.inspectionDate} onChange={update('inspectionDate')} /></header>
        <section><SectionTitle roman="I" title="VISUAL INSPECTION (외관검사)" plan="n=50 / Reel, Lot" /><div className="visual-split">{[visualRows.slice(0, 5), visualRows.slice(5)].map((rows, groupIndex) => <div className="report-table visual-table" key={groupIndex}><div className="table-head"><span>NO.</span><span>INSPECTION ITEMS (검사항목)</span><span>A/c/Re</span><span>RESULT (판정)</span></div>{rows.map((row) => <div key={row[0]}><span>{row[0]}</span><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span></div>)}</div>)}</div></section>
        <section><SectionTitle roman="II" title="DIMENSION INSPECTION (치수검사)" plan="n=100mm/Reel, Reel/Shipping, C=0" /><div className="dimension-split"><div className="report-table dimension-table dimension-info-table"><div className="table-head"><span>NO.</span><span>검사 항목</span><span>규격</span><span>허용차</span></div>{dimensionRows.map((row) => <div key={row[0]}>{row.slice(0, 4).map((cell, i) => <span key={`${row[0]}-${i}`}>{cell}</span>)}</div>)}</div><div className="report-table dimension-table dimension-measure-table"><div className="table-head"><span>1차</span><span>2차</span><span>3차</span><span>판정</span></div>{dimensionRows.map((row) => <div key={row[0]}>{row.slice(4).map((cell, i) => <span key={`${row[0]}-${i}`}>{cell}</span>)}</div>)}</div></div></section>
        <section><SectionTitle roman="III" title="PLATING THICKNESS (도금두께)" plan="X-Ray 검사 / Reel, Lot" /><div className="report-table plating-table"><div className="table-head"><span>NO.</span><span>도금 종류 (최대 3개)</span><span>판정</span></div>{Array.from({ length: 3 }, (_, i) => <div key={i}><span>{i + 1}</span><Input aria-label={`도금 종류 ${i + 1}`} placeholder="예: Ni, Sn" /><span>OK</span></div>)}</div></section>
        <div className="report-bottom"><div className="sample-box"><div className="box-label">ADHESION TEST SAMPLE (밀착 테스트 시료)</div><div className="sample-blank" aria-label="실제 밀착 테스트 시료 부착 영역" /></div><div className="approval-box"><div className="box-label">종합판정</div><div className="pass">PASS / OK</div><div className="approval-grid"><span>작성</span><span>승인</span><span>검토</span><span>고객</span><div /><div /><div /><div /></div></div></div>
      </div>
    </div>
  </div>
}
