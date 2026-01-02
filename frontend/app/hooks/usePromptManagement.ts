import { useState, useEffect, useRef } from 'react'
import { PromptTemplate } from '../types'
import { api } from '../utils/api'

/**
 * Prompt template management hook
 * Handles prompt template operations: loading, searching, creating, editing, deleting
 */
export function usePromptManagement(
  userId: number | null,
  pathname: string,
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void
) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [templateSearchQuery, setTemplateSearchQuery] = useState('')
  const [templateSearchResults, setTemplateSearchResults] = useState<PromptTemplate[]>([])
  const [templateSearchLoading, setTemplateSearchLoading] = useState(false)
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)
  const [pinnedCategories, setPinnedCategories] = useState<string[]>([])
  const templateSearchInputRef = useRef<HTMLInputElement>(null)

  /**
   * Load pinned categories from localStorage
   */
  useEffect(() => {
    const saved = localStorage.getItem('pinnedPromptCategories')
    if (saved) {
      try {
        setPinnedCategories(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse pinned categories', e)
      }
    }
  }, [])

  /**
   * Toggle pinned status of a category
   */
  const handleTogglePinnedCategory = (category: string) => {
    const newPinned = pinnedCategories.includes(category)
      ? pinnedCategories.filter(c => c !== category)
      : [...pinnedCategories, category]
    setPinnedCategories(newPinned)
    localStorage.setItem('pinnedPromptCategories', JSON.stringify(newPinned))
  }

  /**
   * Derive unique categories from all templates
   */
  const allCategories = Array.from(new Set(
    templates.flatMap(t => t.categories || [])
  )).sort()

  /**
   * Filtered templates based on selected category
   */
  const filteredTemplates = selectedCategory
    ? templates.filter(t => (t.categories || []).includes(selectedCategory))
    : templates

  /**
   * Get favorite templates
   */
  const favoriteTemplates = templates.filter(t => t.is_favorite === 1)

  /**
   * Load templates for the user
   */
  const loadTemplates = async () => {
    if (!userId) return
    setLoadingTemplates(true)
    try {
      const templatesData = await api.getPromptTemplates(userId)
      setTemplates(templatesData)
    } catch (error: any) {
      console.error('Failed to load templates:', error)
      showNotification(`テンプレートの取得に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    } finally {
      setLoadingTemplates(false)
    }
  }

  /**
   * Search templates with debouncing
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      handleTemplateSearch(templateSearchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [templateSearchQuery, userId])

  /**
   * Search templates
   */
  const handleTemplateSearch = async (query: string) => {
    if (!userId || !query.trim()) {
      setTemplateSearchResults([])
      return
    }

    setTemplateSearchLoading(true)
    try {
      const results = await api.searchPromptTemplates(userId, query)
      setTemplateSearchResults(results)
    } catch (error) {
      console.error('Failed to search templates:', error)
      setTemplateSearchResults([])
    } finally {
      setTemplateSearchLoading(false)
    }
  }

  /**
   * Create a new template
   */
  const handleCreateTemplate = async (data: {
    name: string
    description?: string
    prompt_text: string
    categories?: string[]
    is_system_prompt?: number
  }) => {
    if (!userId) {
      showNotification('テンプレートを作成するにはログインが必要です', 'error')
      return
    }

    try {
      await api.createPromptTemplate({
        user_id: userId,
        ...data,
      })
      showNotification('テンプレートを作成しました', 'success')
      await loadTemplates()
      setShowCreateModal(false)
    } catch (error: any) {
      showNotification(`テンプレートの作成に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
      throw error
    }
  }

  /**
   * Update an existing template
   */
  const handleUpdateTemplate = async (templateId: number, updates: Partial<PromptTemplate>) => {
    try {
      await api.updatePromptTemplate(templateId, updates)
      showNotification('テンプレートを更新しました', 'success')
      await loadTemplates()
      setShowEditModal(false)
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null)
      }
    } catch (error: any) {
      showNotification(`テンプレートの更新に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
      throw error
    }
  }

  /**
   * Toggle favorite status of a template
   */
  const handleToggleFavorite = async (templateId: number) => {
    try {
      await api.toggleFavoritePromptTemplate(templateId)
      await loadTemplates()
    } catch (error: any) {
      showNotification(`お気に入り状態の更新に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  /**
   * Delete a template (opens confirm modal)
   */
  const handleDeleteTemplate = (templateId: number) => {
    setPendingDeleteTemplateId(templateId)
    setShowDeleteConfirm(true)
  }

  /**
   * Confirm and perform deletion
   */
  const handleConfirmDelete = async () => {
    if (pendingDeleteTemplateId === null) return
    try {
      await api.deletePromptTemplate(pendingDeleteTemplateId)
      showNotification('テンプレートを削除しました', 'success')
      await loadTemplates()
      setShowDeleteConfirm(false)
      setPendingDeleteTemplateId(null)
      if (selectedTemplate?.id === pendingDeleteTemplateId) {
        setSelectedTemplate(null)
      }
    } catch (error: any) {
      showNotification(`テンプレートの削除に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  /**
   * Cancel deletion
   */
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setPendingDeleteTemplateId(null)
  }

  /**
   * Apply a template to current message or start new chat
   */
  const handleApplyTemplate = async (template: PromptTemplate, onApply?: (templateText: string) => void) => {
    try {
      // Increment use count
      await api.incrementPromptTemplateUse(template.id)

      // Call the provided callback to apply the template
      if (onApply) {
        onApply(template.prompt_text)
      }

      // Reload templates to update use_count
      await loadTemplates()

      setShowApplyModal(false)
    } catch (error: any) {
      showNotification(`テンプレートの適用に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  /**
   * Open edit modal with selected template
   */
  const handleEditTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template)
    setShowEditModal(true)
  }

  /**
   * Open template detail view
   */
  const handleViewTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template)
  }

  // Load templates when user is available (for chat screen access)
  useEffect(() => {
    if (userId) {
      loadTemplates()
    }
  }, [userId])

  // Reload templates when navigating to /prompts page to ensure fresh data
  useEffect(() => {
    if (pathname === '/prompts' && userId) {
      loadTemplates()
    }
  }, [pathname])

  // Handle template search with debounce
  useEffect(() => {
    if (!userId || pathname !== '/prompts') return
    const timeoutId = setTimeout(() => {
      if (templateSearchQuery) {
        handleTemplateSearch(templateSearchQuery)
      } else {
        setTemplateSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [templateSearchQuery, userId, pathname])

  // Focus search input when shown
  useEffect(() => {
    if (showApplyModal && templateSearchInputRef.current) {
      templateSearchInputRef.current.focus()
    }
  }, [showApplyModal])

  return {
    templates: filteredTemplates,
    allTemplates: templates,
    favoriteTemplates,
    allCategories,
    selectedCategory,
    setSelectedCategory,
    loadingTemplates,
    selectedTemplate,
    setSelectedTemplate,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    showApplyModal,
    setShowApplyModal,
    showDeleteConfirm,
    pendingDeleteTemplateId,
    templateSearchQuery,
    setTemplateSearchQuery,
    templateSearchResults,
    templateSearchLoading,
    showCategoryManagement,
    setShowCategoryManagement,
    templateSearchInputRef,
    pinnedCategories,
    handleTogglePinnedCategory,
    loadTemplates,
    handleCreateTemplate,
    handleUpdateTemplate,
    handleToggleFavorite,
    handleDeleteTemplate,
    handleConfirmDelete,
    handleCancelDelete,
    handleApplyTemplate,
    handleEditTemplate,
    handleViewTemplate,
  }
}
