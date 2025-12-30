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
      
      // Add cloud models (no download required)
      const cloudModels: Model[] = [
        // Gemini series
        { name: 'gemini3pro', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 3 Pro' },
        { name: 'gemini3flash', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 3 Flash' },
        { name: 'gemini2.5flash', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 2.5 Flash' },
        { name: 'gemini2.5flash-lite', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 2.5 Flash Lite' },
        { name: 'gemini2.5pro', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 2.5 Pro' },
        { name: 'gemini2.0flash', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 2.0 Flash' },
        { name: 'gemini2.0flash-lite', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 2.0 Flash Lite' },
        // GPT series
        { name: 'gpt-5.2', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-5.2' },
        { name: 'gpt-5.1', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-5.1' },
        { name: 'gpt-5', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-5' },
        { name: 'gpt-5-mini', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-5 Mini' },
        { name: 'gpt-5-nano', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-5 Nano' },
        { name: 'o3', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI O3' },
        { name: 'o4-mini', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI O4 Mini' },
        { name: 'gpt-4.1', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4.1' },
        { name: 'gpt-4.1-mini', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4.1 Mini' },
        { name: 'gpt-4.1-nano', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4.1 Nano' },
        { name: 'o1-pro', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI O1 Pro' },
        { name: 'o3-mini', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI O3 Mini' },
        { name: 'o1', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI O1' },
        { name: 'gpt-4o', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4o' },
        { name: 'gpt-oss-120b', family: 'gpt', type: 'text', downloaded: false, description: 'OpenAI GPT-OSS 120B' },
        { name: 'gpt-oss-20b', family: 'gpt', type: 'text', downloaded: false, description: 'OpenAI GPT-OSS 20B' },
        { name: 'gpt-4o-mini', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4o Mini' },
        { name: 'gpt-4-turbo', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4 Turbo' },
        { name: 'gpt-4', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4' },
        { name: 'gpt-3.5-turbo', family: 'gpt', type: 'text', downloaded: false, description: 'OpenAI GPT-3.5 Turbo' },
        // Grok series
        { name: 'grok-4-1-fast-reasoning', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 4.1 Fast Reasoning' },
        { name: 'grok-4-1-fast-non-reasoning', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 4.1 Fast Non-Reasoning' },
        { name: 'grok-4-fast-reasoning', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 4 Fast Reasoning' },
        { name: 'grok-4-fast-non-reasoning', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 4 Fast Non-Reasoning' },
        { name: 'grok-code-fast-1', family: 'grok', type: 'text', downloaded: false, description: 'xAI Grok Code Fast' },
        { name: 'grok-4', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 4' },
        { name: 'grok-2-image-1212', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 2 Image' },
        { name: 'grok-beta', family: 'grok', type: 'text', downloaded: false, description: 'xAI Grok Beta' },
        { name: 'grok-2', family: 'grok', type: 'text', downloaded: false, description: 'xAI Grok 2' },
        { name: 'grok-2-vision', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 2 Vision' },
        // Claude series
        { name: 'claude-sonnet-4.5', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude Sonnet 4.5' },
        { name: 'claude-opus-4.5', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude Opus 4.5' },
        { name: 'claude-opus-4.1', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude Opus 4.1' },
        { name: 'claude-haiku-4.5', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude Haiku 4.5' },
        { name: 'claude-3-5-sonnet', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude 3.5 Sonnet' },
        { name: 'claude-3-opus', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude 3 Opus' },
        { name: 'claude-3-sonnet', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude 3 Sonnet' },
        { name: 'claude-3-haiku', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude 3 Haiku' },
      ]
      
      // Combine available models with cloud models, avoiding duplicates
      const existingModelNames = new Set(availableModels.map(m => m.name))
      const newCloudModels = cloudModels.filter(m => !existingModelNames.has(m.name))
      const allModels = [...availableModels, ...newCloudModels]
      
      if (allModels.length > 0) {
        setModels(allModels)
        const currentModel = allModels.find((m) => m.name === selectedModel)
        if (!currentModel || !currentModel.downloaded) {
          const downloadedModel = allModels.find((m) => m.downloaded)
          if (downloadedModel) {
            setSelectedModel(downloadedModel.name)
          } else if (allModels.length > 0) {
            setSelectedModel(allModels[0].name)
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

