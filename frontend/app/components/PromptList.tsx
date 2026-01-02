'use client'

import { Sparkles, Loader2, Star, Search, Tag } from 'lucide-react'
import { PromptTemplate } from '../types'
import PromptTemplateCard from './PromptTemplateCard'

interface PromptListProps {
  templates: PromptTemplate[]
  loading: boolean
  searchQuery?: string
  selectedCategory?: string | null
  onToggleFavorite: (id: number) => void
  onEdit: (template: PromptTemplate) => void
  onDelete: (id: number) => void
  onApply?: (template: PromptTemplate) => void
}

export default function PromptList({
  templates,
  loading,
  searchQuery,
  selectedCategory,
  onToggleFavorite,
  onEdit,
  onDelete,
  onApply,
}: PromptListProps) {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {searchQuery ? (
            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : selectedCategory === '__favorites__' ? (
            <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          ) : selectedCategory ? (
            <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Sparkles className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {searchQuery ? (
              <span>「{searchQuery}」の検索結果</span>
            ) : selectedCategory === '__favorites__' ? (
              'お気に入りのテンプレート'
            ) : selectedCategory ? (
              <span>「{selectedCategory}」のテンプレート</span>
            ) : (
              'プロンプトテンプレート一覧'
            )}
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-600 dark:text-gray-400 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          {searchQuery
            ? '一致するテンプレートが見つかりませんでした'
            : selectedCategory === '__favorites__'
            ? 'お気に入りのテンプレートがありません'
            : selectedCategory
            ? 'このカテゴリのテンプレートがありません'
            : 'テンプレートがありません'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map((template) => (
            <PromptTemplateCard
              key={template.id}
              template={template}
              onToggleFavorite={onToggleFavorite}
              onEdit={onEdit}
              onDelete={onDelete}
              onApply={onApply}
            />
          ))}
        </div>
      )}
    </div>
  )
}
