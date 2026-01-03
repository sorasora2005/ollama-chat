'use client'

import { Plus, Users, MessageSquare, Clock, Trophy, Trash2 } from 'lucide-react'
import { DebateSession } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface DebateListProps {
  debates: DebateSession[]
  loading: boolean
  onSelectDebate: (debate: DebateSession) => void
  onCreateDebate: () => void
  onDeleteDebate: (debate: DebateSession) => void
}

const STATUS_CONFIG = {
  setup: {
    label: 'セットアップ中',
    color: 'bg-gray-500',
    textColor: 'text-gray-700 dark:text-gray-300'
  },
  active: {
    label: '進行中',
    color: 'bg-green-500',
    textColor: 'text-green-700 dark:text-green-400'
  },
  paused: {
    label: '一時停止',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700 dark:text-yellow-400'
  },
  completed: {
    label: '完了',
    color: 'bg-blue-500',
    textColor: 'text-blue-700 dark:text-blue-400'
  }
}

export default function DebateList({
  debates,
  loading,
  onSelectDebate,
  onCreateDebate,
  onDeleteDebate,
}: DebateListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">
            ディベート
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            AIモデル同士のディベートを作成・管理
          </p>
        </div>
        <button
          onClick={onCreateDebate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          新規作成
        </button>
      </div>

      {/* Debate Grid */}
      {debates.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              ディベートがありません
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              新しいディベートを作成してAIモデル同士の対話を始めましょう
            </p>
            <button
              onClick={onCreateDebate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              最初のディベートを作成
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {debates.map((debate) => {
            const statusConfig = STATUS_CONFIG[debate.status]

            // Backend timestamps are stored in UTC; append 'Z' so the Date
            // constructor treats them as UTC and the relative time is
            // calculated correctly in the user's local timezone (e.g. JST).
            const createdAt = debate.created_at
              ? new Date(debate.created_at.endsWith('Z') ? debate.created_at : `${debate.created_at}Z`)
              : new Date()

            const relativeTime = formatDistanceToNow(createdAt, {
              addSuffix: true,
              locale: ja
            })

            return (
              <div
                key={debate.id}
                className="bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-5 transition-all hover:shadow-lg group cursor-pointer"
                onClick={() => onSelectDebate(debate)}
              >
                {/* Status Badge & Actions */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.textColor}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${statusConfig.color}`}
                    ></span>
                    {statusConfig.label}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteDebate(debate)
                    }}
                    className="p-1.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="ディベートを削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Title */}
                <h3
                  className="text-lg font-semibold text-black dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                >
                  {debate.title}
                </h3>

                {/* Topic */}
                <p
                  className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2"
                >
                  {debate.topic}
                </p>

                {/* Participants Preview */}
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                  <div className="flex -space-x-2">
                    {debate.participants.slice(0, 4).map((participant) => (
                      <div
                        key={participant.id}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-[#2a2a2a]"
                        style={{
                          backgroundColor: participant.color || '#3b82f6'
                        }}
                        title={participant.model_name}
                      >
                        {participant.participant_order + 1}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {debate.participants.length}名
                  </span>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{relativeTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {debate.config?.max_rounds && (
                      <span>最大{debate.config.max_rounds}ラウンド</span>
                    )}
                    {debate.has_evaluation && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-[10px] font-medium text-purple-700 dark:text-purple-200">
                        <Trophy className="w-3 h-3" />
                        評価済み
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
