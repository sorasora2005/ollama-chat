'use client'

import { Menu, Search, Plus, LogOut, Sun, Moon, FileText, BarChart3, BookOpen, Cpu, MessageSquare, ChevronRight, Newspaper } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChatSession, UserFile } from '../types'

interface SidebarProps {
  sidebarOpen: boolean
  isDarkMode: boolean
  username: string
  sessions: ChatSession[]
  currentSessionId: string | null
  userFiles: UserFile[]
  onToggleSidebar: () => void
  onToggleTheme: () => void
  onShowSearch: () => void
  onCreateNewChat: () => void
  onLoadChatHistory: (sessionId: string) => void
  onLogout: () => void
  onSelectFile: (file: { filename: string, images: string[] }) => void
}

export default function Sidebar({
  sidebarOpen,
  isDarkMode,
  username,
  sessions,
  currentSessionId,
  userFiles,
  onToggleSidebar,
  onToggleTheme,
  onShowSearch,
  onCreateNewChat,
  onLoadChatHistory,
  onLogout,
  onSelectFile,
}: SidebarProps) {
  const router = useRouter()
  const [chatHistoryExpanded, setChatHistoryExpanded] = useState(() => {
    // Initialize from localStorage, default to true if not set
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chatHistoryExpanded')
      return stored === null ? true : stored === 'true'
    }
    return true
  })

  const toggleChatHistory = () => {
    const newState = !chatHistoryExpanded
    setChatHistoryExpanded(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatHistoryExpanded', newState.toString())
    }
  }

  return (
    <>
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} fixed md:relative h-full transition-all duration-300 bg-gray-100 dark:bg-[#252525] border-r border-gray-300 dark:border-[#252525] flex flex-col overflow-hidden z-50 md:z-auto`}>
        <div className="p-4 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
          <button onClick={onToggleSidebar} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
            <Menu className="w-5 h-5 text-black dark:text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTheme}
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
              onClick={onShowSearch}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
            >
              <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <button
          onClick={onCreateNewChat}
          className="m-4 px-4 py-3 bg-white dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg flex items-center gap-3 transition-colors text-black dark:text-white"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">チャットを新規作成</span>
        </button>

        <div className="px-4 space-y-1 mb-2">
          {/* Models Link */}
          <button
            onClick={() => router.push('/models')}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#2d2d2d] rounded-lg transition-colors text-black dark:text-white"
          >
            <Cpu className="w-5 h-5" />
            <span className="text-sm">モデル</span>
          </button>

          {/* Stats Link */}
          <button
            onClick={() => router.push('/stats')}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#2d2d2d] rounded-lg transition-colors text-black dark:text-white"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm">統計情報</span>
          </button>


          {/* Notes Link */}
          <button
            onClick={() => router.push('/notes')}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#2d2d2d] rounded-lg transition-colors text-black dark:text-white"
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-sm">ノート</span>
          </button>

          {/* News Link */}
          <button
            onClick={() => router.push('/news')}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#2d2d2d] rounded-lg transition-colors text-black dark:text-white"
          >
            <Newspaper className="w-5 h-5" />
            <span className="text-sm">ニュース</span>
          </button>

          {/* Files Link */}
          <button
            onClick={() => router.push('/files')}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#2d2d2d] rounded-lg transition-colors text-black dark:text-white"
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm">ファイル</span>
          </button>
        </div>

        <div className="px-4 mb-2">
          <button
            onClick={toggleChatHistory}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-200 dark:hover:bg-[#2d2d2d] rounded-lg transition-colors text-black dark:text-white"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm flex-1 text-left">チャット</span>
            {sessions.length > 0 && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {sessions.length}
              </span>
            )}
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${chatHistoryExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 scrollbar-hide">
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${chatHistoryExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
          >
            <div className="overflow-hidden">
              <div className={`mt-1 space-y-0.5 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${chatHistoryExpanded ? 'translate-y-0' : '-translate-y-4'
                }`}>
                {sessions.map((session) => (
                  <button
                    key={session.session_id}
                    onClick={() => onLoadChatHistory(session.session_id)}
                    className={`w-full text-left px-3 py-2 ml-8 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2d2d2d] transition-colors text-black dark:text-white ${currentSessionId === session.session_id ? 'bg-gray-200 dark:bg-[#2d2d2d]' : ''
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
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-300 dark:border-gray-700">
          <div className="mb-2 px-2 text-xs text-gray-600 dark:text-gray-400">
            {username && `${username} さん`}
          </div>
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 bg-white dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg flex items-center gap-3 transition-colors text-black dark:text-gray-300"
          >
            <LogOut className="w-5 h-5" />
            <span>ログアウト</span>
          </button>
        </div>
      </div>
    </>
  )
}

