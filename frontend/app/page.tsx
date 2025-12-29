'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import axios from 'axios'
import { Send, Loader2, Paperclip, Menu, Search, Plus, ChevronDown, ChevronUp, ChevronRight, X, Image as ImageIcon, FileText, Sparkles, Lightbulb, Square, LogOut, AlertTriangle, Download, CheckCircle, Trash2, Copy, RotateCcw, BarChart3, Sun, Moon } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Message {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
  model?: string
  session_id?: string
  images?: string[]  // Base64 encoded images
  id?: string  // Unique ID for React key
  streamingComplete?: boolean  // Flag to track if streaming is complete
}

interface Model {
  name: string
  size?: number
  downloaded?: boolean
  family?: string
  type?: string
  description?: string
}

interface ChatSession {
  session_id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  snippet?: string  // For search results
  model?: string  // Model used in this session
}

interface UserInfo {
  id: number
  username: string
  created_at: string
  session_count: number
  message_count: number
}

export default function Home() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [username, setUsername] = useState('')
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState('qwen3-vl:4b')
  const [uploading, setUploading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userToggled, setUserToggled] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ filename: string, images: string[] } | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatSession[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set())
  const [users, setUsers] = useState<UserInfo[]>([])
  const [showNewUserForm, setShowNewUserForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [showDownloadWarning, setShowDownloadWarning] = useState(false)
  const [pendingDownloadModel, setPendingDownloadModel] = useState<string | null>(null)
  const [pendingDownloadSize, setPendingDownloadSize] = useState<{ min: number; max: number }>({ min: 0, max: 0 })
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false)
  const [completedDownloadModel, setCompletedDownloadModel] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteModel, setPendingDeleteModel] = useState<string | null>(null)
  const [deletingModels, setDeletingModels] = useState<Set<string>>(new Set())
  const [userFiles, setUserFiles] = useState<Array<{ message_id: number, session_id: string, filename: string, images: string[], created_at: string, model?: string }>>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ filename: string, images: string[] } | null>(null)
  const [modelStats, setModelStats] = useState<Array<{
    model_name: string
    total_tokens: number
    prompt_tokens: number
    completion_tokens: number
    conversation_count: number
  }> | null>(null)
  const [showModelStats, setShowModelStats] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  const [clickedButton, setClickedButton] = useState<{ type: string, index: number } | null>(null)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesStartRef = useRef<HTMLDivElement>(null)
  const lastSentMessageRef = useRef<string | null>(null)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const assistantMessageIndexRef = useRef<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isCreatingNewChatRef = useRef<boolean>(false)
  const isLoadingHistoryRef = useRef<boolean>(false)

  // システム設定からテーマを取得
  const getSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // テーマを適用
  const applyTheme = (isDark: boolean) => {
    setIsDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // テーマの初期化と適用
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    let shouldBeDark: boolean

    if (savedTheme === 'dark' || savedTheme === 'light') {
      // ユーザーが明示的に設定した場合
      shouldBeDark = savedTheme === 'dark'
    } else {
      // デフォルトはシステム設定に従う
      shouldBeDark = getSystemTheme() === 'dark'
    }

    applyTheme(shouldBeDark)

    // システム設定の変更を監視
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('theme')
      // ユーザーが明示的に設定していない場合のみ、システム設定に従う
      if (savedTheme !== 'dark' && savedTheme !== 'light') {
        applyTheme(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  // テーマ切り替え関数
  const toggleTheme = () => {
    const newIsDark = !isDarkMode
    applyTheme(newIsDark)
    // ユーザーが明示的に設定したことを記録
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
  }

  useEffect(() => {
    loadModels()
    const savedUserId = localStorage.getItem('userId')
    const savedUsername = localStorage.getItem('username')
    if (savedUserId && savedUsername) {
      setUserId(parseInt(savedUserId))
      setUsername(savedUsername)
      setShowUsernameModal(false)
      loadSessions(parseInt(savedUserId))
      loadUserFiles(parseInt(savedUserId))
    } else {
      loadUsers()
      setShowUsernameModal(true)
    }
    setIsInitialized(true)

    // 初期画面サイズに応じてサイドバーの状態を設定
    const isWideScreen = window.innerWidth >= 768 // md breakpoint
    setSidebarOpen(isWideScreen)
  }, [])

  // 画面サイズに応じてサイドバーを自動調整
  useEffect(() => {
    const handleResize = () => {
      if (!userToggled) {
        const isWideScreen = window.innerWidth >= 768 // md breakpoint
        setSidebarOpen(isWideScreen)
      }
    }

    // リサイズイベントリスナーを追加
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [userToggled])

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`)
      setUsers(response.data.users || [])
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([])
    }
  }

  const selectUser = async (selectedUserId: number, selectedUsername: string) => {
    setUserId(selectedUserId)
    setUsername(selectedUsername)
    localStorage.setItem('userId', selectedUserId.toString())
    localStorage.setItem('username', selectedUsername)
    setShowUsernameModal(false)
    setShowNewUserForm(false)
    setNewUsername('')
    await loadSessions(selectedUserId)
    await loadUserFiles(selectedUserId)
  }

  const loadChatHistory = useCallback(async (sessionId: string) => {
    if (!userId) return
    // Prevent infinite loop
    if (isLoadingHistoryRef.current) return
    if (currentSessionId === sessionId) return

    isLoadingHistoryRef.current = true
    setLoadingHistory(true)
    try {
      const response = await axios.get(`${API_URL}/api/chat/history/${userId}?session_id=${sessionId}`)
      const loadedMessages = (response.data.messages || []).map((msg: Message, idx: number) => ({
        ...msg,
        id: msg.id || `loaded-${sessionId}-${idx}-${Date.now()}`,
        streamingComplete: msg.role === 'assistant' ? true : undefined
      }))

      // Set messages and state first
      setCurrentSessionId(sessionId)
      setMessages(loadedMessages)
      assistantMessageIndexRef.current = null  // Reset when loading history
      setShowSearch(false)  // Close search when loading history

      // Set the model used in this session
      if (response.data.session_model) {
        setSelectedModel(response.data.session_model)
      }

      // Update URL after state updates are processed - wait a bit to ensure messages are rendered
      setTimeout(() => {
        const params = new URLSearchParams()
        params.set('session', sessionId)
        router.replace(`/?${params.toString()}`, { scroll: false })
      }, 50)
    } catch (error) {
      console.error('Failed to load chat history:', error)
    } finally {
      setLoadingHistory(false)
      // Use setTimeout to ensure state updates are processed before resetting flag
      setTimeout(() => {
        isLoadingHistoryRef.current = false
      }, 100)
    }
  }, [userId, currentSessionId, router])

  useEffect(() => {
    if (userId) {
      loadSessions(userId)
      loadUserFiles(userId)
    }
  }, [userId])

  // Load chat history from URL parameter
  useEffect(() => {
    // Skip if we're creating a new chat or already loading history
    if (isCreatingNewChatRef.current || isLoadingHistoryRef.current) {
      return
    }
    const sessionIdFromUrl = searchParams.get('session')
    if (sessionIdFromUrl && userId && sessionIdFromUrl !== currentSessionId) {
      loadChatHistory(sessionIdFromUrl)
    }
  }, [searchParams, userId, currentSessionId, loadChatHistory])

  // Load files when accessing /files page
  useEffect(() => {
    if (pathname === '/files' && userId && !loadingFiles) {
      loadUserFiles(userId)
    }
  }, [pathname, userId])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '52px'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToTop = () => {
    messagesStartRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToLastSentMessage = () => {
    if (lastSentMessageRef.current) {
      const messageElement = messageRefs.current.get(lastSentMessageRef.current)
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const loadModels = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/models`)
      const availableModels = response.data.models || []
      console.log('Loaded models:', availableModels.length)
      if (availableModels.length > 0) {
        setModels(availableModels)
        // Select first downloaded model, or keep current selection if it's still available
        const currentModel = availableModels.find((m: Model) => m.name === selectedModel)
        if (!currentModel || !currentModel.downloaded) {
          const downloadedModel = availableModels.find((m: Model) => m.downloaded)
          if (downloadedModel) {
            setSelectedModel(downloadedModel.name)
          } else if (availableModels.length > 0) {
            setSelectedModel(availableModels[0].name)
          }
        }
      } else {
        console.warn('No models returned from API')
        setModels([
          { name: 'qwen2.5-vl:7b', downloaded: false },
          { name: 'qwen2.5-vl:3b', downloaded: false },
          { name: 'qwen2.5-vl:2b', downloaded: false }
        ])
      }
    } catch (error) {
      console.error('Failed to load models:', error)
      setModels([
        { name: 'qwen2.5-vl:7b', downloaded: false },
        { name: 'qwen2.5-vl:3b', downloaded: false },
        { name: 'qwen2.5-vl:2b', downloaded: false }
      ])
    }
  }

  // Check if selected model supports images
  const selectedModelInfo = models.find(m => m.name === selectedModel)
  const supportsImages = selectedModelInfo?.type === 'vision'

  // Clear uploaded file when switching to non-vision model
  useEffect(() => {
    if (!supportsImages && uploadedFile) {
      setUploadedFile(null)
    }
  }, [selectedModel, supportsImages, uploadedFile])

  // Estimate model size range from name (in GB) - returns min and max
  const estimateModelSizeRange = (modelName: string): { min: number; max: number } => {
    const nameLower = modelName.toLowerCase()

    // Extract size indicators from model name
    const patterns = [
      // Match patterns like "2b", "4b", "7b", "13b", "30b", "70b"
      { regex: /(\d+(?:\.\d+)?)b/i },
      // Match patterns like "270m", "360m"
      { regex: /(\d+(?:\.\d+)?)m/i },
    ]

    for (const { regex } of patterns) {
      const match = nameLower.match(regex)
      if (match) {
        const paramCount = parseFloat(match[1])
        const isMillions = match[0].toLowerCase().includes('m')

        if (isMillions) {
          // For millions: wider range based on actual sizes
          // gemma3:270m → 292MB, so roughly 0.001-0.0012GB per million
          const base = paramCount * 0.0011
          return { min: base * 0.85, max: base * 1.4 }
        }

        // For billions: size mapping with range (based on actual Ollama model sizes)
        // Using wider ranges to account for variations between model families
        const sizeMap: { [key: number]: { min: number; max: number } } = {
          0.27: { min: 0.25, max: 0.35 }, // gemma3:270m → 292MB
          0.5: { min: 0.3, max: 0.5 },
          0.6: { min: 0.4, max: 0.7 },
          1.0: { min: 0.7, max: 1.2 }, // gemma3:1b → 815MB
          1.1: { min: 0.8, max: 1.3 },
          1.5: { min: 1.0, max: 1.5 }, // deepseek-r1:1.5b → 1.1GB
          1.7: { min: 1.2, max: 1.8 },
          1.8: { min: 1.3, max: 2.0 },
          2.0: { min: 1.5, max: 2.5 }, // qwen3-vl:2b → 1.9GB
          2.5: { min: 1.8, max: 2.8 },
          2.7: { min: 2.0, max: 3.0 },
          3.0: { min: 2.5, max: 3.5 },
          3.3: { min: 2.8, max: 4.0 }, // gemma3:4b → 3.3GB, qwen3-vl:4b → 3.3GB
          3.8: { min: 3.0, max: 4.5 },
          4.0: { min: 3.2, max: 4.5 }, // gemma3:4b → 3.3GB
          4.7: { min: 4.0, max: 5.5 }, // deepseek-r1:7b → 4.7GB
          5.2: { min: 4.5, max: 6.5 }, // deepseek-r1:8b → 5.2GB, qwen3-vl:latest → 6.1GB
          6.1: { min: 5.5, max: 7.0 }, // qwen3-vl:latest → 6.1GB, qwen3-vl:8b → 6.1GB
          6.7: { min: 5.5, max: 7.5 },
          7.0: { min: 6.0, max: 8.0 }, // deepseek-r1:7b → 4.7GB (but can vary)
          8.0: { min: 6.5, max: 9.0 }, // qwen3-vl:8b → 6.1GB
          8.1: { min: 7.0, max: 9.5 }, // gemma3:12b → 8.1GB
          9.0: { min: 7.5, max: 10.5 }, // deepseek-r1:14b → 9.0GB
          10.0: { min: 8.5, max: 11.5 },
          10.7: { min: 9.0, max: 12.5 },
          11.0: { min: 9.5, max: 13.0 },
          12.0: { min: 10.0, max: 14.0 }, // gemma3:12b → 8.1GB
          13.0: { min: 11.0, max: 15.0 },
          14.0: { min: 12.0, max: 16.0 }, // deepseek-r1:14b → 9.0GB
          16.0: { min: 14.0, max: 18.0 },
          17.0: { min: 15.0, max: 19.0 }, // gemma3:27b → 17GB
          20.0: { min: 18.0, max: 23.0 }, // qwen3-vl:30b → 20GB, deepseek-r1:32b → 20GB
          21.0: { min: 19.0, max: 24.0 }, // qwen3-vl:32b → 21GB
          22.0: { min: 20.0, max: 25.0 },
          24.0: { min: 22.0, max: 27.0 },
          27.0: { min: 25.0, max: 30.0 }, // gemma3:27b → 17GB
          30.0: { min: 18.0, max: 23.0 }, // qwen3-vl:30b → 20GB
          32.0: { min: 19.0, max: 24.0 }, // qwen3-vl:32b → 21GB, deepseek-r1:32b → 20GB
          35.0: { min: 32.0, max: 38.0 },
          43.0: { min: 40.0, max: 47.0 }, // deepseek-r1:70b → 43GB
          70.0: { min: 40.0, max: 47.0 }, // deepseek-r1:70b → 43GB
          104.0: { min: 95.0, max: 115.0 },
          111.0: { min: 100.0, max: 120.0 },
          120.0: { min: 110.0, max: 130.0 },
          143.0: { min: 130.0, max: 160.0 }, // qwen3-vl:235b → 143GB
          235.0: { min: 130.0, max: 160.0 }, // qwen3-vl:235b → 143GB
          236.0: { min: 130.0, max: 160.0 },
          404.0: { min: 380.0, max: 430.0 }, // deepseek-r1:671b → 404GB
          671.0: { min: 380.0, max: 430.0 }, // deepseek-r1:671b → 404GB
        }

        // Find closest match or calculate
        if (sizeMap[paramCount]) {
          return sizeMap[paramCount]
        }

        // Interpolate for values not in map
        const keys = Object.keys(sizeMap).map(Number).sort((a, b) => a - b)
        const lower = keys.filter(k => k <= paramCount).pop()
        const upper = keys.filter(k => k >= paramCount)[0]

        if (lower !== undefined && upper !== undefined) {
          const ratio = (paramCount - lower) / (upper - lower)
          const lowerRange = sizeMap[lower]
          const upperRange = sizeMap[upper]
          return {
            min: lowerRange.min + (upperRange.min - lowerRange.min) * ratio,
            max: lowerRange.max + (upperRange.max - lowerRange.max) * ratio
          }
        }

        // Fallback: wider range ~0.5-1.0GB per billion parameters (varies by model family)
        const base = paramCount * 0.7
        return { min: base * 0.7, max: base * 1.5 }
      }
    }

    // If no pattern matches, check for keywords
    if (nameLower.includes('large') || nameLower.includes('big') || nameLower.includes('huge')) {
      return { min: 4.0, max: 7.0 }
    }

    // Default: assume small-medium size
    return { min: 0.8, max: 1.5 }
  }

  const downloadModel = async (modelName: string) => {
    if (downloadingModels.has(modelName)) return

    // Check if model is large and show warning
    const sizeRange = estimateModelSizeRange(modelName)

    if (sizeRange.min >= 1.0) {
      // Show custom warning modal
      setPendingDownloadModel(modelName)
      setPendingDownloadSize(sizeRange)
      setShowDownloadWarning(true)
      return
    }

    // Start download immediately for small models
    await startDownload(modelName)
  }

  const handleConfirmDownload = async () => {
    if (pendingDownloadModel) {
      setShowDownloadWarning(false)
      await startDownload(pendingDownloadModel)
      setPendingDownloadModel(null)
      setPendingDownloadSize({ min: 0, max: 0 })
    }
  }

  const handleCancelDownload = () => {
    setShowDownloadWarning(false)
    setPendingDownloadModel(null)
    setPendingDownloadSize({ min: 0, max: 0 })
  }

  const deleteModel = async (modelName: string) => {
    if (deletingModels.has(modelName)) return

    setPendingDeleteModel(modelName)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteModel) return

    setDeletingModels(prev => new Set(prev).add(pendingDeleteModel))
    setShowDeleteConfirm(false)

    try {
      await axios.delete(`${API_URL}/api/models/${encodeURIComponent(pendingDeleteModel)}`)
      await loadModels()
      setPendingDeleteModel(null)
    } catch (error: any) {
      console.error('Failed to delete model:', error)
      alert(`モデルの削除に失敗しました: ${error.response?.data?.detail || error.message}`)
    } finally {
      setDeletingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(pendingDeleteModel)
        return newSet
      })
      setPendingDeleteModel(null)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setPendingDeleteModel(null)
  }

  const startDownload = async (modelName: string) => {
    console.log('Starting download for model:', modelName)
    setDownloadingModels(prev => new Set(prev).add(modelName))

    try {
      const response = await fetch(`${API_URL}/api/models/pull/${encodeURIComponent(modelName)}`)
      console.log('Download response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Download failed:', errorText)
        throw new Error(`ダウンロードの開始に失敗しました: ${response.status} ${errorText}`)
      }

      if (!response.body) {
        throw new Error('レスポンスボディがありません')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let hasError = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('Stream ended')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue

          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue

              const data = JSON.parse(jsonStr)
              console.log('Received data:', data)

              if (data.error) {
                console.error('Download error:', data.error)
                hasError = true
                throw new Error(data.error)
              }

              if (data.status === 'success') {
                console.log('Download completed successfully')
                // Reload models after successful download
                await loadModels()
                setCompletedDownloadModel(modelName)
                setShowDownloadSuccess(true)
                setDownloadingModels(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(modelName)
                  return newSet
                })
                return
              }
            } catch (e: any) {
              if (e.message && e.message.includes('error')) {
                throw e
              }
              console.error('Failed to parse pull data:', e, 'Line:', line)
            }
          }
        }
      }

      if (!hasError) {
        // If we reach here without success, reload models anyway
        await loadModels()
      }
    } catch (error: any) {
      console.error('Failed to download model:', error)
      alert(`モデルのダウンロードに失敗しました: ${error.message || error}`)
    } finally {
      setDownloadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
    }
  }

  const loadUserFiles = async (id: number) => {
    setLoadingFiles(true)
    try {
      const response = await axios.get(`${API_URL}/api/chat/files/${id}`)
      setUserFiles(response.data.files || [])
    } catch (error) {
      console.error('Failed to load user files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }

  const loadSessions = async (id: number) => {
    try {
      const response = await axios.get(`${API_URL}/api/chat/sessions/${id}`)
      setSessions(response.data.sessions || [])
    } catch (error: any) {
      console.error('Failed to load sessions:', error)
      // If user not found, clear localStorage and show username modal
      if (error.response?.status === 404) {
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
        setUserId(null)
        setUsername('')
        setShowUsernameModal(true)
      }
    }
  }

  const createUser = async (name: string) => {
    if (!name.trim()) return
    try {
      const response = await axios.post(`${API_URL}/api/users`, {
        username: name.trim()
      })
      const newUserId = response.data.id
      await loadUsers() // Reload users list
      await selectUser(newUserId, name.trim())
    } catch (error: any) {
      console.error('Failed to create user:', error)
      alert(`ユーザー作成に失敗しました: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleSearch = async (query: string) => {
    if (!userId || !query.trim()) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const response = await axios.get(`${API_URL}/api/chat/search/${userId}`, {
        params: { q: query.trim() }
      })
      setSearchResults(response.data.results || [])
    } catch (error) {
      console.error('Failed to search:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)  // Debounce search by 300ms

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, userId])

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showModelSelector && !target.closest('.model-selector')) {
        setShowModelSelector(false)
        setModelSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showModelSelector])

  // Reset search when closing model selector
  useEffect(() => {
    if (!showModelSelector) {
      setModelSearchQuery('')
    }
  }, [showModelSelector])

  const createNewChat = () => {
    // Set flag to prevent useEffect from loading history
    isCreatingNewChatRef.current = true

    setMessages([])
    setCurrentSessionId(null)
    setUploadedFile(null)
    setInput('')
    assistantMessageIndexRef.current = null

    // Navigate to root URL - replace current history entry to remove query parameters
    router.replace('/', { scroll: false })

    // Reset flag after a short delay to allow URL to update
    setTimeout(() => {
      isCreatingNewChatRef.current = false
    }, 100)
  }

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('userId')
    localStorage.removeItem('username')

    // Reset state
    setUserId(null)
    setUsername('')
    setMessages([])
    setSessions([])
    setCurrentSessionId(null)
    setUploadedFile(null)
    setInput('')
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
    setShowNewUserForm(false)
    setNewUsername('')
    assistantMessageIndexRef.current = null

    // Load users and show username modal
    loadUsers()
    setShowUsernameModal(true)
  }

  // Handle model change - start new chat when model changes
  const handleModelChange = (newModel: string) => {
    // If the model is different from the current one, start a new chat
    // But don't create new chat if search window is open
    if (newModel !== selectedModel && !showSearch) {
      createNewChat()
    }
    setSelectedModel(newModel)
    setShowModelSelector(false)
  }

  const cancelStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setLoading(false)
      // Add or update assistant message with cancellation notice
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          // Update existing assistant message
          const indexToUpdate = assistantMessageIndexRef.current !== null
            ? assistantMessageIndexRef.current
            : newMessages.length - 1
          if (indexToUpdate >= 0 && indexToUpdate < newMessages.length) {
            newMessages[indexToUpdate] = {
              ...newMessages[indexToUpdate],
              content: newMessages[indexToUpdate].content.trim() || '生成を中断しました。',
              streamingComplete: true
            }
          }
        } else {
          // Add new cancellation message
          const cancellationMessage: Message = {
            role: 'assistant',
            content: '生成を中断しました。',
            id: `cancelled-${Date.now()}-${Math.random()}`,
            streamingComplete: true
          }
          newMessages.push(cancellationMessage)
        }
        return newMessages
      })
      assistantMessageIndexRef.current = null
    }
  }

  const sendMessage = async (messageText?: string, skipUserMessage: boolean = false) => {
    const textToSend = messageText || input.trim()
    if ((!textToSend && !uploadedFile) || !userId || loading) return

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const userMessage: Message = {
      role: 'user',
      content: textToSend || (uploadedFile ? `ファイル: ${uploadedFile.filename}` : ''),
      images: uploadedFile?.images || undefined,
      id: `user-${Date.now()}-${Math.random()}`
    }

    // Only add user message if not skipping (for regeneration)
    if (!skipUserMessage) {
      setMessages(prev => [...prev, userMessage])
      // Scroll to the sent message so it appears at the top of the viewport
      lastSentMessageRef.current = userMessage.id || null
      setTimeout(() => scrollToLastSentMessage(), 100)
    }
    const imagesToSend = uploadedFile?.images || null
    setInput('')
    setUploadedFile(null)
    setLoading(true)
    assistantMessageIndexRef.current = null  // Reset assistant message index

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()

    try {
      const requestData: any = {
        user_id: userId,
        message: textToSend || (uploadedFile ? `この画像について説明してください。` : ''),
        model: selectedModel,
        session_id: currentSessionId
      }

      // Add images if uploaded
      if (imagesToSend && imagesToSend.length > 0) {
        requestData.images = imagesToSend
      }

      // Use fetch for streaming with abort signal
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let sessionId = currentSessionId
      let assistantMessageCreated = false

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))

                  if (data.error) {
                    throw new Error(data.error)
                  }

                  if (data.content) {
                    // Create assistant message on first content chunk
                    if (!assistantMessageCreated) {
                      assistantMessageCreated = true
                      fullContent = data.content
                      const assistantMessage: Message = {
                        role: 'assistant',
                        content: fullContent,
                        model: selectedModel,
                        session_id: data.session_id || currentSessionId || undefined,
                        id: `assistant-${Date.now()}-${Math.random()}`,
                        streamingComplete: false
                      }
                      setMessages(prev => {
                        // Track the index of the assistant message we're creating
                        const newIndex = prev.length
                        assistantMessageIndexRef.current = newIndex
                        return [...prev, assistantMessage]
                      })
                      setLoading(false)  // Hide loading indicator once message starts streaming
                      // Auto-scroll during streaming
                      setTimeout(() => scrollToBottom(), 50)
                      if (data.session_id) {
                        sessionId = data.session_id
                      }
                    } else {
                      // Update existing assistant message
                      fullContent += data.content
                      setMessages(prev => {
                        const newMessages = [...prev]
                        // Use the tracked index if available, otherwise find the last assistant message
                        const indexToUpdate = assistantMessageIndexRef.current !== null
                          ? assistantMessageIndexRef.current
                          : (() => {
                            for (let i = newMessages.length - 1; i >= 0; i--) {
                              if (newMessages[i].role === 'assistant') {
                                return i
                              }
                            }
                            return -1
                          })()

                        if (indexToUpdate >= 0 && indexToUpdate < newMessages.length) {
                          newMessages[indexToUpdate] = {
                            ...newMessages[indexToUpdate],
                            content: fullContent,
                            session_id: data.session_id || newMessages[indexToUpdate].session_id
                          }
                        }
                        return newMessages
                      })
                      // Auto-scroll during streaming
                      setTimeout(() => scrollToBottom(), 50)
                      if (data.session_id) {
                        sessionId = data.session_id
                      }
                    }
                  }

                  if (data.done) {
                    setLoading(false)  // Ensure loading is false when done
                    abortControllerRef.current = null  // Clear abort controller

                    // Handle cancellation
                    if (data.cancelled) {
                      // Add or update assistant message with cancellation notice
                      setMessages(prev => {
                        const newMessages = [...prev]
                        const lastMessage = newMessages[newMessages.length - 1]
                        if (lastMessage && lastMessage.role === 'assistant') {
                          // Update existing assistant message
                          const indexToUpdate = assistantMessageIndexRef.current !== null
                            ? assistantMessageIndexRef.current
                            : newMessages.length - 1
                          if (indexToUpdate >= 0 && indexToUpdate < newMessages.length) {
                            newMessages[indexToUpdate] = {
                              ...newMessages[indexToUpdate],
                              content: newMessages[indexToUpdate].content.trim() || '生成を中断しました。',
                              streamingComplete: true
                            }
                          }
                        } else {
                          // Add new cancellation message
                          const cancellationMessage: Message = {
                            role: 'assistant',
                            content: '生成を中断しました。',
                            id: `cancelled-${Date.now()}-${Math.random()}`,
                            streamingComplete: true
                          }
                          newMessages.push(cancellationMessage)
                        }
                        return newMessages
                      })
                      assistantMessageIndexRef.current = null
                      return
                    }

                    // Mark streaming as complete for the assistant message
                    setMessages(prev => {
                      const newMessages = [...prev]
                      const indexToUpdate = assistantMessageIndexRef.current !== null
                        ? assistantMessageIndexRef.current
                        : (() => {
                          for (let i = newMessages.length - 1; i >= 0; i--) {
                            if (newMessages[i].role === 'assistant') {
                              return i
                            }
                          }
                          return -1
                        })()

                      if (indexToUpdate >= 0 && indexToUpdate < newMessages.length) {
                        newMessages[indexToUpdate] = {
                          ...newMessages[indexToUpdate],
                          streamingComplete: true
                        }
                      }
                      return newMessages
                    })

                    if (sessionId && !currentSessionId) {
                      setCurrentSessionId(sessionId)
                    }
                    await loadSessions(userId)
                    await loadUserFiles(userId)
                    break
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e)
                }
              }
            }
          }
        } catch (readError: any) {
          // Handle read errors (including abort)
          if (readError.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
            setLoading(false)
            abortControllerRef.current = null
            // Add or update assistant message with cancellation notice
            setMessages(prev => {
              const newMessages = [...prev]
              const lastMessage = newMessages[newMessages.length - 1]
              if (lastMessage && lastMessage.role === 'assistant') {
                // Update existing assistant message
                const indexToUpdate = assistantMessageIndexRef.current !== null
                  ? assistantMessageIndexRef.current
                  : newMessages.length - 1
                if (indexToUpdate >= 0 && indexToUpdate < newMessages.length) {
                  newMessages[indexToUpdate] = {
                    ...newMessages[indexToUpdate],
                    content: newMessages[indexToUpdate].content.trim() || '生成を中断しました。',
                    streamingComplete: true
                  }
                }
              } else {
                // Add new cancellation message
                const cancellationMessage: Message = {
                  role: 'assistant',
                  content: '生成を中断しました。',
                  id: `cancelled-${Date.now()}-${Math.random()}`,
                  streamingComplete: true
                }
                newMessages.push(cancellationMessage)
              }
              return newMessages
            })
            assistantMessageIndexRef.current = null
            return
          }
          throw readError
        }
      }
    } catch (error: any) {
      // Don't show error if it was aborted
      if (error.name === 'AbortError') {
        setLoading(false)
        abortControllerRef.current = null
        // Add or update assistant message with cancellation notice
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            // Update existing assistant message
            const indexToUpdate = assistantMessageIndexRef.current !== null
              ? assistantMessageIndexRef.current
              : newMessages.length - 1
            if (indexToUpdate >= 0 && indexToUpdate < newMessages.length) {
              newMessages[indexToUpdate] = {
                ...newMessages[indexToUpdate],
                content: newMessages[indexToUpdate].content.trim() || '生成を中断しました。',
                streamingComplete: true
              }
            }
          } else {
            // Add new cancellation message
            const cancellationMessage: Message = {
              role: 'assistant',
              content: '生成を中断しました。',
              id: `cancelled-${Date.now()}-${Math.random()}`,
              streamingComplete: true
            }
            newMessages.push(cancellationMessage)
          }
          return newMessages
        })
        assistantMessageIndexRef.current = null
        return
      }

      console.error('Failed to send message:', error)
      assistantMessageIndexRef.current = null  // Reset on error
      abortControllerRef.current = null

      // If user not found, clear localStorage and show username modal
      if (error.message?.includes('User not found') || error.message?.includes('404')) {
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
        setUserId(null)
        setUsername('')
        setShowUsernameModal(true)
        setMessages([])
        alert('ユーザーが見つかりませんでした。再度ユーザー名を入力してください。')
        return
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: `エラーが発生しました: ${error.message || 'Unknown error'}\n\nOllamaが起動しているか、モデルがダウンロードされているか確認してください。`,
        id: `error-${Date.now()}-${Math.random()}`,
        streamingComplete: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    // Check if selected model supports images
    const currentModel = models.find(m => m.name === selectedModel)
    if (currentModel?.type !== 'vision') {
      alert('選択されたモデルは画像をサポートしていません。画像対応モデルを選択してください。')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setUploadedFile({
        filename: response.data.filename,
        images: response.data.images
      })
    } catch (error: any) {
      console.error('Failed to upload file:', error)
      alert(`ファイルアップロードに失敗しました: ${error.response?.data?.detail || error.message}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSendWithFile = () => {
    if (uploadedFile && input.trim()) {
      sendMessage(input.trim())
    } else if (uploadedFile) {
      sendMessage('この画像について説明してください。')
    } else if (input.trim()) {
      sendMessage()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendWithFile()
    }
  }

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const copyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedIndex(index)
      showNotification('コピーしました', 'success')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      showNotification('コピーに失敗しました', 'error')
    }
  }

  const regenerateMessage = async (messageIndex: number) => {
    if (!userId || loading) return

    // Find the user message that prompted this assistant message
    const userMessageIndex = messageIndex > 0 ? messageIndex - 1 : 0
    const userMessage = messages[userMessageIndex]

    if (!userMessage || userMessage.role !== 'user') return

    // Remove messages from this assistant message onwards
    const newMessages = messages.slice(0, messageIndex)
    setMessages(newMessages)

    // Wait a bit for state to update before sending
    await new Promise(resolve => setTimeout(resolve, 100))

    // Send the user message again, but skip adding the user message since it's already in the array
    await sendMessage(userMessage.content, true)
  }

  const loadModelStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/models/stats`)
      setModelStats(response.data.stats)
      setShowModelStats(true)
    } catch (error: any) {
      console.error('Failed to load model stats:', error)
      showNotification(`モデル統計の取得に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  const exportChatHistory = () => {
    if (!currentSessionId || messages.length === 0) {
      showNotification('エクスポートする履歴がありません', 'error')
      return
    }

    // Get session title from sessions list
    const session = sessions.find(s => s.session_id === currentSessionId)
    const sessionTitle = session?.title || 'チャット履歴'

    // Convert UTC to JST (UTC+9)
    const toJST = (dateString?: string) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      // Add 9 hours for JST
      const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
      // Format as YYYY-MM-DD HH:MM:SS JST
      const year = jstDate.getUTCFullYear()
      const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0')
      const day = String(jstDate.getUTCDate()).padStart(2, '0')
      const hours = String(jstDate.getUTCHours()).padStart(2, '0')
      const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0')
      const seconds = String(jstDate.getUTCSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} JST`
    }

    // Generate markdown content
    let markdown = `# ${sessionTitle}\n\n`
    markdown += `**セッションID:** ${currentSessionId}\n`
    markdown += `**モデル:** ${selectedModel}\n`
    markdown += `**ユーザー:** ${username}\n`
    markdown += `**エクスポート日時:** ${toJST(new Date().toISOString())}\n\n`
    markdown += `---\n\n`

    // Add messages
    messages.forEach((msg, index) => {
      const roleLabel = msg.role === 'user' ? 'ユーザー' : 'アシスタント'

      markdown += `## ${roleLabel}\n\n`

      // Handle images
      if (msg.images && msg.images.length > 0) {
        markdown += `*画像が含まれています (${msg.images.length}枚)*\n\n`
      }

      // Add message content
      markdown += `${msg.content}\n\n`
      markdown += `---\n\n`
    })

    // Create markdown blob
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // Create download link
    const link = document.createElement('a')
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `chat_history_${dateStr}_${currentSessionId.slice(0, 8)}.md`
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showNotification('チャット履歴をエクスポートしました', 'success')
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#1a1a1a] text-black dark:text-white overflow-hidden">
      {/* Username Modal */}
      {isInitialized && showUsernameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">ユーザーを選択</h2>

            {!showNewUserForm ? (
              <>
                {/* Existing Users List */}
                <div className="flex-1 overflow-y-auto mb-4 scrollbar-hide">
                  {users.length === 0 ? (
                    <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                      登録されているユーザーがありません
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => selectUser(user.id, user.username)}
                          className="w-full text-left px-4 py-3 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-lg font-medium text-black dark:text-white mb-1">
                                {user.username}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                登録日: {new Date(user.created_at).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-500 mt-1">
                                チャット数: {user.session_count}件 | メッセージ数: {user.message_count}件
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* New User Button */}
                <button
                  onClick={() => setShowNewUserForm(true)}
                  className="w-full bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>新規ユーザーを作成</span>
                </button>
              </>
            ) : (
              <>
                {/* New User Form */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newUsername.trim()) {
                        createUser(newUsername.trim())
                      }
                    }}
                    placeholder="ユーザー名を入力"
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-600 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 text-black dark:text-white"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowNewUserForm(false)
                        setNewUsername('')
                      }}
                      className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => createUser(newUsername.trim())}
                      disabled={!newUsername.trim()}
                      className="flex-1 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      作成
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Download Warning Modal */}
      {showDownloadWarning && pendingDownloadModel && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-300 dark:border-gray-600">
            <div className="flex items-start gap-3 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 flex items-center justify-center border border-blue-500/20 dark:border-purple-500/20">
                <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
                  大きなモデルのダウンロード
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  モデル「<span className="font-medium text-black dark:text-white">{pendingDownloadModel}</span>」をダウンロードしようとしています
                </p>
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-[#1a1a1a] rounded-lg p-3 mb-5 border border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">推定サイズ</span>
                <span className="text-base font-semibold text-black dark:text-white">
                  {pendingDownloadSize.min >= 1
                    ? `約${pendingDownloadSize.min.toFixed(1)} - ${pendingDownloadSize.max.toFixed(1)} GB`
                    : `約${(pendingDownloadSize.min * 1024).toFixed(0)} - ${(pendingDownloadSize.max * 1024).toFixed(0)} MB`}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              このモデルは大きいため、ダウンロードに時間がかかる場合があります。
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelDownload}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#252525] text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmDownload}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Download className="w-5 h-5" />
                ダウンロードを開始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Success Modal */}
      {showDownloadSuccess && completedDownloadModel && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-300 dark:border-gray-600">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 flex items-center justify-center mb-4 border border-blue-500/20 dark:border-purple-500/20">
                <CheckCircle className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                ダウンロード完了
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                モデル「<span className="font-medium text-black dark:text-white">{completedDownloadModel}</span>」のダウンロードが完了しました
              </p>
              <button
                onClick={() => {
                  setShowDownloadSuccess(false)
                  setCompletedDownloadModel(null)
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model Stats Modal */}
      {showModelStats && modelStats && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-xl p-6 max-w-4xl w-full mx-4 shadow-2xl border border-gray-300 dark:border-gray-600 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-black dark:text-white">
                  モデル別統計
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowModelStats(false)
                  setModelStats(null)
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {modelStats.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  統計データがありません
                </div>
              ) : (
                modelStats.map((stat) => (
                  <div key={stat.model_name} className="bg-gray-100 dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-black dark:text-white">{stat.model_name}</h4>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Tokens */}
                      <div className="bg-white dark:bg-[#252525] rounded-lg p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">総トークン数</div>
                        <div className="text-xl font-bold text-black dark:text-white">{stat.total_tokens.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          プロンプト: {stat.prompt_tokens.toLocaleString()} | 完了: {stat.completion_tokens.toLocaleString()}
                        </div>
                      </div>

                      {/* Conversations */}
                      <div className="bg-white dark:bg-[#252525] rounded-lg p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">会話数</div>
                        <div className="text-xl font-bold text-black dark:text-white">{stat.conversation_count}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowModelStats(false)
                  setModelStats(null)
                }}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && pendingDeleteModel && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-300 dark:border-gray-600">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/10 to-red-600/10 dark:from-red-500/20 dark:to-red-600/20 flex items-center justify-center mb-4 border border-red-500/20 dark:border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                モデルを削除しますか？
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                モデル「<span className="font-medium text-black dark:text-white">{pendingDeleteModel}</span>」を削除します。<br />
                この操作は取り消せません。
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#252525] text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearch && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-start justify-center z-50 pt-20"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSearch(false)
              setSearchQuery('')
              setSearchResults([])
            }
          }}
        >
          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg w-full max-w-2xl mx-4 shadow-xl border border-gray-300 dark:border-gray-800">
            {/* Search Header */}
            <div className="p-4 border-b border-gray-300 dark:border-gray-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="チャット履歴を検索..."
                className="flex-1 bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowSearch(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }
                }}
              />
              <button
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Search Results */}
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
                      onClick={() => loadChatHistory(result.session_id)}
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
      )}


      {/* File Image Preview Modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedFile(null)}
        >
          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Preview Header */}
            <div className="p-4 border-b border-gray-300 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-black dark:text-white truncate">{selectedFile.filename}</h3>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Image Preview */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {selectedFile.images.map((image, index) => (
                  <div key={index} className="bg-gray-100 dark:bg-[#2d2d2d] rounded-lg p-2">
                    <img
                      src={`data:image/png;base64,${image}`}
                      alt={`${selectedFile.filename} - Page ${index + 1}`}
                      className="w-full h-auto rounded"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => {
            setSidebarOpen(false)
            setUserToggled(true)
            setTimeout(() => setUserToggled(false), 5000)
          }}
        />
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} fixed md:relative h-full transition-all duration-300 bg-gray-100 dark:bg-[#252525] border-r border-gray-300 dark:border-[#252525] flex flex-col overflow-hidden z-50 md:z-auto`}>
        <div className="p-4 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
          <button onClick={() => {
            setSidebarOpen(!sidebarOpen)
            setUserToggled(true)
            // 5秒後に自動調整を再有効化
            setTimeout(() => setUserToggled(false), 5000)
          }} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
            <Menu className="w-5 h-5 text-black dark:text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
            >
              <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <button
          onClick={createNewChat}
          className="m-4 px-4 py-3 bg-white dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg flex items-center gap-3 transition-colors text-black dark:text-white"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">チャットを新規作成</span>
        </button>

        <div className="flex-1 overflow-y-auto px-4 scrollbar-hide">
          {/* Files Section */}
          <div className="mb-4">
            {userFiles.length > 3 ? (
              <button
                onClick={() => router.push('/files')}
                className="w-full flex items-center justify-between px-2 py-2 hover:bg-gray-200 dark:hover:bg-[#2d2d2d] rounded-lg transition-colors"
                title="すべてのファイルを表示"
              >
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">ファイル</h3>
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            ) : (
              <div className="w-full flex items-center justify-between px-2 py-2">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">ファイル</h3>
              </div>
            )}
            <div className="mt-2">
              {userFiles.length === 0 ? (
                <div className="px-2 py-4 text-xs text-gray-600 dark:text-gray-500 text-center">
                  送信したファイルがありません
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {userFiles.slice(0, 3).map((file) => (
                    <button
                      key={file.message_id}
                      onClick={() => setSelectedFile({ filename: file.filename, images: file.images })}
                      className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] transition-colors border border-gray-300 dark:border-gray-700"
                      title={file.filename}
                    >
                      {file.images && file.images.length > 0 ? (
                        <img
                          src={`data:image/png;base64,${file.images[0]}`}
                          alt={file.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chats Section */}
          <div className="mb-4">
            <div className="w-full flex items-center justify-between px-2 py-2">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">チャット</h3>
            </div>
            <div className="space-y-0.5">
              {sessions.map((session) => (
                <button
                  key={session.session_id}
                  onClick={() => loadChatHistory(session.session_id)}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2d2d2d] transition-colors text-black dark:text-white ${currentSessionId === session.session_id ? 'bg-gray-200 dark:bg-[#2d2d2d]' : ''
                    }`}
                >
                  <div className="text-sm truncate">{session.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-500 mt-1">
                    {new Date(session.updated_at).toLocaleDateString('ja-JP')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-300 dark:border-gray-700">
          <div className="mb-2 px-2 text-xs text-gray-600 dark:text-gray-400">
            {username && `${username} さん`}
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-white dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg flex items-center gap-3 transition-colors text-black dark:text-gray-300"
          >
            <LogOut className="w-5 h-5" />
            <span>ログアウト</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b border-gray-300 dark:border-gray-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => {
                setSidebarOpen(true)
                setUserToggled(true)
                // 5秒後に自動調整を再有効化
                setTimeout(() => setUserToggled(false), 5000)
              }} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg">
                <Menu className="w-5 h-5 text-black dark:text-white" />
              </button>
            )}
            <span className="font-semibold text-black dark:text-white">Ollama Chat</span>
          </div>
          <div className="flex items-center gap-3 relative model-selector">
            {/* Export History Button */}
            {currentSessionId && messages.length > 0 && (
              <button
                onClick={exportChatHistory}
                className="p-2 bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3d3d3d] transition-colors"
                title="チャット履歴をエクスポート"
              >
                <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            )}
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="px-3 py-1.5 bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-[#3d3d3d] transition-colors flex items-center gap-2 text-black dark:text-white"
            >
              <span>{selectedModel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showModelSelector ? 'rotate-180' : ''}`} />
            </button>

            {/* Model Selector Dropdown */}
            {showModelSelector && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-800 rounded-lg shadow-xl z-50 max-h-[60vh] flex flex-col">
                {/* Search Bar */}
                <div className="p-3 border-b border-gray-300 dark:border-gray-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <input
                      type="text"
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder="モデルを検索..."
                      className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                      autoFocus
                    />
                    {modelSearchQuery && (
                      <button
                        onClick={() => setModelSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Models List */}
                <div className="flex-1 overflow-y-auto">
                  {/* Filter function */}
                  {(() => {
                    const filterModels = (modelList: Model[]) => {
                      if (!modelSearchQuery || !modelSearchQuery.trim()) return modelList
                      const query = modelSearchQuery.toLowerCase().trim()
                      if (!query) return modelList

                      return modelList.filter(m => {
                        if (!m) return false
                        const nameMatch = m.name?.toLowerCase().includes(query) || false
                        const descMatch = m.description?.toLowerCase().includes(query) || false
                        const familyMatch = m.family?.toLowerCase().includes(query) || false
                        const typeMatch = m.type?.toLowerCase().includes(query) || false
                        return nameMatch || descMatch || familyMatch || typeMatch
                      })
                    }

                    const allDownloaded = models.filter(m => m && m.downloaded)
                    const allAvailable = models.filter(m => m && !m.downloaded)
                    const downloadedModels = filterModels(allDownloaded)
                    const availableModels = filterModels(allAvailable)

                    // Debug logging
                    if (modelSearchQuery && modelSearchQuery.trim()) {
                      console.log('Search query:', modelSearchQuery)
                      console.log('Total models:', models.length)
                      console.log('Downloaded models:', allDownloaded.length)
                      console.log('Available models:', allAvailable.length)
                      console.log('Filtered downloaded:', downloadedModels.length)
                      console.log('Filtered available:', availableModels.length)
                      if (downloadedModels.length === 0 && availableModels.length === 0) {
                        console.log('Sample models:', models.slice(0, 3))
                      }
                    }

                    return (
                      <>
                        <div className="p-3 border-b border-gray-300 dark:border-gray-800">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            ダウンロード済み {downloadedModels.length > 0 && `(${downloadedModels.length})`}
                          </div>
                          {downloadedModels.length === 0 ? (
                            <div className="text-xs text-gray-600 dark:text-gray-500 py-2">
                              {modelSearchQuery.trim() ? '検索結果が見つかりませんでした' : 'ダウンロード済みのモデルがありません'}
                            </div>
                          ) : (
                            downloadedModels.map((model) => (
                              <div
                                key={model.name}
                                className="group relative mb-1"
                              >
                                <button
                                  onClick={() => handleModelChange(model.name)}
                                  className={`w-full text-left px-3 py-2 pr-10 rounded-lg transition-colors ${selectedModel === model.name
                                    ? 'bg-gray-700 text-white'
                                    : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-black dark:text-gray-300'
                                    }`}
                                >
                                  <div className="text-sm font-medium">{model.name}</div>
                                  <div className={`text-xs mt-0.5 ${selectedModel === model.name ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {model.description || (model.family && model.type && `${model.family} • ${model.type === 'vision' ? '画像対応' : 'テキスト'}`)}
                                  </div>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteModel(model.name)
                                  }}
                                  disabled={deletingModels.has(model.name)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded transition-opacity disabled:opacity-50"
                                  title="モデルを削除"
                                >
                                  {deletingModels.has(model.name) ? (
                                    <Loader2 className="w-4 h-4 text-red-500 dark:text-red-400 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  )}
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="p-3">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            ダウンロード可能 {availableModels.length > 0 && `(${availableModels.length})`}
                          </div>
                          {availableModels.length === 0 ? (
                            <div className="text-xs text-gray-600 dark:text-gray-500 py-2">
                              {modelSearchQuery.trim() ? '検索結果が見つかりませんでした' : 'すべてのモデルがダウンロード済みです'}
                            </div>
                          ) : (
                            availableModels.map((model) => (
                              <div
                                key={model.name}
                                className="w-full px-3 py-2 rounded-lg mb-1 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors flex items-center justify-between"
                              >
                                <div className="flex-1">
                                  <div className="text-sm text-black dark:text-gray-300">{model.name}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-500 mt-0.5">
                                    {model.description || (model.family && model.type && `${model.family} • ${model.type === 'vision' ? '画像対応' : 'テキスト'}`)}
                                  </div>
                                </div>
                                <button
                                  onClick={() => downloadModel(model.name)}
                                  disabled={downloadingModels.has(model.name)}
                                  className="px-3 py-1 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                                >
                                  {downloadingModels.has(model.name) ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>ダウンロード中</span>
                                    </>
                                  ) : (
                                    <span>ダウンロード</span>
                                  )}
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col min-h-0">
          {pathname === '/files' ? (
            <div className="max-w-3xl mx-auto w-full">
              {/* File List Header */}
              <div className="mb-6 flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-black dark:text-white">ファイル一覧</h2>
              </div>

              {/* File List Grid */}
              {loadingFiles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-gray-600 dark:text-gray-400 animate-spin" />
                </div>
              ) : userFiles.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  送信したファイルがありません
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {userFiles.map((file) => {
                    const filenameLower = file.filename.toLowerCase();
                    let iconColor = 'text-gray-600 dark:text-gray-400';
                    if (filenameLower.endsWith('.pdf')) {
                      iconColor = 'text-red-500';
                    } else if (filenameLower.endsWith('.docx') || filenameLower.endsWith('.doc')) {
                      iconColor = 'text-blue-500';
                    } else if (filenameLower.endsWith('.xlsx') || filenameLower.endsWith('.xls')) {
                      iconColor = 'text-green-500';
                    } else if (filenameLower.endsWith('.png') || filenameLower.endsWith('.jpg') || filenameLower.endsWith('.jpeg')) {
                      iconColor = 'text-yellow-500';
                    }

                    return (
                      <button
                        key={file.message_id}
                        onClick={async () => {
                          await loadChatHistory(file.session_id)
                        }}
                        className="text-left bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg overflow-hidden transition-colors border border-gray-300 dark:border-gray-700"
                      >
                        {file.images && file.images.length > 0 ? (
                          <div className="aspect-video w-full overflow-hidden bg-gray-800">
                            <img
                              src={`data:image/png;base64,${file.images[0]}`}
                              alt={file.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video w-full flex items-center justify-center bg-gray-800">
                            <FileText className={`w-12 h-12 ${iconColor}`} />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="text-sm font-medium text-black dark:text-white truncate mb-1">{file.filename}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-500">
                            {file.images.length}枚 • {new Date(file.created_at).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : loadingHistory ? (
            <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center flex-1">
              <Loader2 className="w-8 h-8 text-gray-600 dark:text-gray-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center flex-1">
              <div className="mb-6 relative">
                <svg width="120" height="120" viewBox="0 0 120 120" className="relative z-10">
                  <defs>
                    <linearGradient id="glow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#9333ea" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Glow effect background */}
                  <circle cx="60" cy="60" r="45" fill="url(#glow-gradient)" opacity="0.3" filter="url(#glow)" />
                  {/* Main star */}
                  <g transform="translate(60, 60)">
                    <path d="M 0 -30 L 8 -8 L 30 -8 L 12 4 L 20 26 L 0 14 L -20 26 L -12 4 L -30 -8 L -8 -8 Z"
                      fill="url(#glow-gradient)"
                      filter="url(#glow)"
                      className="drop-shadow-lg" />
                  </g>
                  {/* Small stars around */}
                  <g transform="translate(30, 25)">
                    <path d="M 0 -8 L 2 -2 L 8 -2 L 3 1 L 5 7 L 0 4 L -5 7 L -3 1 L -8 -2 L -2 -2 Z"
                      fill="#3b82f6"
                      opacity="0.8"
                      filter="url(#glow)" />
                  </g>
                  <g transform="translate(90, 35)">
                    <path d="M 0 -8 L 2 -2 L 8 -2 L 3 1 L 5 7 L 0 4 L -5 7 L -3 1 L -8 -2 L -2 -2 Z"
                      fill="#8b5cf6"
                      opacity="0.8"
                      filter="url(#glow)" />
                  </g>
                  <g transform="translate(25, 75)">
                    <path d="M 0 -8 L 2 -2 L 8 -2 L 3 1 L 5 7 L 0 4 L -5 7 L -3 1 L -8 -2 L -2 -2 Z"
                      fill="#3b82f6"
                      opacity="0.8"
                      filter="url(#glow)" />
                  </g>
                  <g transform="translate(95, 85)">
                    <path d="M 0 -8 L 2 -2 L 8 -2 L 3 1 L 5 7 L 0 4 L -5 7 L -3 1 L -8 -2 L -2 -2 Z"
                      fill="#9333ea"
                      opacity="0.8"
                      filter="url(#glow)" />
                  </g>
                  {/* Constellation dots */}
                  <circle cx="20" cy="20" r="2" fill="#3b82f6" opacity="0.9" filter="url(#glow)" />
                  <circle cx="100" cy="30" r="2" fill="#9333ea" opacity="0.9" filter="url(#glow)" />
                  <circle cx="15" cy="90" r="2" fill="#3b82f6" opacity="0.9" filter="url(#glow)" />
                  <circle cx="105" cy="95" r="2" fill="#9333ea" opacity="0.9" filter="url(#glow)" />
                </svg>
              </div>
              <div className="text-2xl font-semibold mb-2 text-black dark:text-white">{username} さん</div>
              <div className="text-xl text-gray-600 dark:text-gray-400 mb-8">何から始めますか?</div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                <button className="p-4 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-xl flex items-center gap-3 transition-colors text-black dark:text-white">
                  <ImageIcon className="w-6 h-6" />
                  <span>画像の作成</span>
                </button>
                <button className="p-4 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-xl flex items-center gap-3 transition-colors text-black dark:text-white">
                  <FileText className="w-6 h-6" />
                  <span>何でも書く</span>
                </button>
                <button className="p-4 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-xl flex items-center gap-3 transition-colors text-black dark:text-white">
                  <Lightbulb className="w-6 h-6" />
                  <span>知識習得サポート</span>
                </button>
                <button className="p-4 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-xl flex items-center gap-3 transition-colors text-black dark:text-white">
                  <Sparkles className="w-6 h-6" />
                  <span>一日を盛り上げる</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full space-y-6 flex flex-col">
              <div ref={messagesStartRef} />
              {messages.map((message, index) => {
                // Check if this is a newly generated assistant message (not loaded from history)
                const isNewAssistantMessage = message.role === 'assistant' && (message.id?.startsWith('assistant-') || message.id?.startsWith('error-') || message.id?.startsWith('cancelled-'))
                const isStreaming = loading && assistantMessageIndexRef.current === index
                // Check if message is short (less than 50 characters without spaces/newlines)
                const messageLength = message.content.replace(/\s+/g, '').length
                const isShortMessage = messageLength < 50

                return (
                  <div
                    key={message.id || `msg-${index}`}
                    data-message-id={message.id}
                    ref={(el) => {
                      if (el && message.id) {
                        messageRefs.current.set(message.id, el)
                      }
                    }}
                    className={`flex gap-4 group ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${isNewAssistantMessage ? 'animate-slide-down-fade-in' : ''}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative">
                        {isStreaming ? (
                          <>
                            <svg className="w-8 h-8 absolute animate-spin" viewBox="0 0 32 32">
                              <defs>
                                <linearGradient id={`spinning-gradient-${message.id || index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#3b82f6" />
                                  <stop offset="100%" stopColor="#9333ea" />
                                </linearGradient>
                              </defs>
                              <circle
                                cx="16"
                                cy="16"
                                r="13"
                                fill="none"
                                stroke={`url(#spinning-gradient-${message.id || index})`}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray="50 30"
                                transform="rotate(-90 16 16)"
                              />
                            </svg>
                            <div className="w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] absolute"></div>
                          </>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 absolute"></div>
                        )}
                        <div className="w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] absolute"></div>
                        <span className="text-black dark:text-white text-xs font-bold relative z-10">AI</span>
                      </div>
                    )}
                    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {message.role === 'user' ? (
                        <div
                          className={`${isShortMessage ? 'max-w-fit' : 'max-w-[80%]'} rounded-2xl px-4 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-black dark:text-white`}
                          style={isShortMessage ? {} : { wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                          {/* Display images if present - only show first page for PDFs */}
                          {message.images && message.images.length > 0 && (() => {
                            // Check if content contains file reference and extract filename
                            // Try multiple patterns to match different formats
                            const fileMatch1 = message.content.match(/ファイル:\s*(.+?)(?:\n|$)/);
                            const fileMatch2 = message.content.match(/ファイル:\s*(.+)/);
                            const filename = (fileMatch1 ? fileMatch1[1].trim() : '') || (fileMatch2 ? fileMatch2[1].trim() : '');
                            // Check if filename ends with .pdf or if content contains .pdf reference
                            const contentLower = message.content.toLowerCase();
                            const isPdf = filename.toLowerCase().endsWith('.pdf') ||
                              (contentLower.includes('.pdf') && (contentLower.includes('ファイル') || message.images.length > 1));
                            return (
                              <div className={`mb-3 space-y-2 ${isPdf ? 'border-2 border-red-500 rounded-lg p-2' : ''}`}>
                                <img
                                  key={0}
                                  src={`data:image/png;base64,${message.images[0]}`}
                                  alt={`Uploaded image`}
                                  className="max-w-full rounded-lg"
                                  style={{ maxHeight: '400px' }}
                                />
                                {message.images.length > 1 && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    +{message.images.length - 1}ページ
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <div className="whitespace-pre-wrap" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {message.content}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`${isShortMessage ? 'max-w-fit' : 'max-w-[80%]'} rounded-2xl px-4 py-3 text-black dark:text-white`}
                          style={isShortMessage ? {} : { wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                          {/* Display images if present - only show first page for PDFs */}
                          {message.images && message.images.length > 0 && (
                            <div className="mb-3 space-y-2">
                              <img
                                key={0}
                                src={`data:image/png;base64,${message.images[0]}`}
                                alt={`Uploaded image`}
                                className="max-w-full rounded-lg"
                                style={{ maxHeight: '400px' }}
                              />
                              {message.images.length > 1 && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  +{message.images.length - 1}ページ
                                </div>
                              )}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {message.content}
                          </div>
                        </div>
                      )}
                      {/* Action buttons for assistant messages - only show when streaming is complete */}
                      {message.role === 'assistant' && !isStreaming && (message.streamingComplete === true || message.streamingComplete === undefined) && (
                        <div className="flex items-center gap-1 mt-2">
                          <button
                            onClick={() => {
                              setClickedButton({ type: 'copy', index })
                              setTimeout(() => setClickedButton(null), 400)
                              copyMessage(message.content, index)
                            }}
                            className={`p-2 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-all ml-1 ${clickedButton?.type === 'copy' && clickedButton?.index === index ? 'animate-float bg-gray-200 dark:bg-[#3d3d3d]' : ''
                              }`}
                            title="コピー"
                          >
                            <Copy className={`w-4 h-4 transition-colors ${copiedIndex === index ? 'text-green-500' : 'text-gray-600 dark:text-gray-400'}`} />
                          </button>
                          <button
                            onClick={() => {
                              setClickedButton({ type: 'regenerate', index })
                              setTimeout(() => setClickedButton(null), 400)
                              regenerateMessage(index)
                            }}
                            disabled={loading}
                            className={`p-2 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-all disabled:opacity-50 ${clickedButton?.type === 'regenerate' && clickedButton?.index === index ? 'animate-float bg-gray-200 dark:bg-[#3d3d3d]' : ''
                              }`}
                            title="再生成"
                          >
                            <RotateCcw className={`w-4 h-4 transition-colors ${clickedButton?.type === 'regenerate' && clickedButton?.index === index ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
                              }`} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Show AI icon with spinning animation when loading and no assistant message yet */}
              {loading && assistantMessageIndexRef.current === null && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative">
                    <svg className="w-8 h-8 absolute animate-spin" viewBox="0 0 32 32">
                      <defs>
                        <linearGradient id="spinning-gradient-loading" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#9333ea" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="16"
                        cy="16"
                        r="13"
                        fill="none"
                        stroke="url(#spinning-gradient-loading)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="50 30"
                        transform="rotate(-90 16 16)"
                      />
                    </svg>
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] absolute"></div>
                    <span className="text-black dark:text-white text-xs font-bold relative z-10">AI</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-[#1a1a1a] px-4 py-4 border-t border-gray-300 dark:border-gray-800">
          <div className="max-w-3xl mx-auto">
            {/* Uploading Indicator */}
            {uploading && (
              <div className="mb-3 p-3 bg-gray-100 dark:bg-[#2d2d2d] rounded-lg flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin" />
                <span className="text-sm text-black dark:text-white">ファイルを処理中...</span>
              </div>
            )}

            {/* Uploaded File Preview */}
            {uploadedFile && !uploading && (() => {
              const filenameLower = uploadedFile.filename.toLowerCase();
              let iconColor = 'text-gray-600 dark:text-gray-400';

              if (filenameLower.endsWith('.pdf')) {
                iconColor = 'text-red-500';
              } else if (filenameLower.endsWith('.docx') || filenameLower.endsWith('.doc')) {
                iconColor = 'text-blue-500';
              } else if (filenameLower.endsWith('.xlsx') || filenameLower.endsWith('.xls')) {
                iconColor = 'text-green-500';
              } else if (filenameLower.endsWith('.png') || filenameLower.endsWith('.jpg') || filenameLower.endsWith('.jpeg')) {
                iconColor = 'text-yellow-500';
              }

              return (
                <div className="mb-3 p-3 bg-gray-100 dark:bg-[#2d2d2d] rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className={`w-5 h-5 ${iconColor}`} />
                    <span className="text-sm text-black dark:text-white">{uploadedFile.filename}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-500">({uploadedFile.images.length}枚)</span>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              );
            })()}

            <div className="flex gap-2 items-center bg-gray-100 dark:bg-[#2d2d2d] rounded-2xl px-3 py-2.5 border border-gray-300 dark:border-gray-700/50">
              <label className={`cursor-pointer w-8 h-8 flex items-center justify-center rounded-full transition-colors ${uploading || !userId || !supportsImages
                ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-[#3d3d3d]'
                : 'bg-gray-200 dark:bg-[#3d3d3d] hover:bg-gray-300 dark:hover:bg-[#4d4d4d]'
                }`} title={!supportsImages ? 'このモデルは画像をサポートしていません' : ''}>
                <Plus className={`w-4 h-4 ${uploading ? 'animate-pulse' : ''} ${supportsImages ? 'text-gray-700 dark:text-white' : 'text-gray-400'}`} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.xlsx,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading || !userId || !supportsImages}
                />
              </label>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={uploadedFile ? `${selectedModel}にメッセージを入力して送信...` : `${selectedModel}にメッセージを入力...`}
                  rows={1}
                  className="w-full px-2 py-1.5 bg-transparent resize-none focus:outline-none text-black dark:text-white placeholder-gray-500"
                  style={{ minHeight: '32px', maxHeight: '200px' }}
                  disabled={loading || !userId}
                />
              </div>
              <button
                onClick={loading ? cancelStreaming : handleSendWithFile}
                disabled={(!input.trim() && !uploadedFile && !loading) || !userId}
                className="p-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {loading ? (
                  <Square className="w-5 h-5 text-black dark:text-white" />
                ) : (
                  <Send className="w-5 h-5 text-black dark:text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 left-4 z-50" style={{ animation: 'slideIn 0.3s ease-out' }}>
          <div className="px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[200px] max-w-[400px] border bg-white dark:bg-[#2d2d2d] border-gray-300 dark:border-gray-600">
            <div className="flex-1">
              <p className="text-sm font-medium text-black dark:text-white">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
