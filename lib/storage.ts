import fs from 'fs'
import path from 'path'
import { DocumentMetadata } from './types'

const ROOT = process.cwd()

// public/storage 사용
export const STORAGE_DIR = path.join(ROOT, 'public', 'storage')
export const CONFIG_DIR = path.join(ROOT, 'config')
export const METADATA_FILE = path.join(STORAGE_DIR, 'metadata.json')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export function readMetadata(): DocumentMetadata[] {
  ensureDir(STORAGE_DIR)
  if (!fs.existsSync(METADATA_FILE)) return []

  try {
    return JSON.parse(
      fs.readFileSync(METADATA_FILE, 'utf-8')
    ) as DocumentMetadata[]
  } catch {
    return []
  }
}

export function writeMetadata(data: DocumentMetadata[]) {
  ensureDir(STORAGE_DIR)
  fs.writeFileSync(
    METADATA_FILE,
    JSON.stringify(data, null, 2),
    'utf-8'
  )
}

export function appendMetadata(doc: DocumentMetadata) {
  const all = readMetadata()
  all.push(doc)
  writeMetadata(all)
}

export function updateMetadata(
  id: string,
  updates: Partial<DocumentMetadata>
) {
  const all = readMetadata()
  const idx = all.findIndex(d => d.id === id)

  if (idx === -1) return false

  all[idx] = { ...all[idx], ...updates }
  writeMetadata(all)

  return true
}

export function deleteMetadata(id: string): DocumentMetadata | null {
  const all = readMetadata()
  const idx = all.findIndex(d => d.id === id)

  if (idx === -1) return null

  const [removed] = all.splice(idx, 1)
  writeMetadata(all)

  return removed
}

// ─── Config ────────────────────────────────────────────────────────────────

export function readConfig(name: string): string[] {
  const file = path.join(CONFIG_DIR, `${name}.json`)

  if (!fs.existsSync(file)) return []

  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as string[]
  } catch {
    return []
  }
}

export function writeConfig(name: string, data: string[]) {
  ensureDir(CONFIG_DIR)

  fs.writeFileSync(
    path.join(CONFIG_DIR, `${name}.json`),
    JSON.stringify(data, null, 2),
    'utf-8'
  )
}

// ─── File storage path ─────────────────────────────────────────────────────

export function getDocumentFilePath(relativePath: string) {
  return path.join(STORAGE_DIR, relativePath)
}