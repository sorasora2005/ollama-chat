'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, ChevronDown, ChevronRight, X, Key, Check as CheckIcon, Loader2 } from 'lucide-react'
import { Model } from '../types'
import { useCloudApiKeys } from '../hooks/useCloudApiKeys'

interface ModelSelectorProps {
  isOpen: boolean
  selectedModel: string
  models: Model[]
  modelSearchQuery: string
  downloadingModels: Set<string>
  userId: number | null
  onModelSearchChange: (query: string) => void
  onModelChange: (modelName: string) => void
  onDownloadModel: (modelName: string) => void
  onClose: () => void
}

export default function ModelSelector({
  isOpen,
  selectedModel,
  models,
  modelSearchQuery,
  downloadingModels,
  userId,
  onModelSearchChange,
  onModelChange,
  onDownloadModel,
  onClose,
}: ModelSelectorProps) {
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())
  const [expandedCloudFamilies, setExpandedCloudFamilies] = useState<Set<string>>(new Set())
  const [expandedDownloaded, setExpandedDownloaded] = useState(true)
  const [expandedCloud, setExpandedCloud] = useState(true)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'gpt' | 'grok' | 'claude' | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [testingApiKey, setTestingApiKey] = useState(false)
  const [apiKeyStates, setApiKeyStates] = useState<Record<string, boolean>>({})
  
  const { apiKeys, saveApiKey, deleteApiKey, hasApiKey, loading: apiKeysLoading } = useCloudApiKeys(userId)

  const filterModels = (modelList: Model[]) => {
    if (!modelSearchQuery || !modelSearchQuery.trim()) return modelList
    const query = modelSearchQuery.toLowerCase().trim()
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

  // Check if model is a cloud model (no download required)
  const isCloudModel = (model: Model) => {
    if (!model) return false
    const nameLower = model.name?.toLowerCase() || ''
    const familyLower = model.family?.toLowerCase() || ''
    return familyLower === 'gemini' || familyLower === 'gpt' || 
           familyLower === 'claude' || familyLower === 'grok' ||
           nameLower.includes('gemini') || nameLower.includes('gpt-') ||
           nameLower.includes('claude') || nameLower.includes('grok')
  }

  // Group models by family
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

  // Get family display name
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

  // Get API provider from model family
  const getApiProvider = (family: string): 'gemini' | 'gpt' | 'grok' | 'claude' | null => {
    const familyLower = family.toLowerCase()
    if (familyLower === 'gemini') return 'gemini'
    if (familyLower === 'gpt') return 'gpt'
    if (familyLower === 'grok') return 'grok'
    if (familyLower === 'claude') return 'claude'
    return null
  }

  // Load API key states when component mounts, userId changes, or apiKeys change
  useEffect(() => {
    if (!userId) return
    
    const loadApiKeyStates = async () => {
      const providers: Array<'gemini' | 'gpt' | 'grok' | 'claude'> = ['gemini', 'gpt', 'grok', 'claude']
      const states: Record<string, boolean> = {}
      
      for (const provider of providers) {
        try {
          states[provider] = await hasApiKey(provider)
        } catch (error) {
          states[provider] = false
        }
      }
      
      setApiKeyStates(states)
    }
    
    loadApiKeyStates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, apiKeys, apiKeysLoading])

  const handleOpenApiKeyModal = (provider: 'gemini' | 'gpt' | 'grok' | 'claude') => {
    setSelectedProvider(provider)
    setApiKeyInput('')
    setShowApiKeyModal(true)
  }

  const handleSaveApiKey = async () => {
    if (selectedProvider && apiKeyInput.trim()) {
      setTestingApiKey(true)
      try {
        await saveApiKey(selectedProvider, apiKeyInput.trim())
        setApiKeyStates(prev => ({ ...prev, [selectedProvider]: true }))
        setShowApiKeyModal(false)
        setSelectedProvider(null)
        setApiKeyInput('')
      } catch (error: any) {
        console.error('Failed to save API key:', error)
        // Error notification will be handled by useCloudApiKeys hook
      } finally {
        setTestingApiKey(false)
      }
    }
  }

  const handleDeleteApiKey = async (provider: 'gemini' | 'gpt' | 'grok' | 'claude') => {
    try {
      await deleteApiKey(provider)
      setApiKeyStates(prev => ({ ...prev, [provider]: false }))
    } catch (error: any) {
      console.error('Failed to delete API key:', error)
    }
  }

  const toggleFamily = (family: string, isCloud: boolean) => {
    if (isCloud) {
      setExpandedCloudFamilies(prev => {
        const newSet = new Set(prev)
        if (newSet.has(family)) {
          newSet.delete(family)
        } else {
          newSet.add(family)
        }
        return newSet
      })
    } else {
      setExpandedFamilies(prev => {
        const newSet = new Set(prev)
        if (newSet.has(family)) {
          newSet.delete(family)
        } else {
          newSet.add(family)
        }
        return newSet
      })
    }
  }

  const allDownloaded = models.filter(m => m && m.downloaded)
  const cloudModels = models.filter(m => m && !m.downloaded && isCloudModel(m))
  
  const downloadedModels = filterModels(allDownloaded)
  const filteredCloudModels = filterModels(cloudModels)

  // Group models by family
  const downloadedGrouped = useMemo(() => groupModelsByFamily(downloadedModels), [downloadedModels])
  const cloudGrouped = useMemo(() => groupModelsByFamily(filteredCloudModels), [filteredCloudModels])

  // Count only available cloud models (those with API keys registered)
  const availableCloudModelsCount = useMemo(() => {
    return Object.keys(cloudGrouped).filter(f => {
      const familyLower = f.toLowerCase()
      if (familyLower === 'other') return false
      const apiProvider = getApiProvider(f)
      return apiProvider ? apiKeyStates[apiProvider] === true : false
    }).reduce((count, family) => {
      return count + cloudGrouped[family].length
    }, 0)
  }, [cloudGrouped, apiKeyStates])

  if (!isOpen) return null


  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-800 rounded-lg shadow-xl z-50 max-h-[60vh] flex flex-col">
      {/* Search Bar */}
      <div className="p-3 border-b border-gray-300 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" />
          <input
            type="text"
            value={modelSearchQuery}
            onChange={(e) => onModelSearchChange(e.target.value)}
            placeholder="モデルを検索..."
            className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            autoFocus
          />
          {modelSearchQuery && (
            <button
              onClick={() => onModelSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Models List */}
      <div className="flex-1 overflow-y-auto">
        {/* Downloaded Models Section */}
        <div className="p-3 border-b border-gray-300 dark:border-gray-800">
          <button
            onClick={() => setExpandedDownloaded(!expandedDownloaded)}
            className="w-full flex items-center gap-2 mb-2 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-lg px-2 py-1 -mx-2 transition-colors"
          >
            {(expandedDownloaded || !!modelSearchQuery?.trim()) ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              ダウンロード済み {downloadedModels.length > 0 && `(${downloadedModels.length})`}
            </div>
          </button>
          {(expandedDownloaded || !!modelSearchQuery?.trim()) && (
            <>
              {downloadedModels.length === 0 ? (
                <div className="text-xs text-gray-600 dark:text-gray-500 py-2">
                  {modelSearchQuery.trim() ? '検索結果が見つかりませんでした' : 'ダウンロード済みのモデルがありません'}
                </div>
              ) : (
                Object.keys(downloadedGrouped).sort().map(family => {
                  const familyModels = downloadedGrouped[family]
                  const expanded = expandedFamilies.has(family) || !!modelSearchQuery?.trim()

                  return (
                    <div key={family} className="mb-2">
                      <button
                        onClick={() => toggleFamily(family, false)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          )}
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {getFamilyDisplayName(family)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            ({familyModels.length})
                          </span>
                        </div>
                      </button>
                      {expanded && (
                        <div className="ml-4 mt-1">
                          {familyModels.map((model) => (
                            <button
                              key={model.name}
                              onClick={() => onModelChange(model.name)}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between mb-1 ${
                                selectedModel === model.name
                                  ? 'bg-gray-700 text-white'
                                  : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-black dark:text-gray-300'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="text-sm font-medium">{model.name}</div>
                                <div className={`text-xs mt-0.5 ${selectedModel === model.name ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                  {model.description || (model.family && model.type && `${model.family} • ${model.type === 'vision' ? '画像対応' : 'テキスト'}`)}
                                </div>
                              </div>
                              <span className="px-2 py-1 bg-green-600/20 text-green-600 dark:text-green-400 text-xs rounded whitespace-nowrap ml-2">
                                利用可能
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </>
          )}
        </div>

        {/* Cloud Models Section */}
        <div className="p-3">
          <button
            onClick={() => setExpandedCloud(!expandedCloud)}
            className="w-full flex items-center justify-between mb-2 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
          >
            <div className="flex items-center gap-2">
              {(expandedCloud || !!modelSearchQuery?.trim()) ? (
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                クラウドモデル {availableCloudModelsCount > 0 && `(${availableCloudModelsCount})`}
              </div>
            </div>
          </button>
          {(expandedCloud || !!modelSearchQuery?.trim()) && (
            <>
              {filteredCloudModels.length === 0 ? (
                <div className="text-xs text-gray-600 dark:text-gray-500 py-2">
                  {modelSearchQuery.trim() ? '検索結果が見つかりませんでした' : 'クラウドモデルがありません'}
                </div>
              ) : (
                Object.keys(cloudGrouped).filter(f => {
                  const familyLower = f.toLowerCase()
                  if (familyLower === 'other') return false
                  const apiProvider = getApiProvider(f)
                  // Only show families with registered API keys
                  return apiProvider ? apiKeyStates[apiProvider] === true : false
                }).sort().map(family => {
                  const familyModels = cloudGrouped[family]
                  const expanded = expandedCloudFamilies.has(family) || !!modelSearchQuery?.trim()

                  const apiProvider = getApiProvider(family)
                  const hasApi = apiProvider ? apiKeyStates[apiProvider] === true : false

                  return (
                    <div key={family} className="mb-2">
                      <div className="flex items-center justify-between px-3 py-2">
                        <button
                          onClick={() => toggleFamily(family, true)}
                          className="flex-1 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-lg px-2 py-1 -mx-2 transition-colors"
                        >
                          {expanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          )}
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {getFamilyDisplayName(family)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            ({familyModels.length})
                          </span>
                        </button>
                        {apiProvider && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (hasApi) {
                                handleDeleteApiKey(apiProvider)
                              } else {
                                handleOpenApiKeyModal(apiProvider)
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                              hasApi
                                ? 'bg-green-600/20 text-green-600 dark:text-green-400 hover:bg-green-600/30'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                            title={hasApi ? 'APIキーを削除' : 'APIキーを登録'}
                          >
                            {hasApi ? (
                              <>
                                <CheckIcon className="w-3 h-3" />
                                <span>登録済み</span>
                              </>
                            ) : (
                              <>
                                <Key className="w-3 h-3" />
                                <span>登録</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {expanded && (
                        <div className="ml-4 mt-1">
                          {familyModels.map((model) => {
                            const modelApiProvider = model.family ? getApiProvider(model.family) : null
                            const modelHasApi = modelApiProvider ? apiKeyStates[modelApiProvider] === true : false

                            return (
                              <div
                                key={model.name}
                                className="mb-1"
                              >
                                <button
                                  onClick={() => {
                                    if (modelHasApi) {
                                      onModelChange(model.name)
                                    } else if (modelApiProvider) {
                                      handleOpenApiKeyModal(modelApiProvider)
                                    }
                                  }}
                                  disabled={!modelHasApi && !!modelApiProvider}
                                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                                    selectedModel === model.name
                                      ? 'bg-gray-700 text-white'
                                      : modelHasApi
                                        ? 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-black dark:text-gray-300'
                                        : 'opacity-70 cursor-not-allowed text-gray-500 dark:text-gray-500'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{model.name}</div>
                                    <div className={`text-xs mt-0.5 ${selectedModel === model.name ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                      {model.description || (model.family && model.type && `${model.family} • ${model.type === 'vision' ? '画像対応' : 'テキスト'}`)}
                                    </div>
                                  </div>
                                  {modelHasApi ? (
                                    <span className="px-2 py-1 bg-green-600/20 text-green-600 dark:text-green-400 text-xs rounded whitespace-nowrap ml-2">
                                      利用可能
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded whitespace-nowrap ml-2">
                                      APIキー未登録
                                    </span>
                                  )}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white">
                {getFamilyDisplayName(selectedProvider)} APIキーを登録
              </h3>
              <button
                onClick={() => {
                  setShowApiKeyModal(false)
                  setSelectedProvider(null)
                  setApiKeyInput('')
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                APIキー
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={`${getFamilyDisplayName(selectedProvider)} APIキーを入力`}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowApiKeyModal(false)
                  setSelectedProvider(null)
                  setApiKeyInput('')
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim() || testingApiKey}
                className="px-4 py-2 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {testingApiKey && <Loader2 className="w-4 h-4 animate-spin" />}
                {testingApiKey ? 'テスト中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

