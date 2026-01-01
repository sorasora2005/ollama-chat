import { useState, useEffect, useRef } from 'react'
import { Note } from '../types'
import { api } from '../utils/api'
import { exportNote } from '../utils/chatExport'

/**
 * Note management hook
 * Handles note operations: loading, searching, creating, exporting
 */
export function useNoteManagement(
  userId: number | null,
  currentSessionId: string | null,
  pathname: string,
  username: string,
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void
) {
  const [notes, setNotes] = useState<Note[]>([])
  const [trashNotes, setTrashNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [loadingTrash, setLoadingTrash] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [showNoteCreateModal, setShowNoteCreateModal] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [noteSearchQuery, setNoteSearchQuery] = useState('')
  const [noteSearchResults, setNoteSearchResults] = useState<Note[]>([])
  const [noteSearchLoading, setNoteSearchLoading] = useState(false)
  const [showNoteSearch, setShowNoteSearch] = useState(false)
  const [showLabelManagement, setShowLabelManagement] = useState(false)
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false)
  const [pinnedLabels, setPinnedLabels] = useState<string[]>([])
  const noteSearchInputRef = useRef<HTMLInputElement>(null)

  /**
   * Load pinned labels from localStorage
   */
  useEffect(() => {
    const saved = localStorage.getItem('pinnedLabels')
    if (saved) {
      try {
        setPinnedLabels(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse pinned labels', e)
      }
    }
  }, [])

  /**
   * Toggle pinned status of a label
   */
  const handleTogglePinnedLabel = (label: string) => {
    const newPinned = pinnedLabels.includes(label)
      ? pinnedLabels.filter(l => l !== label)
      : [...pinnedLabels, label]
    setPinnedLabels(newPinned)
    localStorage.setItem('pinnedLabels', JSON.stringify(newPinned))
  }

  /**
   * Derive unique labels from all notes
   */
  const allLabels = Array.from(new Set([
    ...notes.flatMap(n => n.labels || []),
    ...trashNotes.flatMap(n => n.labels || [])
  ])).sort()

  /**
   * Filtered notes based on selected label
   */
  const filteredNotes = selectedLabel
    ? notes.filter(n => (n.labels || []).includes(selectedLabel))
    : notes

  const filteredTrashNotes = selectedLabel
    ? trashNotes.filter(n => (n.labels || []).includes(selectedLabel))
    : trashNotes

  /**
   * Load notes for the user
   */
  const loadNotes = async () => {
    if (!userId) return
    setLoadingNotes(true)
    try {
      const notesData = await api.getNotes(userId)
      setNotes(notesData)
    } catch (error: any) {
      console.error('Failed to load notes:', error)
      showNotification(`ノートの取得に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    } finally {
      setLoadingNotes(false)
    }
  }

  /**
   * Load trash notes for the user
   */
  const loadTrashNotes = async () => {
    if (!userId) return
    setLoadingTrash(true)
    try {
      const notesData = await api.getTrashNotes(userId)
      setTrashNotes(notesData)
    } catch (error: any) {
      console.error('Failed to load trash notes:', error)
      showNotification(`ゴミ箱の取得に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    } finally {
      setLoadingTrash(false)
    }
  }

  /**
   * Search notes with debouncing
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      handleNoteSearch(noteSearchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [noteSearchQuery, userId])

  /**
   * Search notes
   */
  const handleNoteSearch = async (query: string) => {
    if (!userId || !query.trim()) {
      setNoteSearchResults([])
      return
    }

    setNoteSearchLoading(true)
    try {
      const results = await api.searchNotes(userId, query)
      setNoteSearchResults(results)
    } catch (error) {
      console.error('Failed to search notes:', error)
      setNoteSearchResults([])
    } finally {
      setNoteSearchLoading(false)
    }
  }

  /**
   * Create a new note
   */
  const handleCreateNote = async (model: string, prompt: string, labels: string[] = []) => {
    if (!userId || !currentSessionId) {
      showNotification('ノートを作成するにはチャットセッションが必要です', 'error')
      return
    }

    try {
      await api.createNote({
        user_id: userId,
        session_id: currentSessionId,
        model: model,
        prompt: prompt,
        labels: labels,
      })
      showNotification('ノートを作成しました。生成中です...', 'success')

      // Refresh notes if on notes page
      if (pathname === '/notes') {
        await loadNotes()
      }

      // Poll for note completion
      setTimeout(async () => {
        if (pathname === '/notes') {
          await loadNotes()
        }
      }, 5000)
    } catch (error: any) {
      showNotification(`ノートの作成に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
      throw error
    }
  }

  /**
   * Export a note
   */
  const handleExportNote = (note: Note) => {
    try {
      exportNote(note, username)
      showNotification('ノートをエクスポートしました', 'success')
    } catch (error: any) {
      showNotification(error.message || 'エクスポートするノートがありません', 'error')
    }
  }

  /**
   * Delete a note (move to trash)
   */
  const handleDeleteNote = async (noteId: number) => {
    try {
      await api.deleteNote(noteId)
      showNotification('ノートをゴミ箱に移動しました', 'success')
      await loadNotes()
      await loadTrashNotes()
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
      }
    } catch (error: any) {
      showNotification(`ノートの移動に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  /**
   * Restore a note from trash
   */
  const handleRestoreNote = async (noteId: number) => {
    try {
      await api.restoreNote(noteId)
      showNotification('ノートを復元しました', 'success')
      await loadNotes()
      await loadTrashNotes()
    } catch (error: any) {
      showNotification(`ノートの復元に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false)
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<number | null>(null)

  /**
   * Permanently delete a note (opens confirm modal)
   */
  const handlePermanentDeleteNote = (noteId: number) => {
    setPendingDeleteNoteId(noteId)
    setShowPermanentDeleteConfirm(true)
  }

  /**
   * Confirm and perform permanent deletion
   */
  const handleConfirmPermanentDelete = async () => {
    if (pendingDeleteNoteId === null) return
    try {
      await api.permanentDeleteNote(pendingDeleteNoteId)
      showNotification('ノートを完全に削除しました', 'success')
      await loadTrashNotes()
      setShowPermanentDeleteConfirm(false)
      setPendingDeleteNoteId(null)
    } catch (error: any) {
      showNotification(`ノートの削除に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  /**
   * Cancel permanent deletion
   */
  const handleCancelPermanentDelete = () => {
    setShowPermanentDeleteConfirm(false)
    setPendingDeleteNoteId(null)
  }

  /**
   * Restore all notes in trash
   */
  const handleBulkRestore = async () => {
    if (trashNotes.length === 0) return
    try {
      const ids = trashNotes.map(n => n.id)
      await api.bulkRestoreNotes(ids)
      showNotification('すべてのノートを復元しました', 'success')
      await loadNotes()
      await loadTrashNotes()
    } catch (error: any) {
      showNotification(`ノートの一括復元に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  /**
   * Empty trash bin
   */
  const handleBulkPermanentDelete = async () => {
    if (trashNotes.length === 0) return
    try {
      const ids = trashNotes.map(n => n.id)
      await api.bulkPermanentDeleteNotes(ids)
      showNotification('ゴミ箱を空にしました', 'success')
      await loadTrashNotes()
      setShowEmptyTrashConfirm(false)
    } catch (error: any) {
      showNotification(`ゴミ箱を空にするのに失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  /**
   * Update labels for a note
   */
  const handleUpdateNoteLabels = async (noteId: number, labels: string[]) => {
    try {
      await api.updateNoteLabels(noteId, labels)
      showNotification('ラベルを更新しました', 'success')
      await loadNotes()
      // If we are viewing this note in detail, update it
      if (selectedNote?.id === noteId) {
        setSelectedNote({ ...selectedNote, labels })
      }
    } catch (error: any) {
      showNotification(`ラベルの更新に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  // Load notes when accessing /notes page
  useEffect(() => {
    if (pathname === '/notes' && userId) {
      loadNotes()
      loadTrashNotes()
    }
  }, [pathname, userId])

  // Handle note search with debounce
  useEffect(() => {
    if (!userId || pathname !== '/notes') return
    const timeoutId = setTimeout(() => {
      if (noteSearchQuery) {
        handleNoteSearch(noteSearchQuery)
      } else {
        setNoteSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [noteSearchQuery, userId, pathname])

  // Focus search input when shown
  useEffect(() => {
    if (showNoteSearch && noteSearchInputRef.current) {
      noteSearchInputRef.current.focus()
    }
  }, [showNoteSearch])

  return {
    notes: filteredNotes,
    trashNotes: trashNotes,
    allLabels,
    selectedLabel,
    setSelectedLabel,
    loadingNotes,
    loadingTrash,
    showTrash,
    setShowTrash,
    selectedNote,
    setSelectedNote,
    showNoteCreateModal,
    setShowNoteCreateModal,
    noteSearchQuery,
    setNoteSearchQuery,
    noteSearchResults,
    noteSearchLoading,
    showNoteSearch,
    setShowNoteSearch,
    showLabelManagement,
    setShowLabelManagement,
    noteSearchInputRef,
    loadNotes,
    handleCreateNote,
    handleExportNote,
    handleDeleteNote,
    handleRestoreNote,
    handlePermanentDeleteNote,
    showPermanentDeleteConfirm,
    pendingDeleteNoteId,
    handleConfirmPermanentDelete,
    handleCancelPermanentDelete,
    pinnedLabels,
    handleTogglePinnedLabel,
    handleUpdateNoteLabels,
    handleBulkRestore,
    handleBulkPermanentDelete,
    showEmptyTrashConfirm,
    setShowEmptyTrashConfirm,
  }
}
