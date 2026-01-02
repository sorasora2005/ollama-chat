import { useState, useEffect } from 'react'
import { CloudApiKeys } from '../types'
import { api } from '../utils/api'
import { logger } from '../utils/logger'

const STORAGE_KEY = 'cloud_api_keys'

export function useCloudApiKeys(userId: number | null) {
  const [apiKeys, setApiKeys] = useState<CloudApiKeys>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load API keys from backend if userId is available
    if (userId) {
      loadApiKeys()
    } else {
      // Fallback to localStorage if no userId
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          setApiKeys(JSON.parse(stored))
        }
      } catch (error) {
        logger.error('Failed to load API keys:', error)
      }
    }
  }, [userId])

  const loadApiKeys = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const keys = await api.getApiKeys(userId)
      const keysMap: CloudApiKeys = {}
      keys.forEach(key => {
        if (key.provider === 'gemini') keysMap.gemini = '***' // Don't expose actual key
        if (key.provider === 'gpt') keysMap.gpt = '***'
        if (key.provider === 'grok') keysMap.grok = '***'
        if (key.provider === 'claude') keysMap.claude = '***'
      })
      setApiKeys(keysMap)
    } catch (error) {
      logger.error('Failed to load API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveApiKey = async (provider: keyof CloudApiKeys, apiKey: string) => {
    if (!userId) {
      // Fallback to localStorage if no userId
      const newApiKeys = { ...apiKeys, [provider]: apiKey }
      setApiKeys(newApiKeys)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newApiKeys))
      } catch (error) {
        logger.error('Failed to save API key:', error)
      }
      return
    }

    try {
      // Test API key first
      const testResult = await api.testApiKey(userId, provider, apiKey)
      if (!testResult.valid) {
        throw new Error(testResult.message)
      }

      // Save to backend
      await api.saveApiKey(userId, provider, apiKey)
      
      // Reload API keys from backend
      await loadApiKeys()
    } catch (error: any) {
      logger.error('Failed to save API key:', error)
      throw error
    }
  }

  const deleteApiKey = async (provider: keyof CloudApiKeys) => {
    if (!userId) {
      // Fallback to localStorage if no userId
      const newApiKeys = { ...apiKeys }
      delete newApiKeys[provider]
      setApiKeys(newApiKeys)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newApiKeys))
      } catch (error) {
        logger.error('Failed to delete API key:', error)
      }

      // Clear default model if it uses this provider
      const defaultModel = localStorage.getItem('defaultModel')
      if (defaultModel && defaultModel.toLowerCase().startsWith(provider)) {
        localStorage.removeItem('defaultModel')
      }

      return
    }

    try {
      await api.deleteApiKey(userId, provider)

      // Clear default model if it uses this provider
      const defaultModel = localStorage.getItem('defaultModel')
      if (defaultModel && defaultModel.toLowerCase().startsWith(provider)) {
        localStorage.removeItem('defaultModel')
      }

      // Reload API keys from backend
      await loadApiKeys()
    } catch (error) {
      logger.error('Failed to delete API key:', error)
      throw error
    }
  }

  const hasApiKey = async (provider: keyof CloudApiKeys): Promise<boolean> => {
    if (!userId) {
      return !!apiKeys[provider] && apiKeys[provider]!.trim() !== ''
    }

    try {
      const key = await api.getApiKey(userId, provider)
      return !!key
    } catch (error) {
      return false
    }
  }

  return {
    apiKeys,
    saveApiKey,
    deleteApiKey,
    hasApiKey,
    loading,
  }
}

