'use client'

import { BarChart3, X } from 'lucide-react'

interface ModelStat {
  model_name: string
  total_tokens: number
  prompt_tokens: number
  completion_tokens: number
  conversation_count: number
}

interface ModelStatsModalProps {
  isOpen: boolean
  modelStats: ModelStat[] | null
  onClose: () => void
}

export default function ModelStatsModal({
  isOpen,
  modelStats,
  onClose,
}: ModelStatsModalProps) {
  if (!isOpen || !modelStats) return null

  return (
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
            onClick={onClose}
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
                  <div className="bg-white dark:bg-[#252525] rounded-lg p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">総トークン数</div>
                    <div className="text-xl font-bold text-black dark:text-white">{stat.total_tokens.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      プロンプト: {stat.prompt_tokens.toLocaleString()} | 完了: {stat.completion_tokens.toLocaleString()}
                    </div>
                  </div>

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
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}


