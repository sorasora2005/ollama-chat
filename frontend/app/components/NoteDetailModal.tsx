'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { X, ExternalLink, Download, Trash2, RotateCcw, Tag, Plus } from 'lucide-react'
import { Note } from '../types'

interface NoteDetailModalProps {
  isOpen: boolean
  note: Note | null
  onClose: () => void
  onChatClick?: (sessionId: string) => void
  onExport?: (note: Note) => void
  onDelete?: (noteId: number) => void
  onRestore?: (noteId: number) => void
  onPermanentDelete?: (noteId: number) => void
  onUpdateLabels?: (noteId: number, labels: string[]) => void
  pinnedLabels: string[]
}

export default function NoteDetailModal({
  isOpen,
  note,
  onClose,
  onChatClick,
  onExport,
  onDelete,
  onRestore,
  onPermanentDelete,
  onUpdateLabels,
  pinnedLabels,
}: NoteDetailModalProps) {
  const [newLabel, setNewLabel] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) { // Changed to Escape for modal close
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !note) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#2d2d2d] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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
            {onDelete && note.is_deleted !== 1 && (
              <button
                onClick={() => {
                  onDelete(note.id)
                  onClose()
                }}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                title="ゴミ箱へ移動"
              >
                <Trash2 className="w-4 h-4" />
                <span>削除</span>
              </button>
            )}
            {note.is_deleted === 1 && (
              <div className="flex items-center gap-2">
                {onRestore && (
                  <button
                    onClick={() => {
                      onRestore(note.id)
                      onClose()
                    }}
                    className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
                    title="復元"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>復元</span>
                  </button>
                )}
                {onPermanentDelete && (
                  <button
                    onClick={() => {
                      onPermanentDelete(note.id)
                      onClose()
                    }}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                    title="完全に削除"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>完全に削除</span>
                  </button>
                )}
              </div>
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
          {/* Labels Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <Tag className="w-3 h-3" />
              ラベル
            </div>
            <div className="flex flex-wrap gap-2">
              {(note.labels || []).map((label, idx) => (
                <span
                  key={idx}
                  className="group px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm rounded-md flex items-center gap-2 border border-blue-100 dark:border-blue-800 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {label}
                  <button
                    onClick={() => {
                      if (onUpdateLabels) {
                        const updated = (note.labels || []).filter((_, i) => i !== idx)
                        onUpdateLabels(note.id, updated)
                      }
                    }}
                    className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newLabel.trim() && onUpdateLabels) {
                      const labels = [...(note.labels || []), newLabel.trim()]
                      onUpdateLabels(note.id, Array.from(new Set(labels)))
                      setNewLabel('')
                    }
                  }}
                  placeholder="ラベルを追加..."
                  className="px-3 py-1 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-black dark:text-white min-w-[120px]"
                />
                <button
                  onClick={() => {
                    if (newLabel.trim() && onUpdateLabels) {
                      const labels = [...(note.labels || []), newLabel.trim()]
                      onUpdateLabels(note.id, Array.from(new Set(labels)))
                      setNewLabel('')
                    }
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Pinned Labels for quick selection */}
            {pinnedLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {pinnedLabels
                  .filter(label => !(note.labels || []).includes(label))
                  .map((label) => (
                    <button
                      key={label}
                      onClick={() => {
                        if (onUpdateLabels) {
                          onUpdateLabels(note.id, [...(note.labels || []), label])
                        }
                      }}
                      className="px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded text-[11px] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      + {label}
                    </button>
                  ))}
              </div>
            )}
          </div>

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
          <div className="prose dark:prose-invert max-w-none py-4 px-2">
            <ReactMarkdown
              children={note.content || '生成中...'}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

