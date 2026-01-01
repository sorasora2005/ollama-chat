import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Message, ChatSession } from '../types'
import { api } from '../utils/api'

export function useChat(userId: number | null, selectedModel: string, setSelectedModel: (model: string) => void) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatSession[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesStartRef = useRef<HTMLDivElement>(null)
  const lastSentMessageRef = useRef<string | null>(null)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const assistantMessageIndexRef = useRef<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isCreatingNewChatRef = useRef<boolean>(false)
  const isLoadingHistoryRef = useRef<boolean>(false)

  const loadChatHistory = useCallback(async (sessionId: string) => {
    if (!userId) return
    if (isLoadingHistoryRef.current) return
    if (currentSessionId === sessionId) return

    isLoadingHistoryRef.current = true
    setLoadingHistory(true)
    try {
      const response = await api.getChatHistory(userId, sessionId)
      const loadedMessages = (response.messages || []).map((msg: Message, idx: number) => ({
        ...msg,
        id: msg.id || `loaded-${sessionId}-${idx}-${Date.now()}`,
        streamingComplete: msg.role === 'assistant' ? true : undefined
      }))

      setCurrentSessionId(sessionId)
      setMessages(loadedMessages)
      assistantMessageIndexRef.current = null
      setShowSearch(false)

      if (response.session_model) {
        setSelectedModel(response.session_model)
      }

      setTimeout(() => {
        const params = new URLSearchParams()
        params.set('session', sessionId)
        router.replace(`/?${params.toString()}`, { scroll: false })
      }, 50)
    } catch (error) {
      console.error('Failed to load chat history:', error)
    } finally {
      setLoadingHistory(false)
      setTimeout(() => {
        isLoadingHistoryRef.current = false
      }, 100)
    }
  }, [userId, currentSessionId, router, setSelectedModel])

  const loadSessions = async (id: number) => {
    try {
      const sessionsList = await api.getChatSessions(id)
      setSessions(sessionsList)
    } catch (error: any) {
      console.error('Failed to load sessions:', error)
      if (error.response?.status === 404) {
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
        throw error
      }
    }
  }

  const handleSearch = async (query: string) => {
    if (!userId || !query.trim()) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const results = await api.searchChatHistory(userId, query)
      setSearchResults(results)
    } catch (error) {
      console.error('Failed to search:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const createNewChat = (skipNavigation = false) => {
    isCreatingNewChatRef.current = true
    setMessages([])
    setCurrentSessionId(null)
    setShowSearch(false)

    // Reset to default model if set
    const defaultModel = localStorage.getItem('defaultModel')
    if (defaultModel) {
      setSelectedModel(defaultModel)
    }

    if (!skipNavigation) {
      router.replace('/', { scroll: false })
    }
    setTimeout(() => {
      isCreatingNewChatRef.current = false
    }, 100)
  }

  const cancelStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setLoading(false)
  }

  useEffect(() => {
    if (userId) {
      loadSessions(userId)
    }
  }, [userId])

  useEffect(() => {
    if (isCreatingNewChatRef.current || isLoadingHistoryRef.current) {
      return
    }
    const sessionIdFromUrl = searchParams.get('session')
    if (sessionIdFromUrl && userId && sessionIdFromUrl !== currentSessionId) {
      loadChatHistory(sessionIdFromUrl)
    }
  }, [searchParams, userId, currentSessionId, loadChatHistory])

  useEffect(() => {
    if (!userId) return
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, userId])

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  return {
    messages,
    setMessages,
    loading,
    setLoading,
    loadingHistory,
    currentSessionId,
    setCurrentSessionId,
    sessions,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    showSearch,
    setShowSearch,
    messagesEndRef,
    messagesStartRef,
    lastSentMessageRef,
    messageRefs,
    assistantMessageIndexRef,
    searchInputRef,
    abortControllerRef,
    loadChatHistory,
    loadSessions,
    createNewChat,
    cancelStreaming,
  }
}

