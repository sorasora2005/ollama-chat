'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X, Search } from 'lucide-react'
import { Model } from '../types'

interface MultiModelSelectorProps {
  isOpen: boolean
  selectedModels: string[]
  models: Model[]
  onModelsChange: (models: string[]) => void
  onClose: () => void
  maxModels?: number
}

export default function MultiModelSelector({
  isOpen,
  selectedModels,
  models,
  onModelsChange,
  onClose,
  maxModels = 4,
}: MultiModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const toggleModel = (modelName: string) => {
    if (selectedModels.includes(modelName)) {
      onModelsChange(selectedModels.filter(m => m !== modelName))
    } else if (selectedModels.length < maxModels) {
      onModelsChange([...selectedModels, modelName])
    }
  }

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Separate downloaded Ollama models from cloud API models
  const downloadedModels = filteredModels.filter(m => m.downloaded)

  // Cloud models are API-only models (Gemini, GPT, Claude, Grok families)
  const cloudFamilies = ['gemini', 'gpt', 'claude', 'grok']
  const cloudModels = filteredModels.filter(m =>
    !m.downloaded && cloudFamilies.includes(m.family || '')
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-[#1a1a1a] rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-300 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              比較するモデルを選択
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              最大{maxModels}個まで選択可能 ({selectedModels.length}/{maxModels})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-300 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="モデルを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white"
            />
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Downloaded Models */}
          {downloadedModels.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                ダウンロード済みモデル
              </h4>
              <div className="space-y-1">
                {downloadedModels.map(model => (
                  <button
                    key={model.name}
                    onClick={() => toggleModel(model.name)}
                    disabled={!selectedModels.includes(model.name) && selectedModels.length >= maxModels}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      selectedModels.includes(model.name)
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-black dark:text-gray-300'
                    } ${
                      !selectedModels.includes(model.name) && selectedModels.length >= maxModels
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <span className="text-sm truncate">{model.name}</span>
                    {selectedModels.includes(model.name) && (
                      <Check className="w-4 h-4 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cloud Models */}
          {cloudModels.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                クラウドモデル
              </h4>
              <div className="space-y-1">
                {cloudModels.map(model => (
                  <button
                    key={model.name}
                    onClick={() => toggleModel(model.name)}
                    disabled={!selectedModels.includes(model.name) && selectedModels.length >= maxModels}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      selectedModels.includes(model.name)
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-black dark:text-gray-300'
                    } ${
                      !selectedModels.includes(model.name) && selectedModels.length >= maxModels
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <span className="text-sm truncate">{model.name}</span>
                    {selectedModels.includes(model.name) && (
                      <Check className="w-4 h-4 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredModels.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              モデルが見つかりません
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-300 dark:border-gray-800 flex justify-between items-center">
          <button
            onClick={() => onModelsChange([])}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            選択をクリア
          </button>
          <button
            onClick={onClose}
            disabled={selectedModels.length < 2}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedModels.length < 2
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            完了 ({selectedModels.length}個選択)
          </button>
        </div>
      </div>
    </div>
  )
}
