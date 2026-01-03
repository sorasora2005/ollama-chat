'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Play, Pause, CheckCircle, Send, StopCircle, Trophy, Trash2, Award, ChevronDown, Loader2 } from 'lucide-react'
import { DebateSession, DebateMessage, DebateParticipant, DebateState, DebateEvaluation, DebateVote, Model } from '../types'
import DebateEvaluationPanel from './DebateEvaluationPanel'
import ReactMarkdown from 'react-markdown'

interface DebateArenaViewProps {
  debate: DebateSession
  messages: DebateMessage[]
  evaluations: DebateEvaluation[]
  votes?: DebateVote[]
  debateState: DebateState
  evaluating: boolean
  isAnimating: boolean
  availableEvaluationModels: Model[]
  selectedEvaluationModelName: string | null
  onChangeEvaluationModel: (modelName: string) => void
  currentUserId?: number | null
  onBack: () => void
  onStart: () => void
  onSendTurn: (participantId: number, moderatorPrompt?: string) => void
  onModeratorMessage: (content: string) => void
  onComplete: () => void
  onEvaluate: () => void
  onVote: (winnerId: number, reasoning?: string) => void
  onCancel: () => void
  onDelete: () => void
}

const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#10b981',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899'
}

export default function DebateArenaView({
  debate,
  messages,
  evaluations,
  votes,
  debateState,
  evaluating,
  isAnimating,
  availableEvaluationModels,
  selectedEvaluationModelName,
  onChangeEvaluationModel,
  currentUserId,
  onBack,
  onStart,
  onSendTurn,
  onModeratorMessage,
  onComplete,
  onEvaluate,
  onVote,
  onCancel,
  onDelete,
}: DebateArenaViewProps) {
  // ディベートが最大ラウンドに達したか
  const maxRounds = debate.config.max_rounds || 1;
  const isDebateOver = debateState.currentRound > maxRounds;
  const [moderatorInput, setModeratorInput] = useState('')
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [selectedWinner, setSelectedWinner] = useState<number | null>(null)
  const [voteReasoning, setVoteReasoning] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showModelDropdown, setShowModelDropdown] = useState(false)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 評価開始時にもチャット欄の末尾が見えるようにスクロール
  useEffect(() => {
    if (evaluating) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [evaluating])

  const getParticipantColor = (participantId: number | null): string => {
    if (!participantId) return '#6b7280' // Gray for moderator
    const participant = debate.participants.find(p => p.id === participantId)
    return participant?.color ? COLOR_MAP[participant.color] || '#3b82f6' : '#3b82f6'
  }

  const getParticipantName = (participantId: number | null): string => {
    if (!participantId) return 'モデレーター'
    const participant = debate.participants.find(p => p.id === participantId)
    return participant?.model_name || 'Unknown'
  }

  const getParticipantPosition = (participantId: number | null): string | null => {
    if (!participantId) return null
    const participant = debate.participants.find(p => p.id === participantId)
    return participant?.position || null
  }

  const handleSendModeratorMessage = () => {
    if (moderatorInput.trim()) {
      onModeratorMessage(moderatorInput.trim())
      setModeratorInput('')
    }
  }

  const handleNextTurn = () => {
    const nextParticipant = debate.participants.find(
      p => p.participant_order === debateState.currentTurn
    )
    if (nextParticipant) {
      onSendTurn(nextParticipant.id)
    }
  }

  const handleVote = () => {
    if (selectedWinner) {
      onVote(selectedWinner, voteReasoning.trim() || undefined)
      setShowVoteModal(false)
      setSelectedWinner(null)
      setVoteReasoning('')
    }
  }

  const currentParticipant = debate.participants.find(
    p => p.participant_order === debateState.currentTurn
  )

  const winnerParticipant = debate.winner_participant_id
    ? debate.participants.find(p => p.id === debate.winner_participant_id) || null
    : null

  // 現在のユーザーの投票（コメント含む）
  const userVote = votes && currentUserId
    ? votes.find(v => v.user_id === currentUserId)
    : undefined

  // すべてのラウンドが終わったが、まだ「完了」ボタンが押されていない状態
  const isCompletionPending = debate.status === 'active' && isDebateOver

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-[#2a2a2a] border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              disabled={isCompletionPending}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            {/* ゴミ箱ボタンは履歴画面のみ表示 */}
          </div>

          <div className="flex items-center gap-3">
            {debate.status === 'completed' && availableEvaluationModels.length > 0 && evaluations.length === 0 && (
              <div className="relative flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 mr-1">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">評価モデル</span>
                <button
                  type="button"
                  onClick={() => setShowModelDropdown(prev => !prev)}
                  className="inline-flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 shadow-sm text-xs text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#242424] focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-colors"
                >
                  <span className="max-w-[140px] truncate">
                    {selectedEvaluationModelName && availableEvaluationModels.some(m => m.name === selectedEvaluationModelName)
                      ? selectedEvaluationModelName
                      : availableEvaluationModels[0]?.name || ''}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showModelDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-52 max-h-64 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 py-1">
                    {availableEvaluationModels.map((model) => {
                      const isActive =
                        (selectedEvaluationModelName && selectedEvaluationModelName === model.name) ||
                        (!selectedEvaluationModelName && availableEvaluationModels[0]?.name === model.name)

                      return (
                        <button
                          key={model.name}
                          type="button"
                          onClick={() => {
                            onChangeEvaluationModel(model.name)
                            setShowModelDropdown(false)
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${isActive
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                            : 'text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#242424]'
                            }`}
                        >
                          <span className="truncate mr-2">{model.name}</span>
                          {isActive && (
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-300">
                              選択中
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {debate.status === 'setup' && (
                <button
                  onClick={onStart}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  開始
                </button>
              )}

              {debate.status === 'active' && isDebateOver && (
                <button
                  onClick={onComplete}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  完了
                </button>
              )}

              {debate.status === 'completed' && evaluations.length === 0 && (
                <button
                  onClick={onEvaluate}
                  disabled={evaluating}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <Award className="w-4 h-4" />
                  {evaluating ? 'AI評価中...' : 'AI評価を実行'}
                </button>
              )}

              {debate.status === 'completed' && evaluations.length > 0 && (
                <button
                  onClick={() => {
                    if (winnerParticipant) {
                      setSelectedWinner(winnerParticipant.id)
                    }
                    setShowVoteModal(true)
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Trophy className="w-4 h-4" />
                  {winnerParticipant ? <span>変更</span> : <span>投票</span>}
                </button>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-black dark:text-white mb-1">
          {debate.title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {debate.topic}
        </p>

        {/* Participants */}
        <div className="flex items-center gap-3">
          {debate.participants.map((participant) => {
            const isCurrentGenerating = currentParticipant?.id === participant.id && debateState.isGenerating

            const bgClass = isCurrentGenerating
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : 'bg-gray-100 dark:bg-gray-800'
            const ringClass = isCurrentGenerating ? 'ring-2 ring-blue-500' : ''

            return (
              <div
                key={participant.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${bgClass} ${ringClass}`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: participant.color ? COLOR_MAP[participant.color] : '#3b82f6'
                  }}
                ></div>
                <span className="text-sm font-medium text-black dark:text-white">
                  {participant.model_name}
                </span>
                {participant.position && (
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    ({participant.position})
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Round Info & Status Message */}
        {debate.status === 'active' && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div>
              ラウンド {Math.min(debateState.currentRound, debate.config.max_rounds)}
              {debate.config.max_rounds && ` / ${debate.config.max_rounds}`}
            </div>
            {isDebateOver && (
              <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg inline-flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>
                  設定された最大ラウンドが終了しました。
                  右上の「完了」ボタンを押してディベートを終了してください。
                </span>
              </div>
            )}
          </div>
        )}

        {debate.status === 'completed' && (
          <div className="mt-3 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg inline-flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5" />
            <div className="space-y-1">
              <span>
                このディベートは完了しました。
              </span>
              {winnerParticipant && (
                <span>
                  ユーザー投票の結果、現在の勝者は
                  <span className="font-semibold ml-1">{winnerParticipant.model_name}</span>
                  です。
                </span>
              )}
              {userVote?.reasoning && (
                <div className="mt-2 text-xs text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  <div className="font-semibold mb-1 text-gray-800 dark:text-gray-100">
                    あなたのコメント
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {userVote.reasoning}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const color = getParticipantColor(message.participant_id)
          const name = getParticipantName(message.participant_id)
          const position = getParticipantPosition(message.participant_id)
          const isModerator = message.participant_id === null

          return (
            <div
              key={message.id !== -1 ? message.id : `temp-${index}`}
              className="flex gap-3"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                {isModerator ? 'M' : message.turn_number + 1}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-black dark:text-white">
                    {name}
                  </span>
                  {position && (
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {position}
                    </span>
                  )}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          )
        })}

        {evaluating && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-700 dark:text-gray-200">
            <Loader2 className="w-4 h-4 animate-spin text-gray-700 dark:text-gray-200" />
            <span>AI評価を作成中...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Evaluation Panel */}
      {debate.status === 'completed' && evaluations.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          <DebateEvaluationPanel
            evaluations={evaluations}
            participants={debate.participants}
            winnerParticipantId={debate.winner_participant_id}
          />
        </div>
      )}

      {/* Controls */}
      {debate.status === 'active' && debateState.currentRound <= maxRounds && (
        <div className="bg-white dark:bg-[#2a2a2a] border-t border-gray-200 dark:border-gray-800 p-4">
          {/* Turn Control */}
          <div className="flex items-center gap-3 mb-3">
            {debateState.isGenerating ? (
              <>
                <div className="flex-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>
                    {currentParticipant?.model_name} が応答中...
                  </span>
                </div>
                <button
                  onClick={onCancel}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                >
                  <StopCircle className="w-4 h-4" />
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                  次: {currentParticipant?.model_name}
                </div>
                <button
                  onClick={handleNextTurn}
                  disabled={isAnimating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  次のターン
                </button>
              </>
            )}
          </div>

          {/* Moderator Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={moderatorInput}
              onChange={(e) => setModeratorInput(e.target.value)}
              onKeyDown={(e) => {
                const nativeEvent: any = e.nativeEvent
                const isComposing = nativeEvent?.isComposing || (e as any).isComposing

                if (e.key === 'Enter' && !isComposing) {
                  e.preventDefault()
                  handleSendModeratorMessage()
                }
              }}
              placeholder="モデレーターメッセージ（任意）"
              disabled={debateState.isGenerating}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSendModeratorMessage}
              disabled={!moderatorInput.trim() || debateState.isGenerating}
              className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Vote Modal */}
      {showVoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2a2a2a] rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-black dark:text-white mb-4">
              勝者に投票
            </h3>

            <div className="space-y-3 mb-4">
              {debate.participants.map((participant) => (
                <label
                  key={participant.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedWinner === participant.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                    : 'bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  <input
                    type="radio"
                    name="winner"
                    value={participant.id}
                    checked={selectedWinner === participant.id}
                    onChange={() => setSelectedWinner(participant.id)}
                    className="w-4 h-4"
                  />
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{
                      backgroundColor: participant.color ? COLOR_MAP[participant.color] : '#3b82f6'
                    }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-medium text-black dark:text-white">
                      {participant.model_name}
                    </div>
                    {participant.position && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {participant.position}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <textarea
              value={voteReasoning}
              onChange={(e) => setVoteReasoning(e.target.value)}
              placeholder="理由（任意）"
              rows={3}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowVoteModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleVote}
                disabled={!selectedWinner}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                投票
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
