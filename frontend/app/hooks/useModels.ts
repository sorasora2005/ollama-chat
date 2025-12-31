import { useState, useEffect } from 'react'
import { Model } from '../types'
import { api } from '../utils/api'

export function useModels() {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState('qwen3-vl:4b')
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set())
  const [deletingModels, setDeletingModels] = useState<Set<string>>(new Set())
  const [loadingModels, setLoadingModels] = useState(false)

  // Load default model from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultModel = localStorage.getItem('defaultModel')
      if (defaultModel) {
        setSelectedModel(defaultModel)
      }
    }
  }, [])

  const loadModels = async () => {
    setLoadingModels(true)
    try {
      const availableModels = await api.getModels()

      // Add cloud models (no download required) - using official API names verified 2025-12-30
      const cloudModels: Model[] = [
        // Gemini series - Official Google AI API names
        { name: 'gemini-3-pro', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 3 Pro (Nov 2025)' },
        { name: 'gemini-3-flash', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 3 Flash (Dec 2025)' },
        { name: 'gemini-2.5-pro', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 2.5 Pro' },
        { name: 'gemini-2.5-flash', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 2.5 Flash' },
        { name: 'gemini-2.5-flash-lite', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 2.5 Flash Lite' },
        { name: 'gemini-2.0-flash', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 2.0 Flash' },
        { name: 'gemini-2.0-flash-lite', family: 'gemini', type: 'vision', downloaded: false, description: 'Google Gemini 2.0 Flash Lite' },
        // GPT series - Official OpenAI API names
        { name: 'gpt-5.2', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-5.2 (Dec 2025)' },
        { name: 'gpt-5.1', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-5.1 (Nov 2025)' },
        { name: 'gpt-5', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-5' },
        { name: 'gpt-5-mini', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-5 Mini' },
        { name: 'gpt-5-nano', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-5 Nano' },
        { name: 'gpt-4.1', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4.1 (Apr 2025)' },
        { name: 'gpt-4.1-mini', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4.1 Mini' },
        { name: 'gpt-4.1-nano', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4.1 Nano' },
        { name: 'gpt-4o', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4o' },
        { name: 'gpt-4o-mini', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4o Mini' },
        { name: 'gpt-4-turbo', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4 Turbo' },
        { name: 'gpt-4', family: 'gpt', type: 'vision', downloaded: false, description: 'OpenAI GPT-4' },
        { name: 'gpt-3.5-turbo', family: 'gpt', type: 'text', downloaded: false, description: 'OpenAI GPT-3.5 Turbo' },
        // Claude series - Official Anthropic API names
        { name: 'claude-opus-4.5', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude Opus 4.5 (Nov 2025)' },
        { name: 'claude-sonnet-4.5', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude Sonnet 4.5' },
        { name: 'claude-haiku-4.5', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude Haiku 4.5 (Oct 2025)' },
        { name: 'claude-opus-4.1', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude Opus 4.1 (Aug 2025)' },
        { name: 'claude-3-haiku', family: 'claude', type: 'vision', downloaded: false, description: 'Anthropic Claude 3 Haiku' },
        // Grok series - Official xAI API names
        { name: 'grok-4-1-fast-reasoning', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 4.1 Fast Reasoning (Nov 2025)' },
        { name: 'grok-4-1-fast-non-reasoning', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 4.1 Fast Non-Reasoning' },
        { name: 'grok-4-fast-reasoning', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 4 Fast Reasoning' },
        { name: 'grok-4-fast-non-reasoning', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 4 Fast Non-Reasoning' },
        { name: 'grok-4', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 4' },
        { name: 'grok-code-fast-1', family: 'grok', type: 'text', downloaded: false, description: 'xAI Grok Code Fast' },
        { name: 'grok-3-beta', family: 'grok', type: 'text', downloaded: false, description: 'xAI Grok 3 Beta' },
        { name: 'grok-3-mini-beta', family: 'grok', type: 'text', downloaded: false, description: 'xAI Grok 3 Mini Beta' },
        { name: 'grok-2-image-1212', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 2 Image Generation' },
        { name: 'grok-2-vision', family: 'grok', type: 'vision', downloaded: false, description: 'xAI Grok 2 Vision' },
        { name: 'grok-2', family: 'grok', type: 'text', downloaded: false, description: 'xAI Grok 2' },
      ]

      // Combine available models with cloud models, avoiding duplicates
      const existingModelNames = new Set(availableModels.map(m => m.name))
      const newCloudModels = cloudModels.filter(m => !existingModelNames.has(m.name))
      const allModels = [...availableModels, ...newCloudModels]

      if (allModels.length > 0) {
        setModels(allModels)

        // Priority order:
        // 1. Current selectedModel if valid and downloaded
        // 2. Default model from localStorage if valid and downloaded
        // 3. First downloaded model
        // 4. First model in list
        const currentModel = allModels.find((m) => m.name === selectedModel)
        if (!currentModel || !currentModel.downloaded) {
          const storedDefault = localStorage.getItem('defaultModel')
          const defaultModelObj = storedDefault
            ? allModels.find((m) => m.name === storedDefault && m.downloaded)
            : null

          if (defaultModelObj) {
            setSelectedModel(defaultModelObj.name)
          } else {
            const downloadedModel = allModels.find((m) => m.downloaded)
            if (downloadedModel) {
              setSelectedModel(downloadedModel.name)
            } else if (allModels.length > 0) {
              setSelectedModel(allModels[0].name)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    } finally {
      setLoadingModels(false)
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
    loadingModels,
  }
}

