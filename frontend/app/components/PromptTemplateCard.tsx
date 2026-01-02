'use client'

import { Star, Edit2, Trash2, Play, Tag, Hash } from 'lucide-react'
import { PromptTemplate } from '../types'

interface PromptTemplateCardProps {
  template: PromptTemplate
  onToggleFavorite: (id: number) => void
  onEdit: (template: PromptTemplate) => void
  onDelete: (id: number) => void
  onApply?: (template: PromptTemplate) => void
}

export default function PromptTemplateCard({
  template,
  onToggleFavorite,
  onEdit,
  onDelete,
  onApply,
}: PromptTemplateCardProps) {
  return (
    <div className="bg-white dark:bg-[#2d2d2d] rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-md group">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-black dark:text-white truncate">
            {template.name}
          </h3>
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => onToggleFavorite(template.id)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title={template.is_favorite === 1 ? 'お気に入りを解除' : 'お気に入りに追加'}
        >
          <Star
            className={`w-5 h-5 ${
              template.is_favorite === 1
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          />
        </button>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {template.description}
        </p>
      )}

      {/* Prompt Preview */}
      <div className="mb-3 p-2 bg-gray-50 dark:bg-[#1a1a1a] rounded border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 font-mono">
          {template.prompt_text}
        </p>
      </div>

      {/* Categories */}
      {template.categories && template.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {template.categories.slice(0, 3).map((category, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded border border-blue-100 dark:border-blue-800"
            >
              <Tag className="w-3 h-3" />
              {category}
            </span>
          ))}
          {template.categories.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
              +{template.categories.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        {/* Use Count */}
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Hash className="w-3 h-3" />
          <span>{template.use_count}回使用</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onApply && (
            <button
              onClick={() => onApply(template)}
              className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded transition-colors"
              title="適用"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(template)}
            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded transition-colors"
            title="編集"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
            title="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
