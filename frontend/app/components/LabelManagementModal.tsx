'use client'

import { X, Tag, Pin, PinOff, Search } from 'lucide-react'
import { useState } from 'react'

interface LabelManagementModalProps {
  isOpen: boolean
  onClose: () => void
  allLabels: string[]
  pinnedLabels: string[]
  onTogglePin: (label: string) => void
  onLabelClick: (label: string) => void
}

export default function LabelManagementModal({
  isOpen,
  onClose,
  allLabels,
  pinnedLabels,
  onTogglePin,
  onLabelClick,
}: LabelManagementModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  const filteredLabels = allLabels.filter(label =>
    label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-black dark:text-white">ラベル管理</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Search labels */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ラベルを検索..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#2d2d2d] border-none rounded-xl text-sm text-black dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2 -mr-2 scrollbar-hide">
            {/* Pinned Labels */}
            {pinnedLabels.length > 0 && !searchQuery && (
              <section>
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                  <Pin className="w-3 h-3 rotate-45" /> ピン留め
                </h3>
                <div className="grid grid-cols-1 gap-1">
                  {pinnedLabels.map((label) => (
                    <div key={label} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 group transition-colors">
                      <button
                        onClick={() => {
                          onLabelClick(label)
                          onClose()
                        }}
                        className="flex items-center gap-3 text-sm text-black dark:text-white"
                      >
                        <Tag className="w-4 h-4 text-blue-500" />
                        {label}
                      </button>
                      <button
                        onClick={() => onTogglePin(label)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="ピンを外す"
                      >
                        <PinOff className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* All / Filtered Labels */}
            <section>
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                {searchQuery ? '検索結果' : 'すべてのラベル'}
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {filteredLabels.length === 0 ? (
                  <p className="text-sm text-gray-500 italic px-2">ラベルが見つかりません</p>
                ) : (
                  filteredLabels.map((label) => {
                    const isPinned = pinnedLabels.includes(label)
                    return (
                      <div key={label} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 group transition-colors">
                        <button
                          onClick={() => {
                            onLabelClick(label)
                            onClose()
                          }}
                          className="flex items-center gap-3 text-sm text-black dark:text-white"
                        >
                          <Tag className="w-4 h-4 text-gray-400" />
                          {label}
                        </button>
                        <button
                          onClick={() => onTogglePin(label)}
                          className={`p-1.5 transition-colors ${isPinned ? 'text-blue-500 hover:text-red-500' : 'text-gray-300 hover:text-blue-500'
                            }`}
                          title={isPinned ? 'ピンを外す' : 'ピン留めする'}
                        >
                          {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4 rotate-45" />}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
