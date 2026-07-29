import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

const DATA_FILE = join(process.cwd(), 'data', 'plating-thickness.json')

interface MeasurementRow {
  id: string
  values: string[]
  dateTime?: string
}

interface PlatingRecord {
  id: string
  date: string
  productName: string
  lotNumber: string
  productType: 'initial' | 'middle' | 'final'
  company: string
  materials: string[]
  rows: MeasurementRow[]
  specification: string
  measurementTime: string
  note: string
  createdAt: string
}

async function readData(): Promise<PlatingRecord[]> {
  try {
    const data = await readFile(DATA_FILE, 'utf-8')
    return JSON.parse(data || '[]')
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const records = await readData()
    return NextResponse.json(records)
  } catch (error) {
    console.error('데이터 읽기 실패:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const newRecord: PlatingRecord = await request.json()
    const records = await readData()
    records.push(newRecord)
    await writeFile(DATA_FILE, JSON.stringify(records, null, 2))
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('데이터 저장 실패:', error)
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    const records = await readData()
    const filtered = records.filter(r => r.id !== id)
    await writeFile(DATA_FILE, JSON.stringify(filtered, null, 2))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('데이터 삭제 실패:', error)
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updatedRecord: PlatingRecord = await request.json()

    const records = await readData()

    const index = records.findIndex(
      r => r.id === updatedRecord.id
    )

    if (index === -1) {
      return NextResponse.json(
        { error: '데이터를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    records[index] = updatedRecord

    await writeFile(
      DATA_FILE,
      JSON.stringify(records, null, 2)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('데이터 수정 실패:', error)

    return NextResponse.json(
      { error: '수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}