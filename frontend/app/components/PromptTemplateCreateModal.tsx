'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Tag } from 'lucide-react'

interface PromptTemplateCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: {
    name: string
    description?: string
    prompt_text: string
    categories?: string[]
    is_system_prompt?: number
  }) => Promise<void>
}

export default function PromptTemplateCreateModal({
  isOpen,
  onClose,
  onCreate,
}: PromptTemplateCreateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [promptText, setPromptText] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [creating, setCreating] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Preset categories
  const presetCategories = ['コーディング', '文章作成', '翻訳', '要約', '分析', 'ブレインストーミング']

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setDescription('')
      setPromptText('')
      setCategories([])
      setNewCategory('')
      setErrors([])
    }
  }, [isOpen])

  const validateForm = (): boolean => {
    const newErrors: string[] = []

    if (!name.trim()) {
      newErrors.push('テンプレート名を入力してください')
    } else if (name.length > 100) {
      newErrors.push('テンプレート名は100文字以内で入力してください')
    }

    if (!promptText.trim()) {
      newErrors.push('プロンプトを入力してください')
    } else if (promptText.length > 10000) {
      newErrors.push('プロンプトは10,000文字以内で入力してください')
    }

    if (categories.length > 20) {
      newErrors.push('カテゴリは20個以内で設定してください')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleAddCategory = (categoryToAdd: string) => {
    const trimmed = categoryToAdd.trim()
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed])
      setNewCategory('')
    }
  }

  const handleRemoveCategory = (categoryToRemove: string) => {
    setCategories(categories.filter(c => c !== categoryToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setCreating(true)
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        prompt_text: promptText.trim(),
        categories: categories.length > 0 ? categories : undefined,
        is_system_prompt: 0,
      })
      onClose()
    } catch (error) {
      console.error('Failed to create template:', error)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2d2d2d] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-300 dark:border-gray-600">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#2d2d2d] border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black dark:text-white">
            プロンプトテンプレート作成
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              テンプレート名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: コード説明用プロンプト"
              maxLength={100}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {name.length}/100
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              説明（オプション）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このテンプレートの説明を入力..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
          </div>

          {/* Prompt Text */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-1">
              プロンプト <span className="text-red-500">*</span>
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="プロンプトテキストを入力..."
              rows={8}
              maxLength={10000}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none font-mono text-sm"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {promptText.length}/10,000
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">
              カテゴリ（オプション）
            </label>

            {/* Selected Categories */}
            <div className="flex flex-wrap gap-2 min-h-[32px] mb-2">
              {categories.map((category, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded border border-blue-100 dark:border-blue-800"
                >
                  <Tag className="w-3 h-3" />
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category)}
                    className="ml-1 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Category Input */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCategory(newCategory)
                  }
                }}
                placeholder="カテゴリを追加..."
                className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleAddCategory(newCategory)}
                disabled={!newCategory.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Preset Categories */}
            <div className="flex flex-wrap gap-1.5">
              {presetCategories.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddCategory(preset)}
                  disabled={categories.includes(preset)}
                  className="px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-[#3d3d3d] hover:bg-gray-300 dark:hover:bg-[#4d4d4d] rounded-lg text-black dark:text-white transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
