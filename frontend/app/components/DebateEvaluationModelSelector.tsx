"use client"

import { useState, useMemo, useEffect } from 'react'
import { Model } from '../types'
import { useModelManagement } from '../hooks/useModelManagement'
import { useDefaultModel } from '../hooks/useDefaultModel'

interface DebateEvaluationModelSelectorProps {
  isOpen: boolean
  models: Model[]
  defaultModelName?: string | null
  onConfirm: (modelName: string) => void
  onCancel: () => void
}

export default function DebateEvaluationModelSelector(props: DebateEvaluationModelSelectorProps) {
  const { isOpen, models, defaultModelName, onConfirm, onCancel } = props;
  if (!isOpen) return null;

  const { defaultModel, setDefaultModel } = useDefaultModel();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const { filterModels, isCloudModel, groupModelsByFamily, getFamilyDisplayName } = useModelManagement();

  useEffect(() => {
    let initialModel: string | null = null;
    // defaultModelが有効なら最優先で選択
    if (defaultModel && models.some(m => m.name === defaultModel)) {
      initialModel = defaultModel;
    } else if (defaultModelName && models.some(m => m.name === defaultModelName)) {
      initialModel = defaultModelName;
    } else if (models.length > 0) {
      initialModel = models[0].name;
    }
    setSelectedModel(initialModel);
    setModelSearch('');
  }, [defaultModelName, defaultModel, models]);

  // Escキーでモーダルを閉じる（他モーダルと挙動を揃える）
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onCancel])

  // ローカル・クラウド両方をグループ化
  const downloadedModels = useMemo(() => models.filter(m => m.downloaded), [models])
  const cloudModels = useMemo(() => models.filter(m => isCloudModel(m)), [models, isCloudModel])
  const filteredDownloaded = filterModels(downloadedModels, modelSearch)
  const filteredCloud = filterModels(cloudModels, modelSearch)
  const downloadedGrouped = useMemo(() => groupModelsByFamily(filteredDownloaded), [filteredDownloaded])
  const cloudGrouped = useMemo(() => groupModelsByFamily(filteredCloud), [filteredCloud])

  const handleConfirm = () => {
    if (!selectedModel) return
    onConfirm(selectedModel)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      <div
        className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-lg font-bold text-black dark:text-white">
              評価モデルを選択
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              ディベートのAI評価に使用するモデルを選んでください
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="text-gray-400 text-lg leading-none">×</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={modelSearch}
              onChange={e => setModelSearch(e.target.value)}
              placeholder="モデル名・説明で検索..."
              className="w-full pl-3 pr-3 py-2 bg-gray-100 dark:bg-[#2d2d2d] border-none rounded-xl text-sm text-black dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1 -mr-1 scrollbar-hide">
            {/* ローカルモデル */}
            {Object.keys(downloadedGrouped).length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 px-0.5">
                  ローカルモデル
                </div>
                {Object.keys(downloadedGrouped).sort().map(family => (
                  <div key={family} className="mb-2">
                    <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1 px-0.5">
                      {getFamilyDisplayName(family)}
                    </div>
                    {downloadedGrouped[family].map(model => (
                      <label
                        key={model.name}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all text-xs ${selectedModel === model.name
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-500'
                          : 'bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                      >
                        <input
                          type="radio"
                          name="evaluationModel"
                          value={model.name}
                          checked={selectedModel === model.name}
                          onChange={() => setSelectedModel(model.name)}
                          className="w-3.5 h-3.5"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-black dark:text-white text-xs leading-snug">{model.name}</div>
                          {model.description && (
                            <div className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-snug">{model.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {/* クラウドモデル */}
            {Object.keys(cloudGrouped).length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 px-0.5">
                  クラウドモデル
                </div>
                {Object.keys(cloudGrouped).sort().map(family => (
                  <div key={family} className="mb-2">
                    <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1 px-0.5">
                      {getFamilyDisplayName(family)}
                    </div>
                    {cloudGrouped[family].map(model => (
                      <label
                        key={model.name}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all text-xs ${selectedModel === model.name
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-500'
                          : 'bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                      >
                        <input
                          type="radio"
                          name="evaluationModel"
                          value={model.name}
                          checked={selectedModel === model.name}
                          onChange={() => setSelectedModel(model.name)}
                          className="w-3.5 h-3.5"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-black dark:text-white text-xs leading-snug">{model.name}</div>
                          {model.description && (
                            <div className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-snug">{model.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {/* どちらもなければ */}
            {Object.keys(downloadedGrouped).length === 0 && Object.keys(cloudGrouped).length === 0 && (
              <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                利用可能なモデルがありません。ローカルモデルをダウンロードするか、クラウドモデルのAPIキーを登録してください。
              </div>
            )}
          </div>
          {/* Footer */}
          <div className="px-4 pb-4 pt-1 flex gap-3 text-sm border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedModel}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              このモデルで評価
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
