'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, ChevronDown, ChevronRight, X, Loader2, Trash2, Key, Check as CheckIcon, Download, Cpu, Star } from 'lucide-react'
import { Model } from '../types'
import { useCloudApiKeys } from '../hooks/useCloudApiKeys'
import { useModels } from '../hooks/useModels'
import { useModelDownload } from '../hooks/useModelDownload'
import { useNotifications } from '../hooks/useNotifications'
import { useModelManagement } from '../hooks/useModelManagement'
import { useDefaultModel } from '../hooks/useDefaultModel'
import DownloadWarningModal from './DownloadWarningModal'
import DownloadSuccessModal from './DownloadSuccessModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import CloudModelFamily from './CloudModelFamily'
import ApiKeyManager from './ApiKeyManager'

interface ModelListProps {
  userId: number | null
  loading: boolean
}

export default function ModelList({ userId, loading }: ModelListProps) {
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())
  const [expandedCloudFamilies, setExpandedCloudFamilies] = useState<Set<string>>(new Set())
  const [expandedDownloaded, setExpandedDownloaded] = useState(true)
  const [expandedAvailable, setExpandedAvailable] = useState(true)
  const [expandedCloud, setExpandedCloud] = useState(true)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'gpt' | 'grok' | 'claude' | null>(null)
  const [updatingApiProvider, setUpdatingApiProvider] = useState<string | null>(null)

  const { apiKeys, saveApiKey, deleteApiKey, hasApiKey, loading: apiKeysLoading } = useCloudApiKeys(userId)
  const { models, loadModels, downloadingModels, setDownloadingModels, deletingModels, setDeletingModels } = useModels()
  const { showNotification } = useNotifications()
  const { filterModels, isCloudModel, groupModelsByFamily, getFamilyDisplayName, getApiProvider } = useModelManagement()
  const { defaultModel, setDefaultModel, clearDefaultModel } = useDefaultModel()

  const {
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
  } = useModelDownload(
    downloadingModels,
    setDownloadingModels,
    deletingModels,
    setDeletingModels,
    loadModels,
    showNotification
  )

  const handleOpenApiKeyModal = (provider: 'gemini' | 'gpt' | 'grok' | 'claude') => {
    setSelectedProvider(provider)
    setShowApiKeyModal(true)
  }

  const handleSaveApiKey = async (provider: 'gemini' | 'gpt' | 'grok' | 'claude', apiKey: string) => {
    setUpdatingApiProvider(provider)
    try {
      await saveApiKey(provider, apiKey)
      setShowApiKeyModal(false)
      setSelectedProvider(null)
      showNotification(`${getFamilyDisplayName(provider)}のAPIキーを登録しました`, 'success')
    } catch (error: any) {
      showNotification(`APIキーの登録に失敗しました: ${error.message || error.response?.data?.detail || '不明なエラー'}`, 'error')
    } finally {
      setUpdatingApiProvider(null)
    }
  }

  const handleDeleteApiKey = async (provider: 'gemini' | 'gpt' | 'grok' | 'claude') => {
    setUpdatingApiProvider(provider)
    try {
      // Check if default model uses this provider before deletion
      const currentDefaultModel = localStorage.getItem('defaultModel')
      const willClearDefault = currentDefaultModel && currentDefaultModel.toLowerCase().startsWith(provider)

      await deleteApiKey(provider)
      showNotification(`${getFamilyDisplayName(provider)}のAPIキーを削除しました`, 'success')

      // Show additional notification if default was cleared
      if (willClearDefault) {
        setTimeout(() => {
          showNotification('デフォルトモデルのAPIキーが削除されたため、デフォルト設定をクリアしました', 'info')
        }, 1000)
      }
    } catch (error: any) {
      showNotification(`APIキーの削除に失敗しました: ${error.message || error.response?.data?.detail || '不明なエラー'}`, 'error')
    } finally {
      setUpdatingApiProvider(null)
    }
  }

  const handleSetDefault = (modelName: string) => {
    if (defaultModel === modelName) {
      clearDefaultModel()
      showNotification('デフォルトモデルをクリアしました', 'success')
    } else {
      setDefaultModel(modelName)
      showNotification(`${modelName}をデフォルトモデルに設定しました`, 'success')
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
  const allAvailable = models.filter(m => m && !m.downloaded && !isCloudModel(m))
  // Show all cloud models (including those without API keys)
  const cloudModels = models.filter(m => {
    if (!m || m.downloaded || !isCloudModel(m)) return false
    return true
  })

  const downloadedModels = filterModels(allDownloaded, modelSearchQuery)
  const availableModels = filterModels(allAvailable, modelSearchQuery)
  const filteredCloudModels = filterModels(cloudModels, modelSearchQuery)

  // Group models by family
  const downloadedGrouped = useMemo(() => groupModelsByFamily(downloadedModels), [downloadedModels])
  const availableGrouped = useMemo(() => groupModelsByFamily(availableModels), [availableModels])
  const cloudGrouped = useMemo(() => groupModelsByFamily(filteredCloudModels), [filteredCloudModels])

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6 flex items-center gap-3">
        <Cpu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-black dark:text-white">モデル管理</h2>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
          <input
            type="text"
            value={modelSearchQuery}
            onChange={(e) => setModelSearchQuery(e.target.value)}
            placeholder="モデルを検索..."
            className="w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
          />
          {modelSearchQuery && (
            <button
              onClick={() => setModelSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-600 dark:text-gray-400 animate-spin" />
        </div>
      ) : (
        <>
      {/* Default Model Display */}
      {defaultModel && (
        <div className="mb-6 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">デフォルトモデル</h3>
          </div>
          <div className="ml-7">
            <div className="text-base font-medium text-black dark:text-white">{defaultModel}</div>
            <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
              {(() => {
                const model = models.find(m => m.name === defaultModel)
                if (model) {
                  return model.description || (model.family && model.type && `${model.family} • ${model.type === 'vision' ? '画像対応' : 'テキスト'}`)
                }
                return ''
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Downloaded Models Section */}
      <div className="mb-6 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setExpandedDownloaded(!expandedDownloaded)}
          className="w-full flex items-center gap-2 mb-3 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-lg px-2 py-1 -mx-2 transition-colors"
        >
          {(expandedDownloaded || !!modelSearchQuery?.trim()) ? (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            ダウンロード済みモデル {downloadedModels.length > 0 && `(${downloadedModels.length})`}
          </div>
        </button>
        {(expandedDownloaded || !!modelSearchQuery?.trim()) && (
          <>
            {downloadedModels.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-500 py-2">
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
                          <div
                            key={model.name}
                            className="mb-1 group"
                          >
                            <div className="px-3 py-2 bg-white dark:bg-[#2d2d2d] rounded-lg flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-black dark:text-gray-300">{model.name}</div>
                                <div className="text-xs mt-0.5 text-gray-600 dark:text-gray-400">
                                  {model.description || (model.family && model.type && `${model.family} • ${model.type === 'vision' ? '画像対応' : 'テキスト'}`)}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSetDefault(model.name)
                                  }}
                                  className={`p-1.5 ${defaultModel === model.name ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} hover:bg-yellow-600/20 rounded transition-opacity`}
                                  title={defaultModel === model.name ? 'デフォルトを解除' : 'デフォルトに設定'}
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      defaultModel === model.name
                                        ? 'fill-yellow-500 text-yellow-500'
                                        : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteModel(model.name)
                                  }}
                                  disabled={deletingModels.has(model.name)}
                                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded transition-opacity disabled:opacity-50"
                                  title="モデルを削除"
                                >
                                  {deletingModels.has(model.name) ? (
                                    <Loader2 className="w-4 h-4 text-red-500 dark:text-red-400 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
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

      {/* Available Models Section */}
      <div className="mb-6 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setExpandedAvailable(!expandedAvailable)}
          className="w-full flex items-center justify-between mb-3 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-lg px-2 py-1 -mx-2 transition-colors"
        >
          <div className="flex items-center gap-2">
            {(expandedAvailable || !!modelSearchQuery?.trim()) ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              ダウンロード可能 {availableModels.length > 0 && `(${availableModels.length})`}
            </div>
          </div>
        </button>
        {(expandedAvailable || !!modelSearchQuery?.trim()) && (
          <>
            {availableModels.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-500 py-2">
                {modelSearchQuery.trim() ? '検索結果が見つかりませんでした' : 'すべてのモデルがダウンロード済みです'}
              </div>
            ) : (
              Object.keys(availableGrouped).sort().map(family => {
                const familyModels = availableGrouped[family]
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
                          <div
                            key={model.name}
                            className="mb-1"
                          >
                            <div className="w-full px-3 py-2 bg-white dark:bg-[#2d2d2d] rounded-lg flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-black dark:text-gray-300">{model.name}</div>
                                <div className="text-xs mt-0.5 text-gray-600 dark:text-gray-400">
                                  {model.description || (model.family && model.type && `${model.family} • ${model.type === 'vision' ? '画像対応' : 'テキスト'}`)}
                                </div>
                              </div>
                              <button
                                onClick={() => downloadModel(model.name)}
                                disabled={downloadingModels.has(model.name)}
                                className="px-3 py-1 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 ml-2"
                              >
                                {downloadingModels.has(model.name) ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>ダウンロード中</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3 h-3" />
                                    <span>ダウンロード</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
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

      {/* Cloud Models Section - Show all cloud models */}
      {Object.keys(cloudGrouped).length > 0 && (
        <div className="mb-6 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setExpandedCloud(!expandedCloud)}
            className="w-full flex items-center justify-between mb-3 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-lg px-2 py-1 -mx-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              {(expandedCloud || !!modelSearchQuery?.trim()) ? (
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                クラウドモデル {filteredCloudModels.length > 0 && `(${filteredCloudModels.length})`}
              </div>
            </div>
          </button>
          {(expandedCloud || !!modelSearchQuery?.trim()) && (
            <>
              {filteredCloudModels.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-500 py-2">
                  {modelSearchQuery.trim() ? '検索結果が見つかりませんでした' : 'クラウドモデルがありません'}
                </div>
              ) : (
                Object.keys(cloudGrouped).filter(f => f.toLowerCase() !== 'other').sort().map(family => {
                  const familyModels = cloudGrouped[family]
                  const expanded = expandedCloudFamilies.has(family) || !!modelSearchQuery?.trim()
                  const apiProvider = getApiProvider(family)

                  return (
                    <CloudModelFamily
                      key={family}
                      family={family}
                      familyModels={familyModels}
                      expanded={expanded}
                      userId={userId}
                      apiProvider={apiProvider}
                      isUpdating={updatingApiProvider === apiProvider}
                      hasApiKey={hasApiKey}
                      getFamilyDisplayName={getFamilyDisplayName}
                      getApiProvider={getApiProvider}
                      defaultModel={defaultModel}
                      onToggleFamily={() => toggleFamily(family, true)}
                      onOpenApiKeyModal={handleOpenApiKeyModal}
                      onDeleteApiKey={handleDeleteApiKey}
                      onSetDefault={handleSetDefault}
                    />
                  )
                })
              )}
            </>
          )}
        </div>
      )}

      {/* API Key Modal */}
      <ApiKeyManager
        isOpen={showApiKeyModal}
        provider={selectedProvider}
        initialValue={selectedProvider ? (apiKeys[selectedProvider] || '') : ''}
        isUpdating={selectedProvider ? updatingApiProvider === selectedProvider : false}
        onClose={() => {
          setShowApiKeyModal(false)
          setSelectedProvider(null)
        }}
        onSave={handleSaveApiKey}
        getFamilyDisplayName={getFamilyDisplayName}
      />

      {/* Modals */}
      <DownloadWarningModal
        isOpen={showDownloadWarning}
        modelName={pendingDownloadModel}
        sizeRange={pendingDownloadSize}
        onConfirm={handleConfirmDownload}
        onCancel={handleCancelDownload}
      />

      <DownloadSuccessModal
        isOpen={showDownloadSuccess}
        modelName={completedDownloadModel}
        onClose={() => {
          setShowDownloadSuccess(false)
          setCompletedDownloadModel(null)
        }}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        modelName={pendingDeleteModel}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      </>
      )}
    </div>
  )
}

