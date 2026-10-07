import { DocumentMetadata } from './types'
import { normalizeIssueDate } from './lot'

type InventoryLike = Pick<
  DocumentMetadata,
  'id' | 'company' | 'product' | 'floor' | 'quantity' | 'quantityUnit' | 'issueDate' | 'lotStart'
>

export type StockKind = '입고' | '출고'

export interface StockMovement {
  id: string
  kind: StockKind
  company: string
  product: string
  floor: string
  quantity: number
  unit: string
  issueDate: string
  lot: string
  source: 'inventory' | 'document'
  shipmentCategory?: string
}

export interface StockGroup {
  key: string
  company: string
  product: string
  floor: string
  unit: string
  opening: number
  incoming: number
  outgoing: number
  stock: number
  lastDate: string
  mixedUnits: boolean
}

export function compactDate(value?: string) {
  try {
    return normalizeIssueDate(value).replace(/-/g, '')
  } catch {
    return String(value ?? '').replace(/[^0-9]/g, '').slice(0, 8)
  }
}

export function displayDate(value?: string) {
  const key = compactDate(value)
  if (key.length !== 8) return value?.trim() || '-'
  return `${key.slice(0, 4)}.${key.slice(4, 6)}.${key.slice(6, 8)}`
}

export function displayLot(doc: { lotStart?: string; lotEnd?: string }) {
  if (doc.lotEnd && doc.lotEnd !== doc.lotStart) return `${doc.lotStart} ~ ${doc.lotEnd}`
  return doc.lotStart || '-'
}

export function formatQuantity(quantity: number, unit?: string) {
  if (!Number.isFinite(quantity)) return '-'
  const formatted = quantity.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  return unit ? `${formatted} ${unit}` : formatted
}

function asMovementFromInventory(record: InventoryLike): StockMovement | null {
  const quantity = Number(record.quantity ?? 0)
  if (!Number.isFinite(quantity)) return null
  return {
    id: record.id,
    kind: '입고',
    company: record.company?.trim() || '-',
    product: record.product?.trim() || '-',
    floor: String(record.floor || ''),
    quantity,
    unit: record.quantityUnit?.trim() || 'EA',
    issueDate: compactDate(record.issueDate),
    lot: record.lotStart || '',
    source: 'inventory',
  }
}

function asMovementFromDocument(doc: DocumentMetadata): StockMovement | null {
  if (doc.documentType !== '성적서') return null
  if (doc.movementType === '입고' && doc.filename === '수기입력') return null
  if (doc.storagePath === 'INVENTORY') return null
  const quantity = Number(doc.quantity ?? 0)
  if (!Number.isFinite(quantity)) return null
  return {
    id: doc.id,
    kind: doc.movementType === '입고' ? '입고' : '출고',
    company: doc.company?.trim() || '-',
    product: doc.product?.trim() || '-',
    floor: String(doc.floor ?? doc.shipmentFloor ?? ''),
    quantity,
    unit: doc.quantityUnit?.trim() || 'Kg',
    issueDate: compactDate(doc.issueDate),
    lot: displayLot(doc),
    source: 'document',
    shipmentCategory: doc.shipmentCategory,
  }
}

export function collectMovements(
  documents: DocumentMetadata[],
  inventory: InventoryLike[],
): StockMovement[] {
  return [
    ...inventory.map(asMovementFromInventory),
    ...documents.map(asMovementFromDocument),
  ].filter((item): item is StockMovement => Boolean(item))
}

export function stockGroupKey(item: Pick<StockMovement, 'company' | 'product' | 'floor' | 'unit'>) {
  return [item.company, item.product, item.floor || '-', item.unit].join('\u0000')
}

export function buildStockGroups(
  movements: StockMovement[],
  startDate = '',
  endDate = '',
): StockGroup[] {
  const start = startDate ? compactDate(startDate) : ''
  const end = endDate ? compactDate(endDate) : ''
  const grouped = new Map<string, StockGroup>()

  for (const movement of movements) {
    const key = stockGroupKey(movement)
    const current = grouped.get(key) ?? {
      key,
      company: movement.company,
      product: movement.product,
      floor: movement.floor,
      unit: movement.unit,
      opening: 0,
      incoming: 0,
      outgoing: 0,
      stock: 0,
      lastDate: '',
      mixedUnits: false,
    }

    const beforeRange = Boolean(start && movement.issueDate && movement.issueDate < start)
    const afterRange = Boolean(end && movement.issueDate && movement.issueDate > end)
    if (afterRange) {
      grouped.set(key, current)
      continue
    }

    const signed = movement.kind === '입고' ? movement.quantity : -movement.quantity
    if (beforeRange) {
      current.opening += signed
    } else {
      if (movement.kind === '입고') current.incoming += movement.quantity
      else current.outgoing += movement.quantity
      if (movement.issueDate > current.lastDate) current.lastDate = movement.issueDate
    }
    grouped.set(key, current)
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      stock: group.opening + group.incoming - group.outgoing,
    }))
    .sort((a, b) =>
      `${a.company}${a.product}${a.floor}`.localeCompare(`${b.company}${b.product}${b.floor}`, 'ko'),
    )
}

export function uniqueUnits(groups: StockGroup[]) {
  return [...new Set(groups.map((group) => group.unit).filter(Boolean))]
}

export function ledgerRows(movements: StockMovement[], startDate = '', endDate = '') {
  const start = startDate ? compactDate(startDate) : ''
  const end = endDate ? compactDate(endDate) : ''
  const sorted = [...movements].sort((a, b) => {
    const byDate = a.issueDate.localeCompare(b.issueDate)
    if (byDate !== 0) return byDate
    return a.kind.localeCompare(b.kind, 'ko')
  })

  let running = 0
  return sorted
    .filter((movement) => {
      if (start && movement.issueDate && movement.issueDate < start) {
        running += movement.kind === '입고' ? movement.quantity : -movement.quantity
        return false
      }
      if (end && movement.issueDate && movement.issueDate > end) return false
      return true
    })
    .map((movement) => {
      running += movement.kind === '입고' ? movement.quantity : -movement.quantity
      return { ...movement, running }
    })
}
