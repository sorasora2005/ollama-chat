'use client'

import { useEffect } from 'react'
import { FileText, X } from 'lucide-react'

interface FilePreviewModalProps {
  isOpen: boolean
  filename: string
  images: string[]
  onClose: () => void
}

export default function FilePreviewModal({
  isOpen,
  filename,
  images,
  onClose,
}: FilePreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="bg-white dark:bg-[#1a1a1a] rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-300 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-black dark:text-white truncate">{filename}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {images.map((image, index) => (
              <div key={index} className="bg-gray-100 dark:bg-[#2d2d2d] rounded-lg p-2">
                <img
                  src={`data:image/png;base64,${image}`}
                  alt={`${filename} - Page ${index + 1}`}
                  className="w-full h-auto rounded"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


