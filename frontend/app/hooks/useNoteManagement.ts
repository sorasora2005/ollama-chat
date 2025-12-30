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
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [showNoteCreateModal, setShowNoteCreateModal] = useState(false)
  const [noteSearchQuery, setNoteSearchQuery] = useState('')
  const [noteSearchResults, setNoteSearchResults] = useState<Note[]>([])
  const [noteSearchLoading, setNoteSearchLoading] = useState(false)
  const [showNoteSearch, setShowNoteSearch] = useState(false)
  const noteSearchInputRef = useRef<HTMLInputElement>(null)

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
  const handleCreateNote = async (model: string, prompt: string) => {
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

  // Load notes when accessing /notes page
  useEffect(() => {
    if (pathname === '/notes' && userId && !loadingNotes) {
      loadNotes()
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
    notes,
    loadingNotes,
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
    noteSearchInputRef,
    loadNotes,
    handleCreateNote,
    handleExportNote,
  }
}
