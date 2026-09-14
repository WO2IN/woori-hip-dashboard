'use client'

import { useState } from 'react'
import { FileText, ImagePlus, Printer, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const referenceImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Y3gLIzLIgQTUbGADRToP8Fl1OM3Rij.png'

const visualRows = [
  ['1', 'APPEARANCE (외관검사)', '0/1', 'OK'],
  ['2', 'STAIN (오염)', '0/1', 'OK'],
  ['3', 'RUST (부식)', '0/1', 'OK'],
  ['4', 'CONTAMINATION (오염)', '0/1', 'OK'],
  ['5', 'BENT (변형)', '0/1', 'OK'],
  ['6', 'NO PLATING (도금누락)', '0/1', 'OK'],
  ['7', 'PEELING (도금박리)', '0/1', 'OK'],
  ['8', 'LUMP (도금돌기)', '0/1', 'OK'],
  ['9', 'CAMBER (휨)', '0/1', 'OK'],
  ['10', 'PLATING BURR (도금버)', '0/1', 'OK'],
]

const dimensionRows = [
  ['1', '전폭 (Width)', '187.0', '-0.1', '187.05', '187.03', '187.04', 'OK'],
  ['2', '두께 (Thickness)', '0.15', '+0.01', '0.150', '0.151', '0.150', 'OK'],
  ['3', '길이 (Length)', '-', '-', '-', '-', '-', 'OK'],
  ['4', '폭 편차 (Width Variation)', '-', '-', '-', '-', '-', 'OK'],
  ['5', '기타 (Others)', '-', '-', '-', '-', '-', 'OK'],
]

function Field({ label, value }: { label: string; value: string }) {
  return <label className="report-field"><span>{label}</span><Input defaultValue={value} /></label>
}

function SectionTitle({ roman, title, plan }: { roman: string; title: string; plan: string }) {
  return <div className="report-section-title"><strong>{roman}. {title}</strong><span>Sampling Plan : {plan}</span></div>
}

export default function ReportPage() {
  const [status, setStatus] = useState('저장되지 않음')
  const save = () => {
    setStatus('저장됨')
    window.setTimeout(() => setStatus('저장되지 않음'), 1800)
  }

  return (
    <div className="report-page">
      <div className="report-toolbar no-print">
        <div><p className="eyebrow">QUALITY ASSURANCE</p><h1>성적서 작성</h1></div>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{status}</span><Button variant="outline" onClick={() => window.print()}><Printer data-icon="inline-start" />인쇄</Button><Button onClick={save}><Save data-icon="inline-start" />저장</Button></div>
      </div>

      <div className="quality-report">
        <header className="report-header-grid">
          <div className="report-logo">WOORI</div><div className="report-main-title">QUALITY ASSURANCE REPORT<span>성적서</span></div><Field label="성적서 No." value="QA-2026-0001" />
          <Field label="CUSTOMER (고객명)" value="(주)고객사" /><Field label="DESCRIPTION (품명)" value="0.15*187" /><Field label="LOT NO. (로트번호)" value="20260910-01" /><Field label="ISSUED DATE (발행일자)" value="2026-09-10" />
          <Field label="규격 (제품)" value="0.15*187 / CU" /><Field label="LOT SIZE (수량)" value="343.8 Kg" /><Field label="검사일자" value="2026-09-10" />
        </header>

        <section><SectionTitle roman="I" title="VISUAL INSPECTION (외관검사)" plan="n=50 / Reel, Lot" /><div className="report-table visual-table"><div className="table-head"><span>NO.</span><span>INSPECTION ITEMS (검사항목)</span><span>A/c/Re</span><span>RESULT (판정)</span></div>{visualRows.map((row) => <div className="table-row" key={row[0]}><span>{row[0]}</span><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span></div>)}</div></section>

        <section><SectionTitle roman="II" title="DIMENSION INSPECTION (치수검사)" plan="n=100mm/Reel, Reel/Shipping, C=0" /><div className="report-table dimension-table"><div className="table-head"><span>NO.</span><span>검사 항목</span><span>규격</span><span>허용차</span><span>1차</span><span>2차</span><span>3차</span><span>판정</span></div>{dimensionRows.map((row) => <div className="table-row" key={row[0]}>{row.map((cell, i) => <span key={`${row[0]}-${i}`}>{cell}</span>)}</div>)}</div></section>

        <section><SectionTitle roman="III" title="PLATING THICKNESS (도금두께)" plan="n=50 / Reel, Lot" /><div className="report-table plating-table"><div className="table-head"><span>NO.</span><span>검사 항목</span><span>도금 종류</span><span>1차</span><span>2차</span><span>3차</span><span>판정</span></div>{Array.from({ length: 10 }, (_, i) => <div className="table-row" key={i}><span>{i + 1}</span><Input /><span></span><Input /><Input /><Input /><span>OK</span></div>)}</div></section>

        <section><SectionTitle roman="IV" title="FUNCTIONAL TEST (기능검사)" plan="n=100mm/EA, 2EA/Shipping, C=0" /><div className="report-table functional-table"><div className="table-head"><span>NO.</span><span>검사 항목</span><span>검사 기준</span><span>검사 결과</span><span>판정</span></div>{[['1', 'X-Ray 검사', 'N 1.0~2.0μm', '이상 없음'], ['2', '전기적 특성 검사', '정상 동작 확인', '이상 없음']].map((row) => <div className="table-row" key={row[0]}>{row.map((cell) => <span key={cell}>{cell}</span>)}<span>OK</span></div>)}</div></section>

        <div className="report-bottom"><div className="sample-box"><div className="box-label">TEST SAMPLE PHOTO</div><div className="sample-image"><img src={referenceImage} alt="검사 샘플 참고 이미지" /></div></div><div className="approval-box"><div className="box-label">종합판정</div><div className="pass">PASS / OK</div><div className="approval-grid"><span>작성</span><span>승인</span><span>검토</span><span>고객</span><div /><div /><div /><div /></div></div></div>
      </div>
    </div>
  )
}
