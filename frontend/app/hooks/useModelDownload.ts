import { useState } from 'react'
import { api } from '../utils/api'
import { estimateModelSizeRange } from '../utils/modelSize'

export function useModelDownload(
  downloadingModels: Set<string>,
  setDownloadingModels: React.Dispatch<React.SetStateAction<Set<string>>>,
  deletingModels: Set<string>,
  setDeletingModels: React.Dispatch<React.SetStateAction<Set<string>>>,
  loadModels: () => Promise<void>
) {
  const [showDownloadWarning, setShowDownloadWarning] = useState(false)
  const [pendingDownloadModel, setPendingDownloadModel] = useState<string | null>(null)
  const [pendingDownloadSize, setPendingDownloadSize] = useState<{ min: number; max: number }>({ min: 0, max: 0 })
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false)
  const [completedDownloadModel, setCompletedDownloadModel] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteModel, setPendingDeleteModel] = useState<string | null>(null)

  const downloadModel = async (modelName: string) => {
    if (downloadingModels.has(modelName)) return

    // Check if model is large and show warning
    const sizeRange = estimateModelSizeRange(modelName)

    if (sizeRange.min >= 1.0) {
      // Show custom warning modal
      setPendingDownloadModel(modelName)
      setPendingDownloadSize(sizeRange)
      setShowDownloadWarning(true)
      return
    }

    // Start download immediately for small models
    await startDownload(modelName)
  }

  const handleConfirmDownload = async () => {
    if (pendingDownloadModel) {
      setShowDownloadWarning(false)
      await startDownload(pendingDownloadModel)
      setPendingDownloadModel(null)
      setPendingDownloadSize({ min: 0, max: 0 })
    }
  }

  const handleCancelDownload = () => {
    setShowDownloadWarning(false)
    setPendingDownloadModel(null)
    setPendingDownloadSize({ min: 0, max: 0 })
  }

  const startDownload = async (modelName: string) => {
    console.log('Starting download for model:', modelName)
    setDownloadingModels(prev => new Set(prev).add(modelName))

    try {
      const response = await api.pullModel(modelName)
      console.log('Download response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Download failed:', errorText)
        throw new Error(`ダウンロードの開始に失敗しました: ${response.status} ${errorText}`)
      }

      if (!response.body) {
        throw new Error('レスポンスボディがありません')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let hasError = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('Stream ended')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue

          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue

              const data = JSON.parse(jsonStr)
              console.log('Received data:', data)

              if (data.error) {
                console.error('Download error:', data.error)
                hasError = true
                throw new Error(data.error)
              }

              if (data.status === 'success') {
                console.log('Download completed successfully')
                // Reload models after successful download
                await loadModels()
                setCompletedDownloadModel(modelName)
                setShowDownloadSuccess(true)
                setDownloadingModels(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(modelName)
                  return newSet
                })
                return
              }
            } catch (e: any) {
              if (e.message && e.message.includes('error')) {
                throw e
              }
              console.error('Failed to parse pull data:', e, 'Line:', line)
            }
          }
        }
      }

      if (!hasError) {
        // If we reach here without success, reload models anyway
        await loadModels()
      }
    } catch (error: any) {
      console.error('Failed to download model:', error)
      alert(`モデルのダウンロードに失敗しました: ${error.message || error}`)
    } finally {
      setDownloadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
    }
  }

  const deleteModel = async (modelName: string) => {
    if (deletingModels.has(modelName)) return

    setPendingDeleteModel(modelName)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteModel) return

    setDeletingModels(prev => new Set(prev).add(pendingDeleteModel))
    setShowDeleteConfirm(false)

    try {
      await api.deleteModel(pendingDeleteModel)
      await loadModels()
      setPendingDeleteModel(null)
    } catch (error: any) {
      console.error('Failed to delete model:', error)
      alert(`モデルの削除に失敗しました: ${error.response?.data?.detail || error.message}`)
    } finally {
      setDeletingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(pendingDeleteModel)
        return newSet
      })
      setPendingDeleteModel(null)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setPendingDeleteModel(null)
  }

  return {
    showDownloadWarning,
    pendingDownloadModel,
    pendingDownloadSize,
    showDownloadSuccess,
    completedDownloadModel,
    showDeleteConfirm,
    pendingDeleteModel,
    downloadModel,
    handleConfirmDownload,
    handleCancelDownload,
    deleteModel,
    handleConfirmDelete,
    handleCancelDelete,
    setShowDownloadSuccess,
    setCompletedDownloadModel,
  }
}

