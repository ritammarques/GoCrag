'use client'

// hooks/useUpload.ts

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UploadTarget, UploadFileType, Upload } from '@/types'

interface UploadState {
  uploading: boolean
  progress:  number
  error:     string | null
}

export function useUpload(userId: string) {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress:  0,
    error:     null,
  })

  const uploadFile = async (
    file: File,
    fileType: UploadFileType,
    target: UploadTarget
  ): Promise<Upload | null> => {
    setState({ uploading: true, progress: 0, error: null })

    try {
      const folder = target.spotId ?? target.sectorId ?? target.challengeId ?? 'misc'
      const ext    = file.name.split('.').pop() ?? 'bin'
      const path   = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      setState(s => ({ ...s, progress: 25 }))

      const { error: storageError } = await supabase.storage
        .from('uploads')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (storageError) throw new Error(storageError.message)

      setState(s => ({ ...s, progress: 65 }))

      const {
        data: { publicUrl },
      } = supabase.storage.from('uploads').getPublicUrl(path)

      const { data: record, error: dbError } = await supabase
        .from('uploads')
        .insert({
          user_id:      userId,
          spot_id:      target.spotId      ?? null,
          sector_id:    target.sectorId    ?? null,
          challenge_id: target.challengeId ?? null,
          file_type:    fileType,
          file_name:    file.name,
          storage_path: path,
          public_url:   publicUrl,
          mime_type:    file.type,
          size_bytes:   file.size,
        })
        .select()
        .single()

      if (dbError) throw new Error(dbError.message)

      setState({ uploading: false, progress: 100, error: null })
      return record as Upload
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro no upload'
      setState({ uploading: false, progress: 0, error: msg })
      return null
    }
  }

  const deleteUpload = async (uploadId: string, storagePath: string) => {
    await supabase.storage.from('uploads').remove([storagePath])
    await supabase.from('uploads').delete().eq('id', uploadId)
  }

  return { ...state, uploadFile, deleteUpload }
}
