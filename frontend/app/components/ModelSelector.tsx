'use client'

import { Search, ChevronDown, X, Loader2, Trash2 } from 'lucide-react'
import { Model } from '../types'

interface ModelSelectorProps {
  isOpen: boolean
  selectedModel: string
  models: Model[]
  modelSearchQuery: string
  downloadingModels: Set<string>
  deletingModels: Set<string>
  onModelSearchChange: (query: string) => void
  onModelChange: (modelName: string) => void
  onDownloadModel: (modelName: string) => void
  onDeleteModel: (modelName: string) => void
  onClose: () => void
}

export default function ModelSelector({
  isOpen,
  selectedModel,
  models,
  modelSearchQuery,
  downloadingModels,
  deletingModels,
  onModelSearchChange,
  onModelChange,
  onDownloadModel,
  onDeleteModel,
  onClose,
}: ModelSelectorProps) {
  if (!isOpen) return null

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

  const allDownloaded = models.filter(m => m && m.downloaded)
  const allAvailable = models.filter(m => m && !m.downloaded)
  const downloadedModels = filterModels(allDownloaded)
  const availableModels = filterModels(allAvailable)

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
        <div className="p-3 border-b border-gray-300 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
            ダウンロード済み {downloadedModels.length > 0 && `(${downloadedModels.length})`}
          </div>
          {downloadedModels.length === 0 ? (
            <div className="text-xs text-gray-600 dark:text-gray-500 py-2">
              {modelSearchQuery.trim() ? '検索結果が見つかりませんでした' : 'ダウンロード済みのモデルがありません'}
            </div>
          ) : (
            downloadedModels.map((model) => (
              <div
                key={model.name}
                className="group relative mb-1"
              >
                <button
                  onClick={() => onModelChange(model.name)}
                  className={`w-full text-left px-3 py-2 pr-10 rounded-lg transition-colors ${
                    selectedModel === model.name
                      ? 'bg-gray-700 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-black dark:text-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{model.name}</div>
                  <div className={`text-xs mt-0.5 ${selectedModel === model.name ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                    {model.description || (model.family && model.type && `${model.family} • ${model.type === 'vision' ? '画像対応' : 'テキスト'}`)}
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteModel(model.name)
                  }}
                  disabled={deletingModels.has(model.name)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded transition-opacity disabled:opacity-50"
                  title="モデルを削除"
                >
                  {deletingModels.has(model.name) ? (
                    <Loader2 className="w-4 h-4 text-red-500 dark:text-red-400 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
        <div className="p-3">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
            ダウンロード可能 {availableModels.length > 0 && `(${availableModels.length})`}
          </div>
          {availableModels.length === 0 ? (
            <div className="text-xs text-gray-600 dark:text-gray-500 py-2">
              {modelSearchQuery.trim() ? '検索結果が見つかりませんでした' : 'すべてのモデルがダウンロード済みです'}
            </div>
          ) : (
            availableModels.map((model) => (
              <div
                key={model.name}
                className="w-full px-3 py-2 rounded-lg mb-1 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="text-sm text-black dark:text-gray-300">{model.name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-500 mt-0.5">
                    {model.description || (model.family && model.type && `${model.family} • ${model.type === 'vision' ? '画像対応' : 'テキスト'}`)}
                  </div>
                </div>
                <button
                  onClick={() => onDownloadModel(model.name)}
                  disabled={downloadingModels.has(model.name)}
                  className="px-3 py-1 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  {downloadingModels.has(model.name) ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>ダウンロード中</span>
                    </>
                  ) : (
                    <span>ダウンロード</span>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

