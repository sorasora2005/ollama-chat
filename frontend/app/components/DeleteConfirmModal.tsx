'use client'

import { useEffect } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  modelName: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({
  isOpen,
  modelName,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  // Handle Enter key for confirmation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isOpen) {
        onConfirm()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onConfirm])

  if (!isOpen || !modelName) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#2d2d2d] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-300 dark:border-gray-600">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/10 to-red-600/10 dark:from-red-500/20 dark:to-red-600/20 flex items-center justify-center mb-4 border border-red-500/20 dark:border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
            モデルを削除しますか？
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            モデル「<span className="font-medium text-black dark:text-white">{modelName}</span>」を削除します。<br />
            この操作は取り消せません。
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#252525] text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
            >
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              削除する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


