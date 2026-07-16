export type UserRole = 'viewer' | 'editor' | 'admin'

export interface User {
  id: string
  username: string
  displayName: string
  passwordHash: string      // SHA-256 hex hash
  role: UserRole
  createdAt: string
}

export interface SessionUser {
  id: string
  username: string
  displayName: string
  role: UserRole
}

export interface DocumentMetadata {
  id: string
  filename: string          // stored filename (auto-generated)
  originalName: string      // original upload name
  company: string
  documentType: string
  lotStart: string
  lotEnd?: string
  product: string
  material: string
  specification?: string
  quantity?: number
  issueDate: string         // YYYY-MM-DD
  note?: string
  fileSize: number          // bytes
  year: string              // extracted from issueDate
  storagePath: string       // relative path inside /storage
  createdAt: string         // ISO timestamp
  createdBy?: string        // displayName of uploader
  createdById?: string      // user id of uploader
  updatedAt?: string        // ISO timestamp of last update
  updatedBy?: string        // displayName of last editor
  updatedById?: string      // user id of last editor
}

export interface SearchFilters {
  company?: string
  documentType?: string
  year?: string
  product?: string
  material?: string
  specification?: string
  lotNumber?: string
  query?: string
}
