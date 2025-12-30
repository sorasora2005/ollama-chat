'use client'

import { Search, X, Loader2 } from 'lucide-react'
import { ChatSession } from '../types'

interface SearchModalProps {
  isOpen: boolean
  searchQuery: string
  searchResults: ChatSession[]
  searchLoading: boolean
  searchInputRef: React.RefObject<HTMLInputElement>
  onSearchQueryChange: (query: string) => void
  onClose: () => void
  onLoadChatHistory: (sessionId: string) => void
}

export default function SearchModal({
  isOpen,
  searchQuery,
  searchResults,
  searchLoading,
  searchInputRef,
  onSearchQueryChange,
  onClose,
  onLoadChatHistory,
}: SearchModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-start justify-center z-50 pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white dark:bg-[#1a1a1a] rounded-lg w-full max-w-2xl mx-4 shadow-xl border border-gray-300 dark:border-gray-800">
        <div className="p-4 border-b border-gray-300 dark:border-gray-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="チャット履歴を検索..."
            className="flex-1 bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onClose()
              }
            }}
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {searchLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-600 dark:text-gray-400 mx-auto" />
              <p className="text-gray-400 mt-2">検索中...</p>
            </div>
          ) : searchQuery && searchResults.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              検索結果が見つかりませんでした
            </div>
          ) : searchQuery && searchResults.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-gray-400 px-4 py-2">
                検索結果: {searchResults.length}件
              </div>
              {searchResults.map((result) => (
                <button
                  key={result.session_id}
                  onClick={() => onLoadChatHistory(result.session_id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors border-b border-gray-300 dark:border-gray-800 last:border-b-0"
                >
                  <div className="text-sm font-medium text-black dark:text-white mb-1 truncate">
                    {result.title}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {result.snippet}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(result.updated_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              検索キーワードを入力してください
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

