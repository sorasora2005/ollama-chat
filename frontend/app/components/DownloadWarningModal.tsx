'use client'

import { AlertTriangle, Download } from 'lucide-react'

interface DownloadWarningModalProps {
  isOpen: boolean
  modelName: string | null
  sizeRange: { min: number; max: number }
  onConfirm: () => void
  onCancel: () => void
}

export default function DownloadWarningModal({
  isOpen,
  modelName,
  sizeRange,
  onConfirm,
  onCancel,
}: DownloadWarningModalProps) {
  if (!isOpen || !modelName) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#2d2d2d] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-300 dark:border-gray-600">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 flex items-center justify-center border border-blue-500/20 dark:border-purple-500/20">
            <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
              大きなモデルのダウンロード
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              モデル「<span className="font-medium text-black dark:text-white">{modelName}</span>」をダウンロードしようとしています
            </p>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-[#1a1a1a] rounded-lg p-3 mb-5 border border-gray-300 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">推定サイズ</span>
            <span className="text-base font-semibold text-black dark:text-white">
              {sizeRange.min >= 1
                ? `約${sizeRange.min.toFixed(1)} - ${sizeRange.max.toFixed(1)} GB`
                : `約${(sizeRange.min * 1024).toFixed(0)} - ${(sizeRange.max * 1024).toFixed(0)} MB`}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          このモデルは大きいため、ダウンロードに時間がかかる場合があります。
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#252525] text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Download className="w-5 h-5" />
            ダウンロードを開始
          </button>
        </div>
      </div>
    </div>
  )
}

