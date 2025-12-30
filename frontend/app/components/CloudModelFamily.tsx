'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Key, Check as CheckIcon, Loader2, Trash2, Edit } from 'lucide-react'
import { Model } from '../types'

interface CloudModelItemProps {
  model: Model
  userId: number | null
  checkHasApiKey: (provider: 'gemini' | 'gpt' | 'grok' | 'claude') => Promise<boolean>
  getApiProvider: (family: string) => 'gemini' | 'gpt' | 'grok' | 'claude' | null
}

function CloudModelItem({ model, userId, checkHasApiKey, getApiProvider }: CloudModelItemProps) {
  const [modelHasApi, setModelHasApi] = useState(false)
  const [modelLoading, setModelLoading] = useState(true)
  const modelApiProvider = model.family ? getApiProvider(model.family) : null

  useEffect(() => {
    if (modelApiProvider && userId) {
      setModelLoading(true)
      checkHasApiKey(modelApiProvider).then(setModelHasApi).finally(() => setModelLoading(false))
    } else {
      setModelHasApi(false)
      setModelLoading(false)
    }
  }, [modelApiProvider, userId, checkHasApiKey])

  return (
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
        {modelLoading ? (
          <span className="px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded whitespace-nowrap ml-2">
            確認中...
          </span>
        ) : modelHasApi ? (
          <span className="px-2 py-1 bg-green-600/20 text-green-600 dark:text-green-400 text-xs rounded whitespace-nowrap ml-2">
            利用可能
          </span>
        ) : (
          <span className="px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded whitespace-nowrap ml-2">
            APIキー未登録
          </span>
        )}
      </div>
    </div>
  )
}

interface CloudModelFamilyProps {
  family: string
  familyModels: Model[]
  expanded: boolean
  userId: number | null
  apiProvider: 'gemini' | 'gpt' | 'grok' | 'claude' | null
  isUpdating: boolean
  hasApiKey: (provider: 'gemini' | 'gpt' | 'grok' | 'claude') => Promise<boolean>
  getFamilyDisplayName: (family: string) => string
  getApiProvider: (family: string) => 'gemini' | 'gpt' | 'grok' | 'claude' | null
  onToggleFamily: () => void
  onOpenApiKeyModal: (provider: 'gemini' | 'gpt' | 'grok' | 'claude') => void
  onDeleteApiKey: (provider: 'gemini' | 'gpt' | 'grok' | 'claude') => void
}

export default function CloudModelFamily({
  family,
  familyModels,
  expanded,
  userId,
  apiProvider,
  isUpdating,
  hasApiKey: checkHasApiKey,
  getFamilyDisplayName,
  getApiProvider,
  onToggleFamily,
  onOpenApiKeyModal,
  onDeleteApiKey,
}: CloudModelFamilyProps) {
  const [hasApi, setHasApi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [wantsToDelete, setWantsToDelete] = useState(false)

  const refreshHasApi = () => {
    if (apiProvider && userId) {
      setLoading(true)
      checkHasApiKey(apiProvider).then(setHasApi).finally(() => setLoading(false))
    } else {
      setHasApi(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshHasApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiProvider, userId])

  useEffect(() => {
    if (!isUpdating) {
      refreshHasApi()
      setWantsToDelete(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpdating])

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!apiProvider) return

    if (wantsToDelete) {
      onDeleteApiKey(apiProvider)
    } else {
      setWantsToDelete(true)
    }
  }

  return (
    <div
      className="mb-2"
      onMouseLeave={() => setWantsToDelete(false)}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={onToggleFamily}
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
          <div className="flex items-center gap-2 ml-2">
            {loading || isUpdating ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            ) : hasApi ? (
              <>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
                  登録済み
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenApiKeyModal(apiProvider)
                  }}
                  className="px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  title="APIキーを変更"
                >
                  <Edit className="w-3 h-3" />
                  <span>変更</span>
                </button>
                <button
                  onClick={handleDeleteClick}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${wantsToDelete
                    ? 'bg-red-600 text-white'
                    : 'bg-red-600/20 text-red-600 dark:text-red-400 hover:bg-red-600/30'
                    }`}
                  title="APIキーを削除"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{wantsToDelete ? '確認' : '削除'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenApiKeyModal(apiProvider)
                }}
                className="px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="APIキーを登録"
                disabled={['claude', 'gpt', 'grok'].includes(apiProvider || '')}
              >
                <Key className="w-3 h-3" />
                <span>登録</span>
              </button>
            )}
          </div>
        )}
      </div>
      {expanded && (
        <div className="ml-4 mt-1">
          {familyModels.map((model) => (
            <CloudModelItem
              key={model.name}
              model={model}
              userId={userId}
              checkHasApiKey={checkHasApiKey}
              getApiProvider={getApiProvider}
            />
          ))}
        </div>
      )}
    </div>
  )
}
