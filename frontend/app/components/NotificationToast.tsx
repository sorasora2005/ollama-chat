'use client'

import { X } from 'lucide-react'

interface NotificationToastProps {
  notification: { message: string, type: 'success' | 'error' | 'info' } | null
  onClose: () => void
}

export default function NotificationToast({ notification, onClose }: NotificationToastProps) {
  if (!notification) return null

  return (
    <div className="fixed bottom-4 left-4 z-50" style={{ animation: 'slideIn 0.3s ease-out' }}>
      <div className="px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[200px] max-w-[400px] border bg-white dark:bg-[#2d2d2d] border-gray-300 dark:border-gray-600">
        <div className="flex-1">
          <p className="text-sm font-medium text-black dark:text-white">{notification.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}


