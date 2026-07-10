import { UploadForm } from '@/components/upload/upload-form'
import { Upload } from 'lucide-react'

export default function UploadPage() {
  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-50 dark:bg-green-950/30 rounded-xl flex items-center justify-center">
            <Upload className="w-5 h-5 text-green-600" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-foreground">문서 등록</h1>
            <p className="text-sm text-muted-foreground">
              PDF 문서를 등록합니다.
            </p>
          </div>
        </div>
      </div>

      <UploadForm />
    </div>
  )
}