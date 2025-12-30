'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface ApiKeyManagerProps {
  isOpen: boolean
  provider: 'gemini' | 'gpt' | 'grok' | 'claude' | null
  initialValue?: string
  isUpdating?: boolean
  onClose: () => void
  onSave: (provider: 'gemini' | 'gpt' | 'grok' | 'claude', apiKey: string) => Promise<void>
  getFamilyDisplayName: (family: string) => string
}

/**
 * Reusable API Key Management Modal
 * Handles API key input and registration for cloud model providers
 */
export default function ApiKeyManager({
  isOpen,
  provider,
  initialValue = '',
  isUpdating = false,
  onClose,
  onSave,
  getFamilyDisplayName,
}: ApiKeyManagerProps) {
  const [apiKeyInput, setApiKeyInput] = useState(initialValue)

  if (!isOpen || !provider) return null

  const handleSave = async () => {
    if (apiKeyInput.trim()) {
      await onSave(provider, apiKeyInput.trim())
    }
  }

  const handleClose = () => {
    setApiKeyInput('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2d2d2d] rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black dark:text-white">
            {getFamilyDisplayName(provider)} APIキーを登録
          </h3>
          <button
            onClick={handleClose}
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
            placeholder={`${getFamilyDisplayName(provider)} APIキーを入力`}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            autoFocus
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKeyInput.trim() || isUpdating}
            className="px-4 py-2 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUpdating ? 'テスト中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
