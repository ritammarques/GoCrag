'use client'

// components/spot/UploadSection.tsx

import { useRef, useState } from 'react'
import { Camera, Video, FileText, X, Loader2 } from 'lucide-react'
import { useUpload } from '@/hooks/useUpload'
import { isImageMime, isVideoMime } from '@/lib/utils'
import type { Upload, UploadTarget, UploadFileType } from '@/types'

interface UploadSectionProps {
  userId: string
  target: UploadTarget
  existingUploads: Upload[]
  onUploadsChange: (uploads: Upload[]) => void
}

const UPLOAD_TYPES: Array<{
  type: UploadFileType
  label: string
  Icon: React.ElementType
  accept: string
}> = [
  { type: 'photo',  label: 'Foto',   Icon: Camera,   accept: 'image/*' },
  { type: 'video',  label: 'Vídeo',  Icon: Video,    accept: 'video/*' },
  { type: 'croqis', label: 'Croqui', Icon: FileText, accept: '.pdf,image/*' },
]

export function UploadSection({
  userId,
  target,
  existingUploads,
  onUploadsChange,
}: UploadSectionProps) {
  const [uploads, setUploads] = useState<Upload[]>(existingUploads)
  const { uploadFile, deleteUpload, uploading, progress, error } = useUpload(userId)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: UploadFileType
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadFile(file, fileType, target)
    if (result) {
      const next = [...uploads, result]
      setUploads(next)
      onUploadsChange(next)
    }
    if (e.target) e.target.value = ''
  }

  const handleDelete = async (upload: Upload) => {
    await deleteUpload(upload.id, upload.storage_path)
    const next = uploads.filter(u => u.id !== upload.id)
    setUploads(next)
    onUploadsChange(next)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        Adicionar conteúdo
      </p>

      {/* Botões de upload */}
      <div className="grid grid-cols-3 gap-2">
        {UPLOAD_TYPES.map(({ type, label, Icon, accept }) => (
          <label
            key={type}
            className={[
              'flex flex-col items-center gap-1.5 p-3 rounded-xl cursor-pointer transition-all',
              'bg-neutral-50 border border-dashed border-neutral-200',
              'hover:border-brand-400 hover:bg-brand-50',
              uploading ? 'opacity-50 pointer-events-none' : '',
            ].join(' ')}
          >
            <Icon size={20} className="text-neutral-400" />
            <span className="text-xs font-medium text-neutral-500">{label}</span>
            <input
              type="file"
              accept={accept}
              className="sr-only"
              ref={el => { inputRefs.current[type] = el }}
              onChange={e => handleFileChange(e, type)}
              disabled={uploading}
            />
          </label>
        ))}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="flex items-center gap-2 text-xs text-brand-600">
          <Loader2 size={14} className="animate-spin flex-shrink-0" />
          <div className="flex-1 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-brand-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-medium">{progress}%</span>
        </div>
      )}

      {/* Erro */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}

      {/* Previews */}
      {uploads.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploads.map((upload, i) => (
            <UploadPreview
              key={upload.id ?? i}
              upload={upload}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UploadPreview({
  upload,
  onDelete,
}: {
  upload: Upload
  onDelete: (u: Upload) => void
}) {
  const isImg = upload.mime_type ? isImageMime(upload.mime_type) : false
  const isVid = upload.mime_type ? isVideoMime(upload.mime_type) : false

  return (
    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 group flex-shrink-0">
      {isImg ? (
        <img
          src={upload.public_url}
          alt={upload.file_name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
          <span className="text-2xl" role="img">
            {isVid ? '🎥' : '📄'}
          </span>
          <span className="text-[9px] text-neutral-500 text-center truncate w-full leading-tight px-1">
            {upload.file_name}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={() => onDelete(upload)}
        className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remover"
      >
        <X size={10} />
      </button>
    </div>
  )
}
