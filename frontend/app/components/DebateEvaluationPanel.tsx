'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Award } from 'lucide-react'
import { DebateEvaluation, DebateParticipant } from '../types'

interface DebateEvaluationPanelProps {
  evaluations: DebateEvaluation[]
  participants: DebateParticipant[]
  // ユーザー投票で選ばれた勝者（なければ null）
  winnerParticipantId?: number | null
}

const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#10b981',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899'
}

const SCORE_LABELS: Record<string, string> = {
  clarity: '明確性',
  logic: '論理性',
  persuasiveness: '説得力',
  evidence: '根拠',
  overall: '総合'
}

export default function DebateEvaluationPanel({
  evaluations,
  participants,
  winnerParticipantId
}: DebateEvaluationPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedEvals, setExpandedEvals] = useState<Set<number>>(new Set())

  const toggleExpanded = (evalId: number) => {
    const newExpanded = new Set(expandedEvals)
    if (newExpanded.has(evalId)) {
      newExpanded.delete(evalId)
    } else {
      newExpanded.add(evalId)
    }
    setExpandedEvals(newExpanded)
  }

  const getParticipant = (participantId: number): DebateParticipant | undefined => {
    return participants.find(p => p.id === participantId)
  }

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-blue-500'
    if (score >= 4) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getScoreTextColor = (score: number): string => {
    if (score >= 8) return 'text-green-600 dark:text-green-400'
    if (score >= 6) return 'text-blue-600 dark:text-blue-400'
    if (score >= 4) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Find highest overall score for winner badge
  const highestOverall = Math.max(
    ...evaluations.map(e => e.scores?.overall || 0)
  )

  if (evaluations.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-black dark:text-white">
            AI評価
          </h3>
          {evaluations.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-500">
              評価者: {evaluations[0].evaluator_model}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(prev => !prev)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {collapsed ? (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>表示</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>非表示</span>
            </>
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluations.map((evaluation) => {
            const participant = getParticipant(evaluation.participant_id)
            if (!participant) return null

            const isExpanded = expandedEvals.has(evaluation.id)
            const isWinner = evaluation.scores?.overall === highestOverall
            const isUserWinner =
              typeof winnerParticipantId === 'number' && winnerParticipantId === participant.id

            return (
              <div
                key={evaluation.id}
                className={`bg-white dark:bg-[#2a2a2a] rounded-lg p-4 border-2 transition-all ${isUserWinner
                    ? 'border-yellow-500 shadow-lg'
                    : isWinner
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{
                      backgroundColor: participant.color ? COLOR_MAP[participant.color] : '#3b82f6'
                    }}
                  >
                    {participant.participant_order + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-black dark:text-white">
                      {participant.model_name}
                    </div>
                    {participant.position && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {participant.position}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isWinner && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                        <Award className="w-3 h-3" />
                        AI評価トップ
                      </div>
                    )}
                    {isUserWinner && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-[10px] font-semibold text-yellow-800 dark:text-yellow-300">
                        あなたの投票
                      </div>
                    )}
                  </div>
                </div>

                {/* Scores */}
                {evaluation.scores && (
                  <div className="space-y-2 mb-3">
                    {Object.entries(evaluation.scores).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-400">
                            {SCORE_LABELS[key] || key}
                          </span>
                          <span className={`font-bold ${getScoreTextColor(value)}`}>
                            {value}/10
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`${getScoreColor(value)} h-2 rounded-full transition-all`}
                            style={{ width: `${value * 10}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Overall Score Highlight */}
                {evaluation.scores?.overall && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 mb-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      総合スコア
                    </div>
                    <div className={`text-3xl font-bold ${getScoreTextColor(evaluation.scores.overall)}`}>
                      {evaluation.scores.overall}
                      <span className="text-lg text-gray-500 dark:text-gray-500">/10</span>
                    </div>
                  </div>
                )}

                {/* Qualitative Feedback */}
                {evaluation.qualitative_feedback && (
                  <div>
                    <button
                      onClick={() => toggleExpanded(evaluation.id)}
                      className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          詳細を非表示
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          詳細を表示
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-3 whitespace-pre-wrap">
                        {evaluation.qualitative_feedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
