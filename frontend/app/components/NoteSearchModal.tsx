'use client'

import { Search, X, Loader2, Tag, Pin, PinOff } from 'lucide-react'
import { Note } from '../types'

interface NoteSearchModalProps {
  isOpen: boolean
  searchQuery: string
  searchResults: Note[]
  searchLoading: boolean
  allLabels: string[]
  pinnedLabels: string[]
  searchInputRef: React.RefObject<HTMLInputElement>
  onSearchQueryChange: (query: string) => void
  onClose: () => void
  onNoteClick: (note: Note) => void
  onLabelClick: (label: string) => void
  onTogglePin: (label: string) => void
}

export default function NoteSearchModal({
  isOpen,
  searchQuery,
  searchResults,
  searchLoading,
  allLabels,
  pinnedLabels,
  searchInputRef,
  onSearchQueryChange,
  onClose,
  onNoteClick,
  onLabelClick,
  onTogglePin,
}: NoteSearchModalProps) {
  if (!isOpen) return null

  const matchingLabels = searchQuery.trim()
    ? allLabels.filter(label => label.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-start justify-center z-50 pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white dark:bg-[#1a1a1a] rounded-lg w-full max-w-2xl mx-4 shadow-xl border border-gray-300 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-300 dark:border-gray-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="ノートやラベルを検索..."
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

        <div className="max-h-[70vh] overflow-y-auto">
          {searchLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-600 dark:text-gray-400 mx-auto" />
              <p className="text-gray-400 mt-2">検索中...</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Labels Section */}
              {(!searchQuery && pinnedLabels.length > 0) && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 rotate-45" /> ピン留めされたラベル
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pinnedLabels.map((label) => (
                      <div key={label} className="group flex items-center bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all shadow-sm hover:shadow-md">
                        <button
                          onClick={() => {
                            onLabelClick(label)
                            onClose()
                          }}
                          className="px-3 py-1.5 text-xs text-black dark:text-white hover:bg-gray-50 dark:hover:bg-[#3d3d3d] transition-colors flex items-center gap-2"
                        >
                          <Tag className="w-3 h-3 text-blue-500" />
                          {label}
                        </button>
                        <button
                          onClick={() => onTogglePin(label)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors border-l border-gray-100 dark:border-gray-800"
                        >
                          <PinOff className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && matchingLabels.length > 0 && (
                <div className="p-3 border-b border-gray-300 dark:border-gray-800">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                    一致するラベル
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchingLabels.map((label) => (
                      <div key={label} className="flex items-center bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            onLabelClick(label)
                            onClose()
                          }}
                          className="px-3 py-1.5 text-xs text-black dark:text-white hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors flex items-center gap-2"
                        >
                          <Tag className="w-3 h-3 text-blue-500" />
                          {label}
                        </button>
                        <button
                          onClick={() => onTogglePin(label)}
                          className={`p-1.5 hover:bg-gray-50 dark:hover:bg-[#2d2d2d] transition-colors border-l border-gray-100 dark:border-gray-800 ${pinnedLabels.includes(label) ? 'text-blue-500' : 'text-gray-400'
                            }`}
                        >
                          {pinnedLabels.includes(label) ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3 rotate-45" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Results */}
              {searchQuery && searchResults.length === 0 && matchingLabels.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  検索結果が見つかりませんでした
                </div>
              ) : searchQuery && searchResults.length > 0 ? (
                <div className="p-2">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 px-2 py-1">
                    ノート ({searchResults.length}件)
                  </div>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        onNoteClick(result)
                        onClose()
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors border-b border-gray-300 dark:border-gray-800 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-black dark:text-white mb-1 truncate">
                        {result.title}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {result.snippet || result.content.substring(0, 100) + '...'}
                      </div>
                      {result.labels && result.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {result.labels.map((label, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] rounded flex items-center gap-1 border border-blue-100 dark:border-blue-800"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {new Date(result.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">
                  ノートやラベルのキーワードを入力してください
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
