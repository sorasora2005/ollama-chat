import { Model } from '../types'

/**
 * Shared model management utilities
 * Provides common functions for filtering, grouping, and checking models
 */
export function useModelManagement() {
  /**
   * Filter models based on search query
   */
  const filterModels = (modelList: Model[], searchQuery: string) => {
    if (!searchQuery || !searchQuery.trim()) return modelList
    const query = searchQuery.toLowerCase().trim()
    if (!query) return modelList

    return modelList.filter(m => {
      if (!m) return false
      const nameMatch = m.name?.toLowerCase().includes(query) || false
      const descMatch = m.description?.toLowerCase().includes(query) || false
      const familyMatch = m.family?.toLowerCase().includes(query) || false
      const typeMatch = m.type?.toLowerCase().includes(query) || false
      return nameMatch || descMatch || familyMatch || typeMatch
    })
  }

  /**
   * Check if model is a cloud model (no download required)
   */
  const isCloudModel = (model: Model) => {
    if (!model) return false
    const nameLower = model.name?.toLowerCase() || ''
    const familyLower = model.family?.toLowerCase() || ''
    return familyLower === 'gemini' || familyLower === 'gpt' ||
      familyLower === 'claude' || familyLower === 'grok' ||
      nameLower.includes('gemini') || nameLower.includes('gpt-') ||
      nameLower.includes('claude') || nameLower.includes('grok')
  }

  /**
   * Group models by family
   */
  const groupModelsByFamily = (modelList: Model[]) => {
    const grouped: Record<string, Model[]> = {}
    modelList.forEach(model => {
      if (!model) return
      const family = model.family || 'other'
      if (!grouped[family]) {
        grouped[family] = []
      }
      grouped[family].push(model)
    })
    return grouped
  }

  /**
   * Get family display name
   */
  const getFamilyDisplayName = (family: string) => {
    const familyMap: Record<string, string> = {
      'gemini': 'Gemini',
      'gpt': 'GPT',
      'grok': 'Grok',
      'claude': 'Claude',
      'qwen': 'Qwen',
      'llama': 'Llama',
      'gemma': 'Gemma',
      'phi': 'Phi',
      'mistral': 'Mistral',
      'deepseek': 'DeepSeek',
      'other': 'その他',
    }
    return familyMap[family.toLowerCase()] || family
  }

  /**
   * Get API provider from model family
   */
  const getApiProvider = (family: string): 'gemini' | 'gpt' | 'grok' | 'claude' | null => {
    const familyLower = family.toLowerCase()
    if (familyLower === 'gemini') return 'gemini'
    if (familyLower === 'gpt') return 'gpt'
    if (familyLower === 'grok') return 'grok'
    if (familyLower === 'claude') return 'claude'
    return null
  }

  return {
    filterModels,
    isCloudModel,
    groupModelsByFamily,
    getFamilyDisplayName,
    getApiProvider,
  }
}
