'use client'

import { Send, Square, Plus, X, Loader2, FileText, Link } from 'lucide-react'

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
  onUrlClick: () => void
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
  onUrlClick,
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

        <div className="flex flex-col bg-gray-100 dark:bg-[#2d2d2d] rounded-3xl px-4 py-3 border border-gray-300 dark:border-gray-700/50 transition-colors focus-within:border-gray-400 dark:focus-within:border-gray-600">
          <div className="w-full relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder={uploadedFile ? `${selectedModel}にメッセージを入力して送信...` : `${selectedModel}にメッセージを入力...`}
              rows={1}
              className="w-full px-0 py-2 bg-transparent resize-none focus:outline-none text-black dark:text-white placeholder-gray-500 min-h-[40px] max-h-[200px]"
              disabled={loading || !userId}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-2">
              <label
                className={`cursor-pointer w-8 h-8 flex items-center justify-center rounded-full transition-colors ${uploading || !userId || !supportsImages
                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                title={!supportsImages ? 'このモデルは画像をサポートしていません' : ''}
              >
                <Plus className={`w-5 h-5 ${uploading ? 'animate-pulse' : ''}`} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.xlsx,.docx"
                  onChange={onFileUpload}
                  className="hidden"
                  disabled={uploading || !userId || !supportsImages}
                />
              </label>
              <button
                onClick={onUrlClick}
                disabled={uploading || !userId}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${uploading || !userId
                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                title="URLからコンテンツを取得"
              >
                <Link className={`w-4 h-4 ${uploading ? 'animate-pulse' : ''}`} />
              </button>
            </div>
            <button
              onClick={loading ? onCancel : onSend}
              disabled={(!input.trim() && !uploadedFile && !loading) || !userId}
              className={`p-2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${(!input.trim() && !uploadedFile && !loading) || !userId
                  ? 'bg-gray-200 dark:bg-[#3d3d3d] text-gray-400 cursor-not-allowed'
                  : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'
                }`}
            >
              {loading ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


