import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

const DATA_FILE = join(process.cwd(), 'data', 'plating-thickness.json')

interface MeasurementRow {
  id: string
  material: string
  value: string
}

interface PlatingRecord {
  id: string
  date: string
  productName: string
  lotNumber: string
  productType: 'initial' | 'middle' | 'final'
  company: string
  measurements: MeasurementRow[]
  specification: string
  measurementTime: string
  createdAt: string
}

async function ensureDataDir() {
  try {
    await readFile(DATA_FILE)
  } catch {
    // 파일이 없으면 빈 배열로 초기화
    const dir = join(process.cwd(), 'data')
    try {
      await readFile(dir)
    } catch {
      // 디렉토리도 없으면 생성 필요 (실제로는 Next.js 구조에서 이미 존재)
    }
    await writeFile(DATA_FILE, JSON.stringify([]))
  }
}

export async function GET() {
  try {
    await ensureDataDir()
    const data = await readFile(DATA_FILE, 'utf-8')
    const records: PlatingRecord[] = JSON.parse(data)
    return NextResponse.json(records)
  } catch (error) {
    console.error('데이터 읽기 실패:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDataDir()
    const newRecord: PlatingRecord = await request.json()

    // 기존 데이터 읽기
    const data = await readFile(DATA_FILE, 'utf-8')
    const records: PlatingRecord[] = JSON.parse(data || '[]')

    // 새 기록 추가
    records.push(newRecord)

    // 데이터 저장
    await writeFile(DATA_FILE, JSON.stringify(records, null, 2))

    return NextResponse.json(
      { success: true, message: '저장되었습니다.' },
      { status: 201 }
    )
  } catch (error) {
    console.error('데이터 저장 실패:', error)
    return NextResponse.json(
      { error: '저장에 실패했습니다.' },
      { status: 500 }
    )
  }
}
