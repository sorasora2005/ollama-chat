'use client'

import { BookOpen, Loader2 } from 'lucide-react'
import { Note } from '../types'

interface NoteListProps {
  notes: Note[]
  loading: boolean
  onNoteClick: (note: Note) => void
  onChatClick: (sessionId: string) => void
}

export default function NoteList({ notes, loading, onNoteClick, onChatClick }: NoteListProps) {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="mb-6 flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-black dark:text-white">ノート一覧</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-600 dark:text-gray-400 animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          ノートがありません
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg overflow-hidden transition-colors border border-gray-300 dark:border-gray-700 aspect-square flex flex-col cursor-pointer"
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
                  <div className="text-xs text-gray-600 dark:text-gray-500">
                    {new Date(note.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </button>
              {note.session_id && (
                <div className="px-4 pb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onChatClick(note.session_id)
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
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


