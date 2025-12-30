import { useState, useEffect } from 'react'
import { UserFile } from '../types'
import { api } from '../utils/api'

export function useFiles(userId: number | null) {
  const [userFiles, setUserFiles] = useState<UserFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ filename: string, images: string[] } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ filename: string, images: string[] } | null>(null)

  const loadUserFiles = async (id: number) => {
    setLoadingFiles(true)
    try {
      const files = await api.getUserFiles(id)
      setUserFiles(files)
    } catch (error) {
      console.error('Failed to load user files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadUserFiles(userId)
    }
  }, [userId])

  return {
    userFiles,
    loadingFiles,
    uploadedFile,
    setUploadedFile,
    uploading,
    setUploading,
    selectedFile,
    setSelectedFile,
    loadUserFiles,
  }
}

