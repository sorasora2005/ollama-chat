import { Menu, Download, ChevronDown, BookOpen, Loader2, X, Search } from 'lucide-react'
import ModelSelector from './ModelSelector'
import { Model } from '../types'

interface TopBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  showModelSelector: boolean
  setShowModelSelector: (show: boolean) => void
  selectedModel: string
  models: Model[]
  modelSearchQuery: string
  downloadingModels: Set<string>
  deletingModels: Set<string>
  onModelSearchChange: (query: string) => void
  onModelChange: (model: string) => void
  onDownloadModel: (modelName: string) => void
  onDeleteModel: (modelName: string) => void
  onCancelDownload?: (modelName: string) => void
  currentSessionId: string | null
  messagesLength: number
  onExportChatHistory: () => void
  onCreateNewChat: () => void
  onCreateNote?: () => void
  onShowNoteSearch?: () => void
  pathname?: string
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
  deletingModels,
  onModelSearchChange,
  onModelChange,
  onDownloadModel,
  onDeleteModel,
  onCancelDownload,
  currentSessionId,
  messagesLength,
  onExportChatHistory,
  onCreateNewChat,
  onCreateNote,
  onShowNoteSearch,
  pathname,
}: TopBarProps) {
  return (
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
        {/* Downloading Indicators */}
        {downloadingModels.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {Array.from(downloadingModels).map((modelName) => (
              <div
                key={modelName}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              >
                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  {modelName}をダウンロード中...
                </span>
                {onCancelDownload && (
                  <button
                    onClick={() => onCancelDownload(modelName)}
                    className="ml-1 p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                    title="ダウンロードをキャンセル"
                  >
                    <X className="w-3 h-3 text-blue-700 dark:text-blue-300" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Note Search Button - Show on notes page */}
        {pathname === '/notes' && onShowNoteSearch && (
          <button
            onClick={onShowNoteSearch}
            className="p-2 bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3d3d3d] transition-colors"
            title="ノートを検索"
          >
            <Search className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}
        {/* Create Note Button */}
        {currentSessionId && messagesLength > 0 && onCreateNote && (
          <button
            onClick={onCreateNote}
            className="p-2 bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3d3d3d] transition-colors"
            title="ノートを作成"
          >
            <BookOpen className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}
        {/* Export History Button */}
        {currentSessionId && messagesLength > 0 && (
          <button
            onClick={onExportChatHistory}
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

        <ModelSelector
          isOpen={showModelSelector}
          selectedModel={selectedModel}
          models={models}
          modelSearchQuery={modelSearchQuery}
          downloadingModels={downloadingModels}
          deletingModels={deletingModels}
          onModelSearchChange={onModelSearchChange}
          onModelChange={onModelChange}
          onDownloadModel={onDownloadModel}
          onDeleteModel={onDeleteModel}
          onClose={() => setShowModelSelector(false)}
        />
      </div>
    </div>
  )
}

