'use client'

import { CheckCircle } from 'lucide-react'

interface DownloadSuccessModalProps {
  isOpen: boolean
  modelName: string | null
  onClose: () => void
}

export default function DownloadSuccessModal({
  isOpen,
  modelName,
  onClose,
}: DownloadSuccessModalProps) {
  if (!isOpen || !modelName) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#2d2d2d] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-300 dark:border-gray-600">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 flex items-center justify-center mb-4 border border-blue-500/20 dark:border-purple-500/20">
            <CheckCircle className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
            ダウンロード完了
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            モデル「<span className="font-medium text-black dark:text-white">{modelName}</span>」のダウンロードが完了しました
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

