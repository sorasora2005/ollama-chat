'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2, ChevronDown, Search, Plus, Tag } from 'lucide-react'
import { Model } from '../types'
import { useCloudApiKeys } from '../hooks/useCloudApiKeys'

interface NoteCreateModalProps {
  isOpen: boolean
  models: Model[]
  selectedModel: string
  userId: number | null
  onClose: () => void
  onCreateNote: (model: string, prompt: string, labels: string[]) => Promise<void>
}

export default function NoteCreateModal({
  isOpen,
  models,
  selectedModel,
  userId,
  onClose,
  onCreateNote,
}: NoteCreateModalProps) {
  const [model, setModel] = useState(selectedModel)
  const [prompt, setPrompt] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const modelSelectorRef = useRef<HTMLDivElement>(null)

  const { apiKeys } = useCloudApiKeys(userId)

  useEffect(() => {
    if (isOpen) {
      setModel(selectedModel)
      setPrompt('')
      setLabels([])
      setNewLabel('')
      setShowModelSelector(false)
      setModelSearchQuery('')
    }
  }, [isOpen, selectedModel])

  // Close model selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false)
      }
    }
    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showModelSelector])

  const handleAddLabel = (labelToAdd: string) => {
    const trimmed = labelToAdd.trim()
    if (trimmed && !labels.includes(trimmed)) {
      setLabels([...labels, trimmed])
      setNewLabel('')
    }
  }

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter(l => l !== labelToRemove))
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

  // Get API provider from model family
  const getApiProvider = (family: string): 'gemini' | 'gpt' | 'grok' | 'claude' | null => {
    const familyLower = family.toLowerCase()
    if (familyLower === 'gemini') return 'gemini'
    if (familyLower === 'gpt') return 'gpt'
    if (familyLower === 'grok') return 'grok'
    if (familyLower === 'claude') return 'claude'
    return null
  }

  // Check if a cloud model has API key registered
  const hasCloudApiKey = (model: Model) => {
    if (!isCloudModel(model)) return false
    const apiProvider = model.family ? getApiProvider(model.family) : null
    return apiProvider ? !!apiKeys[apiProvider] : false
  }

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

  // Show both downloaded models AND cloud models with API keys
  const availableModels = filterModels(
    models.filter(m => m && (m.downloaded || hasCloudApiKey(m)))
  )
  const selectedModelInfo = models.find(m => m.name === model)

  const handleCreate = async () => {
    if (!prompt.trim() || !model) return

    setCreating(true)
    try {
      await onCreateNote(model, prompt.trim(), labels)
      onClose()
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#2d2d2d] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black dark:text-white">ノートを作成</h2>
          <button
            onClick={onClose}
            disabled={creating}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative" ref={modelSelectorRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              モデル
            </label>
            <button
              type="button"
              onClick={() => setShowModelSelector(!showModelSelector)}
              disabled={creating}
              className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-left text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-medium">{model}</div>
                {selectedModelInfo && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {selectedModelInfo.description || (selectedModelInfo.family && selectedModelInfo.type && `${selectedModelInfo.family} • ${selectedModelInfo.type === 'vision' ? '画像対応' : 'テキスト'}`)}
                  </div>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
            </button>

            {showModelSelector && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-800 rounded-lg shadow-xl z-50 max-h-64 flex flex-col">
                {/* Search Bar */}
                <div className="p-3 border-b border-gray-300 dark:border-gray-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <input
                      type="text"
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder="モデルを検索..."
                      className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Models List */}
                <div className="flex-1 overflow-y-auto p-3">
                  {availableModels.length === 0 ? (
                    <div className="text-xs text-gray-600 dark:text-gray-500 py-2">
                      {modelSearchQuery.trim() ? '検索結果が見つかりませんでした' : '利用可能なモデルがありません'}
                    </div>
                  ) : (
                    availableModels.map((m) => (
                      <button
                        key={m.name}
                        type="button"
                        onClick={() => {
                          setModel(m.name)
                          setShowModelSelector(false)
                          setModelSearchQuery('')
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors mb-1 ${model === m.name
                          ? 'bg-gray-700 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-black dark:text-gray-300'
                          }`}
                      >
                        <div className="text-sm font-medium">{m.name}</div>
                        <div className={`text-xs mt-0.5 ${model === m.name ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                          {m.description || (m.family && m.type && `${m.family} • ${m.type === 'vision' ? '画像対応' : 'テキスト'}`)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              ラベル（任意）
            </label>
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {labels.map((label, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded flex items-center gap-1 border border-blue-100 dark:border-blue-800"
                >
                  <Tag className="w-3 h-3" />
                  {label}
                  <button
                    onClick={() => handleRemoveLabel(label)}
                    className="ml-1 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {labels.length === 0 && (
                <span className="text-xs text-gray-400 italic py-1">ラベルなし</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddLabel(newLabel)
                  }
                }}
                disabled={creating}
                placeholder="新しいラベル..."
                className="flex-1 px-3 py-1.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                onClick={() => handleAddLabel(newLabel)}
                disabled={!newLabel.trim() || creating}
                className="px-3 py-1.5 bg-gray-100 dark:bg-[#3d3d3d] hover:bg-gray-200 dark:hover:bg-[#4d4d4d] text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {/* Preset Labels */}
            <div className="flex flex-wrap gap-1.5">
              {['物理', 'アニメ', '陸上', '重要', '仕事', '個人'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleAddLabel(preset)}
                  disabled={creating || labels.includes(preset)}
                  className="px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded text-[11px] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              プロンプト（まとめ方の指示）
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={creating}
              placeholder="例: 知識ベースで対応関係を列挙してまとめておいて&#10;例: ここまでの会話の部分で僕が知らなかった部分だけどまとめておいて"
              rows={6}
              className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              この会話の内容を、指定したプロンプトに基づいてまとめます。
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-300 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 bg-gray-200 dark:bg-[#3d3d3d] hover:bg-gray-300 dark:hover:bg-[#4d4d4d] rounded-lg text-black dark:text-white transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={!prompt.trim() || !model || creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            {creating ? '作成中...' : '作成'}
          </button>
        </div>
      </div>
    </div>
  )
}

