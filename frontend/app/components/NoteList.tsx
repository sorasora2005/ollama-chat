'use client'

import { BookOpen, Loader2, Trash2, RotateCcw, Tag, X, Search } from 'lucide-react'
import { Note } from '../types'

interface NoteListProps {
  notes: Note[]
  loading: boolean
  isTrash?: boolean
  onNoteClick: (note: Note) => void
  onChatClick: (sessionId: string) => void
  onDelete?: (noteId: number) => void
  onRestore?: (noteId: number) => void
  onPermanentDelete?: (noteId: number) => void
  onLabelClick?: (label: string | null) => void
  selectedLabel?: string | null
  searchQuery?: string
}

export default function NoteList({
  notes,
  loading,
  isTrash,
  onNoteClick,
  onChatClick,
  onDelete,
  onRestore,
  onPermanentDelete,
  onLabelClick,
  selectedLabel,
  searchQuery
}: NoteListProps) {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {searchQuery ? (
            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : selectedLabel ? (
            <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {searchQuery ? (
              <span>「{searchQuery}」の検索結果</span>
            ) : selectedLabel ? (
              <span>「{selectedLabel}」の{isTrash ? 'ゴミ箱' : 'ノート'}</span>
            ) : (
              isTrash ? 'ゴミ箱' : 'ノート一覧'
            )}
          </h2>
        </div>
        {selectedLabel && onLabelClick && (
          <button
            onClick={() => onLabelClick(null)}
            className="text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
          >
            <span>解除</span>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-600 dark:text-gray-400 animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          {searchQuery ? '一致するノートが見つかりませんでした' : 'ノートがありません'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group relative bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg overflow-hidden transition-colors border border-gray-300 dark:border-gray-700 aspect-square flex flex-col cursor-pointer"
            >
              <button
                onClick={() => onNoteClick(note)}
                className="flex-1 w-full flex flex-col p-4 text-left"
              >
                <div className="flex-1 flex items-center justify-center mb-2">
                  <BookOpen className="w-12 h-12 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-shrink-0">
                  <div className="text-sm font-semibold text-black dark:text-white mb-1 line-clamp-2">
                    {note.title}
                  </div>
                  {note.labels && note.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {note.labels.map((label, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onLabelClick) onLabelClick(label)
                          }}
                          className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] rounded flex items-center gap-1 border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors z-20"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-600 dark:text-gray-500">
                    {new Date(note.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </button>

              {onDelete && !isTrash && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(note.id)
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-[#1a1a1a]/80 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-all z-10"
                  title="ゴミ箱へ移動"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {isTrash && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                  {onRestore && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRestore(note.id)
                      }}
                      className="p-1.5 bg-white/80 dark:bg-[#1a1a1a]/80 hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded-md transition-all"
                      title="復元"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  {onPermanentDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onPermanentDelete(note.id)
                      }}
                      className="p-1.5 bg-white/80 dark:bg-[#1a1a1a]/80 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md transition-all"
                      title="完全に削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {note.session_id && (
                <div className="px-4 pb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onChatClick(note.session_id!)
                    }}
                    className="w-full py-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1"
                  >
                    チャットを見る
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
