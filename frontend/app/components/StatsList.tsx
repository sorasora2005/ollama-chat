'use client'

import { useState, useEffect } from 'react'
import { BarChart3, MessageSquare, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react'
import { api } from '../utils/api'

interface FeedbackStats {
  model: string
  total_messages: number
  total_prompt_tokens: number
  total_completion_tokens: number
  total_tokens: number
  positive_feedback_count: number
  negative_feedback_count: number
  total_feedback_count: number
}

interface StatsListProps {
  userId: number | null
  username: string | null
}

export default function StatsList({ userId, username }: StatsListProps) {
  const [stats, setStats] = useState<FeedbackStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadStats()
    }
  }, [userId, selectedModel])

  const loadStats = async () => {
    if (!userId) return
    try {
      setLoading(true)
      const response = await api.getFeedbackStats(userId, selectedModel || undefined)
      setStats(response.stats)
    } catch (error: any) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(num)
  }

  const totalStats = stats.reduce((acc, stat) => ({
    total_messages: acc.total_messages + stat.total_messages,
    total_tokens: acc.total_tokens + stat.total_tokens,
    positive_feedback_count: acc.positive_feedback_count + stat.positive_feedback_count,
    negative_feedback_count: acc.negative_feedback_count + stat.negative_feedback_count,
    total_feedback_count: acc.total_feedback_count + stat.total_feedback_count,
  }), {
    total_messages: 0,
    total_tokens: 0,
    positive_feedback_count: 0,
    negative_feedback_count: 0,
    total_feedback_count: 0,
  })

  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center flex-1">
        <p className="text-gray-600 dark:text-gray-400">ログインしてください</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="mb-6 flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-black dark:text-white">統計情報</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : stats.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-600 dark:text-gray-400">統計データがありません</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">総メッセージ数</h3>
              </div>
              <p className="text-2xl font-bold text-black dark:text-white">
                {formatNumber(totalStats.total_messages)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">総トークン数</h3>
              </div>
              <p className="text-2xl font-bold text-black dark:text-white">
                {formatNumber(totalStats.total_tokens)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <ThumbsUp className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">フィードバック</h3>
              </div>
              <p className="text-2xl font-bold text-black dark:text-white">
                {formatNumber(totalStats.total_feedback_count)}
              </p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-green-600 dark:text-green-400">
                  👍 {formatNumber(totalStats.positive_feedback_count)}
                </span>
                <span className="text-red-600 dark:text-red-400">
                  👎 {formatNumber(totalStats.negative_feedback_count)}
                </span>
              </div>
            </div>
          </div>

          {/* Model-specific Stats */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">モデル別統計</h2>
            {stats.map((stat) => (
              <div
                key={stat.model}
                className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-6 border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-black dark:text-white">{stat.model}</h3>
                  <button
                    onClick={() => setSelectedModel(selectedModel === stat.model ? null : stat.model)}
                    className="text-sm text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {selectedModel === stat.model ? 'すべて表示' : 'フィルター'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">メッセージ数</p>
                    <p className="text-xl font-bold text-black dark:text-white">
                      {formatNumber(stat.total_messages)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">総トークン数</p>
                    <p className="text-xl font-bold text-black dark:text-white">
                      {formatNumber(stat.total_tokens)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      プロンプト: {formatNumber(stat.total_prompt_tokens)} / 
                      生成: {formatNumber(stat.total_completion_tokens)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">フィードバック</p>
                    <p className="text-xl font-bold text-black dark:text-white">
                      {formatNumber(stat.total_feedback_count)}
                    </p>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {formatNumber(stat.positive_feedback_count)}
                      </span>
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3" />
                        {formatNumber(stat.negative_feedback_count)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">フィードバック率</p>
                    <p className="text-xl font-bold text-black dark:text-white">
                      {stat.total_messages > 0
                        ? ((stat.total_feedback_count / stat.total_messages) * 100).toFixed(1)
                        : '0.0'}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

