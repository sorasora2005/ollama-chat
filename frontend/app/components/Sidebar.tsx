'use client'

import { Menu, Search, Plus, ChevronRight, LogOut, Sun, Moon, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
                      onClick={() => onSelectFile({ filename: file.filename, images: file.images })}
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
                  onClick={() => onLoadChatHistory(session.session_id)}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2d2d2d] transition-colors text-black dark:text-white ${
                    currentSessionId === session.session_id ? 'bg-gray-200 dark:bg-[#2d2d2d]' : ''
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

