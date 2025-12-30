import { useState, useEffect } from 'react'
import { Model } from '../types'
import { api } from '../utils/api'

export function useModels() {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState('qwen3-vl:4b')
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set())
  const [deletingModels, setDeletingModels] = useState<Set<string>>(new Set())

  const loadModels = async () => {
    try {
      const availableModels = await api.getModels()
      if (availableModels.length > 0) {
        setModels(availableModels)
        const currentModel = availableModels.find((m) => m.name === selectedModel)
        if (!currentModel || !currentModel.downloaded) {
          const downloadedModel = availableModels.find((m) => m.downloaded)
          if (downloadedModel) {
            setSelectedModel(downloadedModel.name)
          } else if (availableModels.length > 0) {
            setSelectedModel(availableModels[0].name)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  useEffect(() => {
    loadModels()
  }, [])

  return {
    models,
    selectedModel,
    setSelectedModel,
    downloadingModels,
    setDownloadingModels,
    deletingModels,
    setDeletingModels,
    loadModels,
  }
}

