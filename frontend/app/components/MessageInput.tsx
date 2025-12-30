'use client'

import { Send, Square, Plus, X, Loader2, FileText } from 'lucide-react'

interface MessageInputProps {
  input: string
  uploading: boolean
  uploadedFile: { filename: string, images: string[] } | null
  loading: boolean
  userId: number | null
  selectedModel: string
  supportsImages: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement>
  fileInputRef: React.RefObject<HTMLInputElement>
  onInputChange: (value: string) => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: () => void
  onSend: () => void
  onCancel: () => void
  onKeyPress: (e: React.KeyboardEvent) => void
}

export default function MessageInput({
  input,
  uploading,
  uploadedFile,
  loading,
  userId,
  selectedModel,
  supportsImages,
  textareaRef,
  fileInputRef,
  onInputChange,
  onFileUpload,
  onRemoveFile,
  onSend,
  onCancel,
  onKeyPress,
}: MessageInputProps) {
  const getFileIconColor = (filename: string) => {
    const filenameLower = filename.toLowerCase()
    if (filenameLower.endsWith('.pdf')) return 'text-red-500'
    if (filenameLower.endsWith('.docx') || filenameLower.endsWith('.doc')) return 'text-blue-500'
    if (filenameLower.endsWith('.xlsx') || filenameLower.endsWith('.xls')) return 'text-green-500'
    if (filenameLower.endsWith('.png') || filenameLower.endsWith('.jpg') || filenameLower.endsWith('.jpeg')) return 'text-yellow-500'
    return 'text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] px-4 py-4 border-t border-gray-300 dark:border-gray-800">
      <div className="max-w-3xl mx-auto">
        {uploading && (
          <div className="mb-3 p-3 bg-gray-100 dark:bg-[#2d2d2d] rounded-lg flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin" />
            <span className="text-sm text-black dark:text-white">ファイルを処理中...</span>
          </div>
        )}

        {uploadedFile && !uploading && (
          <div className="mb-3 p-3 bg-gray-100 dark:bg-[#2d2d2d] rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className={`w-5 h-5 ${getFileIconColor(uploadedFile.filename)}`} />
              <span className="text-sm text-black dark:text-white">{uploadedFile.filename}</span>
              <span className="text-xs text-gray-600 dark:text-gray-500">({uploadedFile.images.length}枚)</span>
            </div>
            <button
              onClick={onRemoveFile}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-center bg-gray-100 dark:bg-[#2d2d2d] rounded-2xl px-3 py-2.5 border border-gray-300 dark:border-gray-700/50">
          <label
            className={`cursor-pointer w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              uploading || !userId || !supportsImages
                ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-[#3d3d3d]'
                : 'bg-gray-200 dark:bg-[#3d3d3d] hover:bg-gray-300 dark:hover:bg-[#4d4d4d]'
            }`}
            title={!supportsImages ? 'このモデルは画像をサポートしていません' : ''}
          >
            <Plus className={`w-4 h-4 ${uploading ? 'animate-pulse' : ''} ${supportsImages ? 'text-gray-700 dark:text-white' : 'text-gray-400'}`} />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.xlsx,.docx"
              onChange={onFileUpload}
              className="hidden"
              disabled={uploading || !userId || !supportsImages}
            />
          </label>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder={uploadedFile ? `${selectedModel}にメッセージを入力して送信...` : `${selectedModel}にメッセージを入力...`}
              rows={1}
              className="w-full px-2 py-1.5 bg-transparent resize-none focus:outline-none text-black dark:text-white placeholder-gray-500"
              style={{ minHeight: '32px', maxHeight: '200px' }}
              disabled={loading || !userId}
            />
          </div>
          <button
            onClick={loading ? onCancel : onSend}
            disabled={(!input.trim() && !uploadedFile && !loading) || !userId}
            className="p-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {loading ? (
              <Square className="w-5 h-5 text-black dark:text-white" />
            ) : (
              <Send className="w-5 h-5 text-black dark:text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


