'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useTheme } from './hooks/useTheme'
import { useUsers } from './hooks/useUsers'
import { useModels } from './hooks/useModels'
import { useChat } from './hooks/useChat'
import { useFiles } from './hooks/useFiles'
import { useModelDownload } from './hooks/useModelDownload'
import { useChatMessage } from './hooks/useChatMessage'
import { useNotifications } from './hooks/useNotifications'
import { exportChatHistory, exportNote } from './utils/chatExport'
import { scrollToBottom } from './utils/scrollUtils'
import UsernameModal from './components/UsernameModal'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import MessageList from './components/MessageList'
import MessageInput from './components/MessageInput'
import SearchModal from './components/SearchModal'
import NoteSearchModal from './components/NoteSearchModal'
import FilePreviewModal from './components/FilePreviewModal'
import WelcomeScreen from './components/WelcomeScreen'
import NotificationToast from './components/NotificationToast'
import DownloadWarningModal from './components/DownloadWarningModal'
import DownloadSuccessModal from './components/DownloadSuccessModal'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import ModelStatsModal from './components/ModelStatsModal'
import FileList from './components/FileList'
import StatsList from './components/StatsList'
import NoteList from './components/NoteList'
import ModelList from './components/ModelList'
import NoteCreateModal from './components/NoteCreateModal'
import NoteDetailModal from './components/NoteDetailModal'
import { api } from './utils/api'
import { Note } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Home() {
  const pathname = usePathname()
  const { isDarkMode, toggleTheme } = useTheme()
  const [isInitialized, setIsInitialized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userToggled, setUserToggled] = useState(false)
  const [input, setInput] = useState('')
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const [modelStats, setModelStats] = useState<Array<{
    model_name: string
    total_tokens: number
    prompt_tokens: number
    completion_tokens: number
    conversation_count: number
  }> | null>(null)
  const [showModelStats, setShowModelStats] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [showNoteCreateModal, setShowNoteCreateModal] = useState(false)
  const [noteSearchQuery, setNoteSearchQuery] = useState('')
  const [noteSearchResults, setNoteSearchResults] = useState<Note[]>([])
  const [noteSearchLoading, setNoteSearchLoading] = useState(false)
  const [showNoteSearch, setShowNoteSearch] = useState(false)
  const noteSearchInputRef = useRef<HTMLInputElement>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Custom hooks
  const {
    users,
    userId,
    username,
    showUsernameModal,
    setShowUsernameModal,
    showNewUserForm,
    setShowNewUserForm,
    newUsername,
    setNewUsername,
    setUserId,
    setUsername,
    loadUsers,
    selectUser,
    createUser,
  } = useUsers()

  const {
    models,
    selectedModel,
    setSelectedModel,
    downloadingModels,
    setDownloadingModels,
    deletingModels,
    setDeletingModels,
    loadModels,
  } = useModels()

  const {
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
  } = useChat(userId, selectedModel, setSelectedModel)

  const {
    userFiles,
    loadingFiles,
    uploadedFile,
    setUploadedFile,
    uploading,
    setUploading,
    selectedFile,
    setSelectedFile,
    loadUserFiles,
  } = useFiles(userId)

  const { notification, setNotification, showNotification } = useNotifications()

  const {
    showDownloadWarning,
    pendingDownloadModel,
    pendingDownloadSize,
    showDownloadSuccess,
    completedDownloadModel,
    showDeleteConfirm,
    pendingDeleteModel,
    downloadModel,
    handleConfirmDownload,
    handleCancelDownload,
    cancelDownload,
    deleteModel,
    handleConfirmDelete,
    handleCancelDelete,
    setShowDownloadSuccess,
    setCompletedDownloadModel,
  } = useModelDownload(
    downloadingModels,
    setDownloadingModels,
    deletingModels,
    setDeletingModels,
    loadModels,
    showNotification
  )

  const {
    copiedIndex,
    clickedButton,
    setClickedButton,
    sendMessage: sendChatMessage,
    cancelStreaming: cancelChatStreaming,
    copyMessage,
    regenerateMessage,
    isStreaming,
  } = useChatMessage(
    userId,
    selectedModel,
    currentSessionId,
    messages,
    setMessages,
    setCurrentSessionId,
    setLoading,
    abortControllerRef,
    assistantMessageIndexRef,
    messagesEndRef,
    lastSentMessageRef,
    messageRefs,
    loadSessions,
    loadUserFiles
  )

  // Initialize
  useEffect(() => {
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

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [userToggled])

  // Load files when accessing /files page
  useEffect(() => {
    if (pathname === '/files' && userId && !loadingFiles) {
      loadUserFiles(userId)
    }
  }, [pathname, userId])

  // Load notes when accessing /notes page
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

  useEffect(() => {
    if (pathname === '/notes' && userId && !loadingNotes) {
      loadNotes()
    }
  }, [pathname, userId])

  // Handle note search
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

  useEffect(() => {
    if (showNoteSearch && noteSearchInputRef.current) {
      noteSearchInputRef.current.focus()
    }
  }, [showNoteSearch])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '52px'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  // Handle user selection
  const handleSelectUser = async (selectedUserId: number, selectedUsername: string) => {
    await selectUser(selectedUserId, selectedUsername)
    await loadSessions(selectedUserId)
    await loadUserFiles(selectedUserId)
  }

  // Handle user creation
  const handleCreateUser = async (name: string) => {
    try {
      await createUser(name)
      await loadSessions(userId!)
      await loadUserFiles(userId!)
    } catch (error: any) {
      alert(`ユーザー作成に失敗しました: ${error.response?.data?.detail || error.message}`)
    }
  }

  // Handle create new chat - need to clear uploadedFile
  const handleCreateNewChat = () => {
    createNewChat()
    setUploadedFile(null)
    setInput('')
  }

  // Handle model change - start new chat when model changes
  const handleModelChange = (newModel: string) => {
    // If the model is different from the current one, start a new chat
    // But don't create new chat if search window is open
    if (newModel !== selectedModel && !showSearch) {
      handleCreateNewChat()
    }
    setSelectedModel(newModel)
    setShowModelSelector(false)
  }

  // Handle logout
  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('userId')
    localStorage.removeItem('username')

    // Reset state
    setUserId(null)
    setUsername('')
    setMessages([])
    setCurrentSessionId(null)
    setUploadedFile(null)
    setInput('')
    setShowSearch(false)
    setSearchQuery('')
    assistantMessageIndexRef.current = null

    // Load users and show username modal
    loadUsers()
    setShowUsernameModal(true)
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

  // Handle file upload
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
    try {
      const response = await api.uploadFile(file)
      setUploadedFile({
        filename: response.filename,
        images: response.images
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

  // Handle send with file
  const handleSendWithFile = () => {
    if (uploadedFile && input.trim()) {
      sendChatMessage(input.trim(), uploadedFile)
      setInput('')
      setUploadedFile(null)
    } else if (uploadedFile) {
      sendChatMessage('この画像について説明してください。', uploadedFile)
      setInput('')
      setUploadedFile(null)
    } else if (input.trim()) {
      sendChatMessage(input.trim(), null)
      setInput('')
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendWithFile()
    }
  }

  // Handle cancel streaming and restore message content
  const handleCancelStreaming = () => {
    const restoredContent = cancelChatStreaming()
    if (restoredContent) {
      setInput(restoredContent.text)
      setUploadedFile(restoredContent.file)
    }
  }

  // Handle copy message
  const handleCopyMessage = async (content: string, index: number) => {
    setClickedButton({ type: 'copy', index })
    setTimeout(() => setClickedButton(null), 400)
    const success = await copyMessage(content, index)
    if (success) {
      showNotification('コピーしました', 'success')
    } else {
      showNotification('コピーに失敗しました', 'error')
    }
  }

  // Handle feedback
  const handleFeedback = async (messageId: number, feedbackType: 'positive' | 'negative') => {
    if (!userId) return
    try {
      await api.createFeedback(userId, messageId, feedbackType)
      showNotification(feedbackType === 'positive' ? 'フィードバックを送信しました（良い）' : 'フィードバックを送信しました（悪い）', 'success')
    } catch (error: any) {
      showNotification(`フィードバックの送信に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
    }
  }

  // Handle model stats
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

  // Handle export chat history
  const handleExportChatHistory = () => {
    try {
      exportChatHistory(messages, currentSessionId, sessions, selectedModel, username)
      showNotification('チャット履歴をエクスポートしました', 'success')
    } catch (error: any) {
      showNotification(error.message || 'エクスポートする履歴がありません', 'error')
    }
  }

  // Handle export note
  const handleExportNote = (note: Note) => {
    try {
      exportNote(note, username)
      showNotification('ノートをエクスポートしました', 'success')
    } catch (error: any) {
      showNotification(error.message || 'エクスポートするノートがありません', 'error')
    }
  }

  // Handle create note
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

  // Handle click outside model selector
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

  return (
    <div className="flex h-screen bg-white dark:bg-[#1a1a1a] text-black dark:text-white overflow-hidden">
      <UsernameModal
        isOpen={isInitialized && showUsernameModal}
        users={users}
        showNewUserForm={showNewUserForm}
        newUsername={newUsername}
        onNewUsernameChange={setNewUsername}
        onSelectUser={handleSelectUser}
        onCreateUser={handleCreateUser}
        onShowNewUserForm={setShowNewUserForm}
      />

      <DownloadWarningModal
        isOpen={showDownloadWarning}
        modelName={pendingDownloadModel}
        sizeRange={pendingDownloadSize}
        onConfirm={handleConfirmDownload}
        onCancel={handleCancelDownload}
      />

      <DownloadSuccessModal
        isOpen={showDownloadSuccess}
        modelName={completedDownloadModel}
        onClose={() => {
          setShowDownloadSuccess(false)
          setCompletedDownloadModel(null)
        }}
      />

      <ModelStatsModal
        isOpen={showModelStats}
        modelStats={modelStats}
        onClose={() => {
          setShowModelStats(false)
          setModelStats(null)
        }}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        modelName={pendingDeleteModel}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <NoteCreateModal
        isOpen={showNoteCreateModal}
        models={models}
        selectedModel={selectedModel}
        onClose={() => setShowNoteCreateModal(false)}
        onCreateNote={handleCreateNote}
      />

      <NoteDetailModal
        isOpen={!!selectedNote}
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        onChatClick={loadChatHistory}
        onExport={handleExportNote}
      />

      <SearchModal
        isOpen={showSearch}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchLoading={searchLoading}
        searchInputRef={searchInputRef}
        onSearchQueryChange={setSearchQuery}
        onClose={() => {
          setShowSearch(false)
          setSearchQuery('')
        }}
        onLoadChatHistory={loadChatHistory}
      />

      <NoteSearchModal
        isOpen={showNoteSearch}
        searchQuery={noteSearchQuery}
        searchResults={noteSearchResults}
        searchLoading={noteSearchLoading}
        searchInputRef={noteSearchInputRef}
        onSearchQueryChange={setNoteSearchQuery}
        onClose={() => {
          setShowNoteSearch(false)
          setNoteSearchQuery('')
        }}
        onNoteClick={async (note) => {
          try {
            const latestNote = await api.getNoteDetail(note.id)
            setSelectedNote(latestNote)
          } catch (error: any) {
            showNotification(`ノートの取得に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
          }
        }}
      />

      <FilePreviewModal
        isOpen={!!selectedFile}
        filename={selectedFile?.filename || ''}
        images={selectedFile?.images || []}
        onClose={() => setSelectedFile(null)}
      />

      <Sidebar
        sidebarOpen={sidebarOpen}
        isDarkMode={isDarkMode}
        username={username}
        sessions={sessions}
        currentSessionId={currentSessionId}
        userFiles={userFiles}
        onToggleSidebar={() => {
          setSidebarOpen(!sidebarOpen)
          setUserToggled(true)
          setTimeout(() => setUserToggled(false), 5000)
        }}
        onToggleTheme={toggleTheme}
        onShowSearch={() => setShowSearch(true)}
        onCreateNewChat={handleCreateNewChat}
        onLoadChatHistory={loadChatHistory}
        onLogout={handleLogout}
        onSelectFile={setSelectedFile}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => {
            setSidebarOpen(true)
            setUserToggled(true)
            setTimeout(() => setUserToggled(false), 5000)
          }}
          showModelSelector={showModelSelector}
          setShowModelSelector={setShowModelSelector}
          selectedModel={selectedModel}
          models={models}
          modelSearchQuery={modelSearchQuery}
          downloadingModels={downloadingModels}
          userId={userId}
          onModelSearchChange={setModelSearchQuery}
          onModelChange={handleModelChange}
          onDownloadModel={downloadModel}
          onCancelDownload={cancelDownload}
          currentSessionId={currentSessionId}
          messagesLength={messages.length}
          onExportChatHistory={handleExportChatHistory}
          onCreateNewChat={handleCreateNewChat}
          onCreateNote={() => setShowNoteCreateModal(true)}
          onShowNoteSearch={() => setShowNoteSearch(true)}
          pathname={pathname}
        />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col min-h-0">
          {pathname === '/models' ? (
            <ModelList userId={userId} />
          ) : pathname === '/stats' ? (
            <StatsList
              userId={userId}
              username={username}
            />
          ) : pathname === '/files' ? (
            <FileList
              files={userFiles}
              loading={loadingFiles}
              onFileClick={loadChatHistory}
            />
          ) : pathname === '/notes' ? (
            <NoteList
              notes={notes}
              loading={loadingNotes}
              onNoteClick={async (note) => {
                // Fetch latest note detail
                try {
                  const latestNote = await api.getNoteDetail(note.id)
                  setSelectedNote(latestNote)
                } catch (error: any) {
                  showNotification(`ノートの取得に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
                }
              }}
              onChatClick={loadChatHistory}
            />
          ) : loadingHistory ? (
            <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center flex-1">
              <Loader2 className="w-8 h-8 text-gray-600 dark:text-gray-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen username={username} />
          ) : (
            <MessageList
              messages={messages}
              loading={loading}
              assistantMessageIndex={assistantMessageIndexRef.current}
              messageRefs={messageRefs}
              messagesStartRef={messagesStartRef}
              messagesEndRef={messagesEndRef}
              copiedIndex={copiedIndex}
              clickedButton={clickedButton}
              userId={userId}
              onCopyMessage={handleCopyMessage}
              onRegenerateMessage={regenerateMessage}
              onFeedback={handleFeedback}
            />
          )}
        </div>

        {pathname !== '/files' && pathname !== '/stats' && pathname !== '/notes' && pathname !== '/models' && (
          <MessageInput
            input={input}
            uploading={uploading}
            uploadedFile={uploadedFile}
            loading={loading || isStreaming}
            userId={userId}
            selectedModel={selectedModel}
            supportsImages={supportsImages}
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
            onInputChange={setInput}
            onFileUpload={handleFileUpload}
            onRemoveFile={() => setUploadedFile(null)}
            onSend={handleSendWithFile}
            onCancel={handleCancelStreaming}
            onKeyPress={handleKeyPress}
          />
        )}
      </div>

      <NotificationToast
        notification={notification}
        onClose={() => setNotification(null)}
      />
    </div>
  )
}
