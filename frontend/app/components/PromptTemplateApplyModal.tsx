'use client'

import { useState, useEffect } from 'react'
import { Sparkles, X, Loader2, Star, Tag, Hash } from 'lucide-react'
import { PromptTemplate } from '../types'

interface PromptTemplateApplyModalProps {
  isOpen: boolean
  templates: PromptTemplate[]
  favoriteTemplates: PromptTemplate[]
  categories: string[]
  loading: boolean
  onClose: () => void
  onApply: (template: PromptTemplate) => void
}

export default function PromptTemplateApplyModal({
  isOpen,
  templates,
  favoriteTemplates,
  categories,
  loading,
  onClose,
  onApply,
}: PromptTemplateApplyModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSelectedCategory(null)
      setShowFavoritesOnly(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Filter templates
  let filteredTemplates = showFavoritesOnly ? favoriteTemplates : templates

  // Apply category filter
  if (selectedCategory) {
    filteredTemplates = filteredTemplates.filter(t =>
      t.categories && t.categories.includes(selectedCategory)
    )
  }

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    filteredTemplates = filteredTemplates.filter(t =>
      t.name.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query)) ||
      t.prompt_text.toLowerCase().includes(query)
    )
  }

  // Sort: favorites first, then by use count
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) {
      return b.is_favorite - a.is_favorite
    }
    return b.use_count - a.use_count
  })

  const handleApplyTemplate = (template: PromptTemplate) => {
    onApply(template)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white dark:bg-[#1a1a1a] rounded-lg w-full max-w-3xl mx-4 shadow-xl border border-gray-300 dark:border-gray-800">
        {/* Header with Search */}
        <div className="p-4 border-b border-gray-300 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="テンプレートを検索..."
              className="flex-1 bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose()
                }
              }}
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => {
                setShowFavoritesOnly(false)
                setSelectedCategory(null)
              }}
              className={`px-2 py-1 text-xs rounded-lg whitespace-nowrap transition-all border ${
                !showFavoritesOnly && !selectedCategory
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-[#2d2d2d] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              すべて
            </button>

            <button
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly)
                setSelectedCategory(null)
              }}
              className={`px-2 py-1 text-xs rounded-lg whitespace-nowrap transition-all border flex items-center gap-1 ${
                showFavoritesOnly
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400'
                  : 'bg-white dark:bg-[#2d2d2d] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Star className="w-3 h-3" />
              お気に入り
            </button>

            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category === selectedCategory ? null : category)
                  setShowFavoritesOnly(false)
                }}
                className={`px-2 py-1 text-xs rounded-lg whitespace-nowrap transition-all border flex items-center gap-1 ${
                  selectedCategory === category
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white dark:bg-[#2d2d2d] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Tag className="w-3 h-3" />
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-600 dark:text-gray-400 mx-auto" />
              <p className="text-gray-400 mt-2">読み込み中...</p>
            </div>
          ) : sortedTemplates.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {searchQuery
                ? '一致するテンプレートが見つかりませんでした'
                : showFavoritesOnly
                ? 'お気に入りのテンプレートがありません'
                : selectedCategory
                ? 'このカテゴリのテンプレートがありません'
                : 'テンプレートがありません'}
            </div>
          ) : (
            <div className="p-2">
              <div className="text-xs text-gray-400 px-4 py-2">
                {sortedTemplates.length}件のテンプレート
              </div>
              {sortedTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleApplyTemplate(template)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors border-b border-gray-300 dark:border-gray-800 last:border-b-0 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium text-black dark:text-white truncate">
                          {template.name}
                        </div>
                        {template.is_favorite === 1 && (
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>

                      {template.description && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                          {template.description}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {template.categories && template.categories.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {template.categories.slice(0, 3).map((cat, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] rounded"
                              >
                                {cat}
                              </span>
                            ))}
                            {template.categories.length > 3 && (
                              <span className="text-[10px] text-gray-400">
                                +{template.categories.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Hash className="w-3 h-3" />
                          {template.use_count}回使用
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      適用 →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-300 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] border border-gray-300 dark:border-gray-700">
              Esc
            </kbd>{' '}
            で閉じる
          </p>
        </div>
      </div>
    </div>
  )
}
