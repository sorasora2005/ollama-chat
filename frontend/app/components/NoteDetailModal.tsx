'use client'

import { X, ExternalLink, Download } from 'lucide-react'
import { Note } from '../types'

interface NoteDetailModalProps {
  isOpen: boolean
  note: Note | null
  onClose: () => void
  onChatClick?: (sessionId: string) => void
  onExport?: (note: Note) => void
}

export default function NoteDetailModal({
  isOpen,
  note,
  onClose,
  onChatClick,
  onExport,
}: NoteDetailModalProps) {
  if (!isOpen || !note) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2d2d2d] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
              {note.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{new Date(note.created_at).toLocaleString('ja-JP')}</span>
              <span>モデル: {note.model}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExport && note.content && (
              <button
                onClick={() => onExport(note)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                title="ノートをエクスポート"
              >
                <Download className="w-4 h-4" />
                <span>エクスポート</span>
              </button>
            )}
            {note.session_id && onChatClick && (
              <button
                onClick={() => {
                  onChatClick(note.session_id)
                  onClose()
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"
                title="チャットを見る"
              >
                <ExternalLink className="w-4 h-4" />
                <span>チャットを見る</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {note.prompt && (
            <div className="mb-6 p-4 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                プロンプト
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {note.prompt}
              </div>
            </div>
          )}
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-black dark:text-white">
              {note.content || '生成中...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

