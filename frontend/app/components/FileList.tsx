'use client'

import { FileText, Loader2 } from 'lucide-react'
import { UserFile } from '../types'

interface FileListProps {
  files: UserFile[]
  loading: boolean
  onFileClick: (sessionId: string) => void
}

export default function FileList({ files, loading, onFileClick }: FileListProps) {
  const getFileIconColor = (filename: string) => {
    const filenameLower = filename.toLowerCase()
    if (filenameLower.endsWith('.pdf')) return 'text-red-500'
    if (filenameLower.endsWith('.docx') || filenameLower.endsWith('.doc')) return 'text-blue-500'
    if (filenameLower.endsWith('.xlsx') || filenameLower.endsWith('.xls')) return 'text-green-500'
    if (filenameLower.endsWith('.png') || filenameLower.endsWith('.jpg') || filenameLower.endsWith('.jpeg')) return 'text-yellow-500'
    return 'text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="mb-6 flex items-center gap-3">
        <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-black dark:text-white">ファイル一覧</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-600 dark:text-gray-400 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          送信したファイルがありません
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => {
            const iconColor = getFileIconColor(file.filename)

            return (
              <button
                key={file.message_id}
                onClick={() => onFileClick(file.session_id)}
                className="text-left bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg overflow-hidden transition-colors border border-gray-300 dark:border-gray-700 aspect-square flex flex-col"
              >
                {file.images && file.images.length > 0 ? (
                  <div className="flex-1 w-full overflow-hidden bg-gray-800">
                    <img
                      src={`data:image/png;base64,${file.images[0]}`}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex-1 w-full flex items-center justify-center bg-gray-800">
                    <FileText className={`w-12 h-12 ${iconColor}`} />
                  </div>
                )}
                <div className="p-2 flex-shrink-0">
                  <div className="text-xs text-gray-600 dark:text-gray-500">
                    {file.images.length}枚 • {new Date(file.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

