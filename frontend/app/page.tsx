'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import axios from 'axios'
import { Loader2, Trash2, BookOpen, Tag, Search, Pin, Plus, X, RotateCcw, Eraser } from 'lucide-react'
import { useTheme } from './hooks/useTheme'
import { useUsers } from './hooks/useUsers'
import { useModels } from './hooks/useModels'
import { useChat } from './hooks/useChat'
import { useFiles } from './hooks/useFiles'
import { useModelDownload } from './hooks/useModelDownload'
import { usePersistedDownloads } from './hooks/usePersistedDownloads'
import { useChatMessage } from './hooks/useChatMessage'
import { useNotifications } from './hooks/useNotifications'
import { usePageRouter } from './hooks/usePageRouter'
import { useNoteManagement } from './hooks/useNoteManagement'
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
import NewsList from './components/NewsList'
import FileList from './components/FileList'
import StatsList from './components/StatsList'
import NoteList from './components/NoteList'
import ModelList from './components/ModelList'
import NoteCreateModal from './components/NoteCreateModal'
import NoteDetailModal from './components/NoteDetailModal'
import LabelManagementModal from './components/LabelManagementModal'
import UrlInputModal from './components/UrlInputModal'
import UrlPreviewModal from './components/UrlPreviewModal'
import { api } from './utils/api'
import { Note } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Home() {
  const router = useRouter()
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

  // URL scraping state
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [showUrlPreview, setShowUrlPreview] = useState(false)
  const [scrapingUrl, setScrapingUrl] = useState(false)
  const [urlData, setUrlData] = useState<{ url: string, title: string, content: string } | null>(null)

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
    loadingModels,
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

  const persistedDownloads = usePersistedDownloads()

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
    pauseDownload,
    resumeDownload,
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
    showNotification,
    persistedDownloads
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

  // Page routing
  const { currentPage } = usePageRouter(pathname)

  // Note management
  const {
    notes,
    trashNotes,
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
    handleUpdateNoteLabels,
    showLabelManagement,
    setShowLabelManagement,
    pinnedLabels,
    handleTogglePinnedLabel,
    handleBulkRestore,
    handleBulkPermanentDelete,
    showEmptyTrashConfirm,
    setShowEmptyTrashConfirm,
  } = useNoteManagement(userId, currentSessionId, pathname, username, showNotification)

  // Keyboard shortcut for Note Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && pathname === '/notes') {
        e.preventDefault()
        noteSearchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pathname])

  // Auto-resume downloads on app load
  useEffect(() => {
    if (persistedDownloads.isInitialized && persistedDownloads.activeDownloads.length > 0) {
      const downloading = persistedDownloads.activeDownloads.filter(d => d.status === 'downloading')
      if (downloading.length > 0) {
        showNotification(
          `${downloading.length}件のダウンロードを再開しています`,
          'info'
        )
        downloading.forEach(async (download) => {
          await resumeDownload(download.modelName)
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedDownloads.isInitialized]) // Only run when initialized changes

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

  // Handle URL scraping
  const handleUrlClick = () => {
    setShowUrlInput(true)
  }

  const handleUrlSubmit = async (url: string) => {
    setShowUrlInput(false)
    setScrapingUrl(true)
    setShowUrlPreview(true)

    try {
      const result = await api.scrapeUrl(url)
      setUrlData(result)
    } catch (error: any) {
      showNotification(`URLの取得に失敗しました: ${error.response?.data?.detail || error.message}`, 'error')
      setShowUrlPreview(false)
    } finally {
      setScrapingUrl(false)
    }
  }

  const handleUrlConfirm = () => {
    if (urlData) {
      // Add URL content to input as context
      const contextText = `[参照URL: ${urlData.url}]\n[タイトル: ${urlData.title}]\n\n${input}\n\n---以下、ページの内容---\n${urlData.content}`
      setInput(contextText)
      setShowUrlPreview(false)
      setUrlData(null)
      showNotification('URLの内容をコンテキストに追加しました', 'success')
    }
  }

  const handleUrlClose = () => {
    setShowUrlPreview(false)
    setUrlData(null)
    setScrapingUrl(false)
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

  // Scraped cache
  const scrapedContentCacheRef = useRef<Map<string, { title: string, content: string }>>(new Map())

  // News Chat State
  const [newsChatArticle, setNewsChatArticle] = useState<any | null>(null)

  // Handle Chat about Article
  const handleChatAboutArticle = async (article: any) => {
    // 1. Set the active article to show detailed view
    setNewsChatArticle(article)

    // 2. Start new chat
    createNewChat(true)
    setUploadedFile(null)

    // Check cache
    const cachedData = scrapedContentCacheRef.current.get(article.url)

    if (cachedData) {
      // Use cached data
      const contextText = `[参照URL: ${article.url}]\n[タイトル: ${cachedData.title}]\n\nこの記事について教えてください。\n\n---以下、ページの内容---\n${cachedData.content}`
      setInput(contextText)
      // No scraping notification needed if cached
      return
    }

    // 3. Inform user that we are scraping
    showNotification('記事の内容を読み込んでいます... キャンセルせずにそのままお待ちください', 'info')

    try {
      // 4. Scrape the URL
      const result = await api.scrapeUrl(article.url)

      // Cache the result
      scrapedContentCacheRef.current.set(article.url, { title: result.title, content: result.content })

      // 5. Set context with scraped content
      const contextText = `[参照URL: ${result.url}]\n[タイトル: ${result.title}]\n\nこの記事について教えてください。\n\n---以下、ページの内容---\n${result.content}`
      setInput(contextText)
      showNotification('記事の読み込みが完了しました', 'success')

    } catch (error: any) {
      console.error('Article scraping failed:', error)
      // Fallback to basic info if scraping fails
      const contextText = `[参照URL: ${article.url}]\n[タイトル: ${article.title}]\n\nこの記事について教えてください。\n\n---記事の内容---\n${article.description || ''}\n${article.content || ''}`
      setInput(contextText)
      showNotification('記事の詳細な読み込みに失敗したため、概要のみを使用します', 'info')
    }
  }

  // Handle back to news list
  const handleBackToNews = () => {
    setNewsChatArticle(null)
    // Optional: Reset chat if needed, but keeping history might be better
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

      <UrlInputModal
        isOpen={showUrlInput}
        onClose={() => setShowUrlInput(false)}
        onSubmit={handleUrlSubmit}
      />

      <UrlPreviewModal
        isOpen={showUrlPreview}
        url={urlData?.url || ''}
        title={urlData?.title || ''}
        content={urlData?.content || ''}
        loading={scrapingUrl}
        onClose={handleUrlClose}
        onConfirm={handleUrlConfirm}
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
        title={pendingDeleteModel}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <DeleteConfirmModal
        isOpen={showPermanentDeleteConfirm}
        title={trashNotes.find(n => n.id === pendingDeleteNoteId)?.title || 'ノート'}
        description="このノートを完全に削除しますか？この操作は取り消せません。"
        onConfirm={handleConfirmPermanentDelete}
        onCancel={handleCancelPermanentDelete}
      />

      <NoteCreateModal
        isOpen={showNoteCreateModal}
        models={models}
        selectedModel={selectedModel}
        userId={userId}
        onClose={() => setShowNoteCreateModal(false)}
        onCreateNote={handleCreateNote}
      />

      <NoteDetailModal
        isOpen={!!selectedNote}
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        onChatClick={loadChatHistory}
        onExport={handleExportNote}
        onDelete={handleDeleteNote}
        onRestore={handleRestoreNote}
        onPermanentDelete={handlePermanentDeleteNote}
        onUpdateLabels={handleUpdateNoteLabels}
        pinnedLabels={pinnedLabels}
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

      <LabelManagementModal
        isOpen={showLabelManagement}
        onClose={() => setShowLabelManagement(false)}
        allLabels={allLabels}
        pinnedLabels={pinnedLabels}
        onTogglePin={handleTogglePinnedLabel}
        onLabelClick={(label) => {
          setSelectedLabel(label)
          if (showTrash) setShowTrash(false)
        }}
      />

      <DeleteConfirmModal
        isOpen={showEmptyTrashConfirm}
        title="ゴミ箱を空にする"
        description={`ゴミ箱内のすべてのノート（${trashNotes.length}件）を完全に削除します。この操作は取り消せません。`}
        confirmText="完全に削除"
        onConfirm={handleBulkPermanentDelete}
        onCancel={() => setShowEmptyTrashConfirm(false)}
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
          activeDownloads={persistedDownloads.activeDownloads}
          onStopDownload={pauseDownload}
        />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col min-h-0">
          {pathname === '/models' ? (
            <ModelList userId={userId} loading={loadingModels} />
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
          ) : pathname === '/news' ? (
            <NewsList
              userId={userId || undefined}
              onChatAboutArticle={handleChatAboutArticle}
              activeArticle={newsChatArticle}
              onBackToNews={handleBackToNews}
            >
              {newsChatArticle && (
                <>
                  <MessageList
                    messages={messages}
                    loading={loading}
                    messageRefs={messageRefs}
                    messagesEndRef={messagesEndRef}
                    messagesStartRef={messagesStartRef}
                    assistantMessageIndex={assistantMessageIndexRef.current}
                    onCopyMessage={handleCopyMessage}
                    onRegenerateMessage={regenerateMessage}
                    onFeedback={handleFeedback}
                    copiedIndex={copiedIndex}
                    clickedButton={clickedButton}
                    userId={userId}
                  />
                </>
              )}
            </NewsList>
          ) : pathname === '/notes' ? (
            <div className="max-w-4xl mx-auto w-full">
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTrash(false)}
                      className={`px-3 py-1.5 rounded-lg text-lg font-bold transition-all flex items-center gap-2 ${!showTrash
                        ? 'text-black dark:text-white'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                        }`}
                    >
                      <BookOpen className={`w-5 h-5 ${!showTrash ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                      <span>{showTrash ? 'ノート' : 'ノート一覧'}</span>
                    </button>
                    {showTrash && (
                      <span className="text-gray-400 dark:text-gray-600">/</span>
                    )}
                    {showTrash && (
                      <div className="flex items-center gap-2 px-3 py-1.5 text-lg font-bold text-black dark:text-white">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <span>ゴミ箱</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {showTrash && trashNotes.length > 0 && (
                      <>
                        <button
                          onClick={handleBulkRestore}
                          className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          すべて復元
                        </button>
                        <button
                          onClick={() => setShowEmptyTrashConfirm(true)}
                          className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          ゴミ箱を空にする
                        </button>
                      </>
                    )}

                    {!showTrash && (
                      <button
                        onClick={() => {
                          setShowTrash(true)
                          setSelectedLabel(null)
                        }}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        ゴミ箱
                        {trashNotes.length > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-bold font-mono">
                            {trashNotes.length}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {!showTrash && (
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      ref={noteSearchInputRef}
                      type="text"
                      value={noteSearchQuery}
                      onChange={(e) => setNoteSearchQuery(e.target.value)}
                      placeholder="ノートを検索..."
                      className="w-full pl-11 pr-11 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                    />
                    {noteSearchQuery && (
                      <button
                        onClick={() => setNoteSearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Label Filter Chips - Only for active notes */}
                {!showTrash && (allLabels.length > 0) && (
                  <div className="relative group">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                      <button
                        onClick={() => setSelectedLabel(null)}
                        className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all border ${selectedLabel === null
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                          }`}
                      >
                        すべて
                      </button>

                      {/* Pinned Labels first */}
                      {pinnedLabels.map((label) => (
                        <button
                          key={label}
                          onClick={() => setSelectedLabel(label === selectedLabel ? null : label)}
                          className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all border flex items-center gap-1.5 ${selectedLabel === label
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                        >
                          <Pin className="w-3 h-3 rotate-45" />
                          {label}
                        </button>
                      ))}

                      {/* Manage Labels trigger */}
                      <button
                        onClick={() => setShowLabelManagement(true)}
                        className="px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all border bg-gray-50 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:border-gray-400 dark:hover:border-gray-600 flex items-center gap-1.5"
                      >
                        <Plus className="w-3 h-3" />
                        ラベル管理
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <NoteList
                notes={noteSearchQuery ? noteSearchResults : (showTrash ? trashNotes : notes)}
                loading={noteSearchQuery ? noteSearchLoading : (showTrash ? loadingTrash : loadingNotes)}
                isTrash={showTrash}
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
                onDelete={handleDeleteNote}
                onRestore={handleRestoreNote}
                onPermanentDelete={handlePermanentDeleteNote}
                onLabelClick={(label) => {
                  setSelectedLabel(label)
                  if (label && showTrash) setShowTrash(false)
                }}
                selectedLabel={selectedLabel}
                searchQuery={noteSearchQuery}
              />
            </div>
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

        {pathname !== '/files' && pathname !== '/stats' && pathname !== '/notes' && pathname !== '/models' && (pathname !== '/news' || newsChatArticle) && (
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
            onUrlClick={handleUrlClick}
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
