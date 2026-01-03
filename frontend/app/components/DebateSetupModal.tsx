'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Model } from '../types'

interface DebateParticipantSetup {
  model_name: string
  position: string
  participant_order: number
  color: string
}

interface DebateSetupModalProps {
  isOpen: boolean
  models: Model[]
  evaluationModels: string[]
  onClose: () => void
  onCreate: (
    title: string,
    topic: string,
    participants: DebateParticipantSetup[],
    config: any
  ) => void
}

const COLORS = ['blue', 'red', 'green', 'purple', 'orange', 'pink']

const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#10b981',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899'
}


import { useEffect } from 'react'
import { useDefaultModel } from '../hooks/useDefaultModel'

export default function DebateSetupModal({
  isOpen,
  models,
  evaluationModels,
  onClose,
  onCreate
}: DebateSetupModalProps) {
  const { defaultModel } = useDefaultModel()
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [participants, setParticipants] = useState<DebateParticipantSetup[]>([
    { model_name: '', position: '', participant_order: 0, color: 'blue' },
    { model_name: '', position: '', participant_order: 1, color: 'red' }
  ])
  const [maxRounds, setMaxRounds] = useState(3)
  const [openModelIndex, setOpenModelIndex] = useState<number | null>(null)
  const [modelSearch, setModelSearch] = useState<string>('')
  const [evalModelSearch, setEvalModelSearch] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // モーダルが開かれたタイミングで、参加者のデフォルトモデルを設定
  useEffect(() => {
    if (!isOpen) return
    if (!models || models.length === 0) return

    setParticipants(prev =>
      prev.map(p => {
        // 既にユーザーが選択済みなら上書きしない
        if (p.model_name) return p

        const fallbackModel = models[0]?.name || ''
        const modelName =
          defaultModel && models.some(m => m.name === defaultModel)
            ? defaultModel
            : fallbackModel

        return { ...p, model_name: modelName }
      })
    )
  }, [isOpen, models, defaultModel])

  if (!isOpen) return null

  const handleAddParticipant = () => {
    if (participants.length >= 4) return

    setParticipants([
      ...participants,
      {
        model_name: '',
        position: '',
        participant_order: participants.length,
        color: COLORS[participants.length % COLORS.length]
      }
    ])
  }

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 2) return

    setParticipants(
      participants
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, participant_order: i }))
    )
  }

  const handleParticipantChange = (
    index: number,
    field: keyof DebateParticipantSetup,
    value: string
  ) => {
    setParticipants(
      participants.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      )
    )
  }


  const handleCreate = () => {
    // Validation
    if (!title.trim() || !topic.trim()) {
      setErrorMessage('タイトルとトピックを入力してください');
      return;
    }

    const invalidParticipants = participants.filter(
      p => !p.model_name || !p.position
    );
    if (invalidParticipants.length > 0) {
      setErrorMessage('すべての参加者のモデルとポジションを入力してください');
      return;
    }


    setErrorMessage('');
    onCreate(title, topic, participants, { max_rounds: maxRounds });

    // Reset form
    setTitle('');
    setTopic('');
    setParticipants([
      { model_name: '', position: '', participant_order: 0, color: 'blue' },
      { model_name: '', position: '', participant_order: 1, color: 'red' }
    ]);
    setMaxRounds(3);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#2a2a2a] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#2a2a2a] border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black dark:text-white">
            新しいディベートを作成
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6 space-y-6">
          {errorMessage && (
            <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ディベートタイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: AI倫理に関するディベート"
              className="w-full px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ディベートトピック
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例: AIは政府によって規制されるべきか？"
              rows={3}
              className="w-full px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                参加者 ({participants.length}/4)
              </label>
              {participants.length < 4 && (
                <button
                  onClick={handleAddParticipant}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  追加
                </button>
              )}
            </div>

            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg relative"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{
                      backgroundColor: COLOR_MAP[participant.color]
                    }}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => setOpenModelIndex(openModelIndex === index ? null : index)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <span className={participant.model_name ? '' : 'text-gray-400 dark:text-gray-500'}>
                        {participant.model_name || 'モデルを選択'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">▼</span>
                    </button>

                    {openModelIndex === index && (
                      <div className="absolute z-50 mt-1 w-64 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg">
                        <div className="p-2">
                          <input
                            type="text"
                            value={modelSearch}
                            onChange={e => setModelSearch(e.target.value)}
                            placeholder="モデル検索"
                            className="w-full px-2 py-1 text-sm bg-gray-100 dark:bg-[#2a2a2a] border border-gray-300 dark:border-gray-700 rounded-lg mb-2"
                          />
                        </div>
                        {models.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                            利用可能なモデルがありません
                          </div>
                        ) : (
                          models
                            .filter(model =>
                              model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
                              (model.description && model.description.toLowerCase().includes(modelSearch.toLowerCase()))
                            )
                            .map((model) => (
                              <button
                                key={model.name}
                                type="button"
                                onClick={() => {
                                  handleParticipantChange(index, 'model_name', model.name)
                                  setOpenModelIndex(null)
                                  setModelSearch('')
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#2a2a2a] ${participant.model_name === model.name ? 'bg-gray-100 dark:bg-[#2a2a2a]' : ''}`}
                              >
                                <div className="font-medium text-black dark:text-white">{model.name}</div>
                                {model.description && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                    {model.description}
                                  </div>
                                )}
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={participant.position}
                    onChange={(e) => handleParticipantChange(index, 'position', e.target.value)}
                    placeholder="ポジション (例: 賛成, 反対)"
                    className="flex-1 px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {participants.length > 2 && (
                    <button
                      onClick={() => handleRemoveParticipant(index)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Max Rounds */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              最大ラウンド数
            </label>
            <input
              type="number"
              value={maxRounds}
              onChange={(e) => setMaxRounds(parseInt(e.target.value) || 3)}
              min={1}
              max={10}
              className="w-32 px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 評価モデル選択UIは不要のため削除 */}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-[#2a2a2a] border-t border-gray-200 dark:border-gray-800 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            作成
          </button>
        </div>
      </div >
    </div >
  )
}
