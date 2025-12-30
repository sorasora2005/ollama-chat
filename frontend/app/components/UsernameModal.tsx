'use client'

import { Plus } from 'lucide-react'
import { UserInfo } from '../types'

interface UsernameModalProps {
  isOpen: boolean
  users: UserInfo[]
  showNewUserForm: boolean
  newUsername: string
  onNewUsernameChange: (value: string) => void
  onSelectUser: (userId: number, username: string) => void
  onCreateUser: (username: string) => void
  onShowNewUserForm: (show: boolean) => void
}

export default function UsernameModal({
  isOpen,
  users,
  showNewUserForm,
  newUsername,
  onNewUsernameChange,
  onSelectUser,
  onCreateUser,
  onShowNewUserForm,
}: UsernameModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#2d2d2d] rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">ユーザーを選択</h2>

        {!showNewUserForm ? (
          <>
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
                      onClick={() => onSelectUser(user.id, user.username)}
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

            <button
              onClick={() => onShowNewUserForm(true)}
              className="w-full bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white py-2 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>新規ユーザーを作成</span>
            </button>
          </>
        ) : (
          <>
            <div className="mb-4">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => onNewUsernameChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newUsername.trim()) {
                    onCreateUser(newUsername.trim())
                  }
                }}
                placeholder="ユーザー名を入力"
                className="w-full px-4 py-2 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-600 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 text-black dark:text-white"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onShowNewUserForm(false)
                    onNewUsernameChange('')
                  }}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => onCreateUser(newUsername.trim())}
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
  )
}

