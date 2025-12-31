'use client'

import { useState, useEffect } from 'react'
import { Loader2, X } from 'lucide-react'
import { DownloadProgress } from '../types'
import { formatBytes } from '../utils/downloadUtils'

interface DownloadProgressIndicatorProps {
  downloads: DownloadProgress[]
  onStop: (modelName: string) => void
}

export default function DownloadProgressIndicator({
  downloads,
  onStop
}: DownloadProgressIndicatorProps) {
  const [confirmingModel, setConfirmingModel] = useState<string | null>(null)

  // Handle Enter key for confirmation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && confirmingModel) {
        handleConfirmStop()
      }
    }

    if (confirmingModel) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [confirmingModel])

  if (downloads.length === 0) return null

  const handleStopClick = (modelName: string) => {
    setConfirmingModel(modelName)
  }

  const handleConfirmStop = () => {
    if (confirmingModel) {
      onStop(confirmingModel)
      setConfirmingModel(null)
    }
  }

  const handleCancelStop = () => {
    setConfirmingModel(null)
  }

  return (
    <>
    <div className="mb-6 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          ダウンロード中 ({downloads.length})
        </div>
      </div>

      <div className="space-y-2">
        {downloads.map((download) => (
          <div
            key={download.modelName}
            className="px-3 py-3 bg-white dark:bg-[#2d2d2d] rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-black dark:text-gray-300">
                  {download.modelName}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {download.status === 'downloading' ? (
                    download.totalBytes > 0 ? (
                      <>
                        {download.progress}% - {formatBytes(download.completedBytes)} / {formatBytes(download.totalBytes)}
                      </>
                    ) : (
                      '準備中...'
                    )
                  ) : (
                    '一時停止中'
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-3">
                <button
                  onClick={() => handleStopClick(download.modelName)}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="停止"
                >
                  <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              {download.progress > 0 ? (
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${download.progress}%` }}
                />
              ) : (
                <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
              )}
            </div>

            {download.error && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                エラー: {download.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

      {/* Confirmation Modal */}
      {confirmingModel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border border-gray-300 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              ダウンロードをキャンセルしますか？
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {confirmingModel} のダウンロードを停止します。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelStop}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                停止
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
