import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'node:fs'
import iconv from 'iconv-lite'
import path from 'node:path'

export type PlatingInfo = {
  company: string
  product: string
  gold: string
  nickel: string
  material: string
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const next = line[index + 1]

    if (character === '"' && quoted && next === '"') {
      value += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      values.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }

  values.push(value.trim())
  return values
}

function escapeCsv(value: string) {
  return /[\",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function validateRows(rows: unknown): PlatingInfo[] {
  if (!Array.isArray(rows)) throw new Error('데이터 형식이 올바르지 않습니다.')
  const seen = new Set<string>()
  return rows.map((row) => {
    if (!row || typeof row !== 'object') throw new Error('행 형식이 올바르지 않습니다.')
    const item = row as Record<string, unknown>
    const normalized = {
      company: String(item.company ?? '').trim(),
      product: String(item.product ?? '').trim(),
      gold: String(item.gold ?? '').trim(),
      nickel: String(item.nickel ?? '').trim(),
      material: String(item.material ?? '').trim(),
    }
    if (!normalized.company || !normalized.product) throw new Error('업체명과 품목은 필수입니다.')
    const key = `${normalized.company}\u0000${normalized.product}`
    if (seen.has(key)) throw new Error(`중복된 업체명·품목입니다: ${normalized.company} / ${normalized.product}`)
    seen.add(key)
    return normalized
  })
}

function writePlatingInfo(rows: PlatingInfo[]) {
  const csv = [
    '업체명,품목,금도금,니켈도금,재질',
    ...rows.map(row => [row.company, row.product, row.gold, row.nickel, row.material].map(escapeCsv).join(',')),
  ].join('\n') + '\n'
  const filePath = path.join(process.cwd(), 'data', 'plating-information.csv')
  writeFileSync(filePath, iconv.encode(csv, 'cp949'))
}

function readPlatingInfo(): PlatingInfo[] {
  const filePath = path.join(process.cwd(), 'data', 'plating-information.csv')
  const content = iconv
    .decode(readFileSync(filePath), 'cp949')
    .replace(/^\uFEFF/, '')

  return content
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map(parseCsvLine)
    .filter(row => row.length >= 5 && row[0] && row[1])
    .map(row => ({
      company: row[0],
      product: row[1],
      gold: row[2],
      nickel: row[3],
      material: row[4],
    }))
}

export async function PUT(request: NextRequest) {
  try {
    const rows = validateRows(await request.json())
    writePlatingInfo(rows)
    return NextResponse.json({ rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CSV 저장에 실패했습니다.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams
    const company = searchParams.get('company')?.trim()
    const product = searchParams.get('product')?.trim()

    if (!company || !product) {
      return NextResponse.json({ rows: readPlatingInfo() })
    }

    const matches = readPlatingInfo().filter(
      item => item.company === company && item.product === product
    )

    const formattedMatches = matches.map(item => ({
      material: item.material,
      specification: [item.gold, item.nickel].filter(Boolean).join(' / '),
    }))

    return NextResponse.json({
      matches: formattedMatches,
      match: formattedMatches[0] ?? null,
    })
  } catch (error) {
    console.error('[v0] 도금 정보 CSV 조회 실패:', error)
    return NextResponse.json({ matches: [], error: '도금 정보를 불러오지 못했습니다.' }, { status: 500 })
  }
}
