'use client'

import { X, ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface UrlPreviewModalProps {
  isOpen: boolean
  url: string
  title: string
  content: string
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function UrlPreviewModal({
  isOpen,
  url,
  title,
  content,
  loading,
  onClose,
  onConfirm,
}: UrlPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold text-black dark:text-white">
                URL プレビュー
              </h2>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {url}
            </a>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  タイトル
                </h3>
                <p className="text-lg font-medium text-black dark:text-white">
                  {title || 'タイトルなし'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  コンテンツプレビュー
                </h3>
                <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-xl p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
                    {content || 'コンテンツがありません'}
                  </pre>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                ※ このコンテンツをチャットのコンテキストに含めてよろしいですか？
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !content}
            className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
