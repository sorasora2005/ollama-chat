import { Menu, Download, ChevronDown, BookOpen, Loader2, X, Search, GitCompare } from 'lucide-react'
import ModelSelector from './ModelSelector'
import GlobalDownloadBadge from './GlobalDownloadBadge'
import { Model, DownloadProgress } from '../types'

interface TopBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  showModelSelector: boolean
  setShowModelSelector: (show: boolean) => void
  selectedModel: string
  models: Model[]
  modelSearchQuery: string
  downloadingModels: Set<string>
  userId: number | null
  onModelSearchChange: (query: string) => void
  onModelChange: (model: string) => void
  onDownloadModel: (modelName: string) => void
  onCancelDownload?: (modelName: string) => void
  currentSessionId: string | null
  messagesLength: number
  onExportChatHistory: () => void
  onCreateNewChat: () => void
  onCreateNote?: () => void
  onShowNoteSearch?: () => void
  pathname?: string
  activeDownloads?: DownloadProgress[]
  onStopDownload?: (modelName: string) => void
  newsChatArticle?: any | null
  comparisonMode?: boolean
  onToggleComparisonMode?: () => void
}

export default function TopBar({
  sidebarOpen,
  onToggleSidebar,
  showModelSelector,
  setShowModelSelector,
  selectedModel,
  models,
  modelSearchQuery,
  downloadingModels,
  userId,
  onModelSearchChange,
  onModelChange,
  onDownloadModel,
  onCancelDownload,
  currentSessionId,
  messagesLength,
  onExportChatHistory,
  onCreateNewChat,
  onCreateNote,
  onShowNoteSearch,
  newsChatArticle,
  pathname,
  activeDownloads,
  onStopDownload,
  comparisonMode,
  onToggleComparisonMode,
}: TopBarProps) {
  return (
    <>
      <div className="h-14 border-b border-gray-300 dark:border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg"
            >
              <Menu className="w-5 h-5 text-black dark:text-white" />
            </button>
          )}
          <button
            onClick={onCreateNewChat}
            className="font-semibold text-black dark:text-white hover:opacity-70 transition-opacity cursor-pointer"
          >
            Ollama Chat
          </button>
        </div>
        <div className="flex items-center gap-3 relative model-selector">
          {/* Global Download Badge */}
          {activeDownloads && activeDownloads.length > 0 && (
            <GlobalDownloadBadge
              downloads={activeDownloads}
              onStop={onStopDownload || (() => { })}
            />
          )}
          {/* Create Note Button - Hide on news list */}
          {currentSessionId && messagesLength > 0 && onCreateNote && (pathname !== '/news' || newsChatArticle) && (
            <button
              onClick={onCreateNote}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3d3d3d] transition-colors"
              title="ノートを作成"
            >
              <BookOpen className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          )}
          {/* Export History Button - Hide on news list */}
          {currentSessionId && messagesLength > 0 && (pathname !== '/news' || newsChatArticle) && (
            <button
              onClick={onExportChatHistory}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3d3d3d] transition-colors"
              title="チャット履歴をエクスポート"
            >
              <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          )}
          {/* Comparison Mode Toggle */}
          {pathname !== '/models' && pathname !== '/stats' && pathname !== '/notes' && pathname !== '/files' && pathname !== '/news' && onToggleComparisonMode && (
            <button
              onClick={onToggleComparisonMode}
              className={`w-10 h-10 flex items-center justify-center border border-gray-300 dark:border-gray-700 rounded-lg transition-colors ${
                comparisonMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-white dark:bg-[#2d2d2d] hover:bg-gray-100 dark:hover:bg-[#3d3d3d] text-gray-700 dark:text-gray-300'
              }`}
              title={comparisonMode ? 'モデル比較モードをオフ' : 'モデル比較モードをオン'}
            >
              <GitCompare className="w-5 h-5" />
            </button>
          )}
          {/* Model Selector - Hide on model management, statistics, notes, and files pages. Also hide on news list (only show when chatting about a news article) */}
          {pathname !== '/models' && pathname !== '/stats' && pathname !== '/notes' && pathname !== '/files' && (pathname !== '/news' || newsChatArticle) && !comparisonMode && (
            <>
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="px-3 w-36 h-10 bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-[#3d3d3d] transition-colors flex items-center justify-between gap-2 text-black dark:text-white"
              >
                <span className="truncate flex-1 text-left">{selectedModel}</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${showModelSelector ? 'rotate-180' : ''}`} />
              </button>

              <ModelSelector
                isOpen={showModelSelector}
                selectedModel={selectedModel}
                models={models}
                modelSearchQuery={modelSearchQuery}
                downloadingModels={downloadingModels}
                userId={userId}
                onModelSearchChange={onModelSearchChange}
                onModelChange={onModelChange}
                onDownloadModel={onDownloadModel}
                onClose={() => setShowModelSelector(false)}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}

