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
