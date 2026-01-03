import { useState, useRef } from 'react'
import { DebateSession, DebateMessage, DebateState, DebateEvaluation, DebateVote } from '../types'
import { api } from '../utils/api'
import { logger } from '../utils/logger'

export function useDebateManagement(
  userId: number | null,
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void,
  evaluationModel?: string | null,
) {
  const [debates, setDebates] = useState<DebateSession[]>([])
  const [currentDebate, setCurrentDebate] = useState<DebateSession | null>(null)
  const [debateMessages, setDebateMessages] = useState<DebateMessage[]>([])
  const [debateEvaluations, setDebateEvaluations] = useState<DebateEvaluation[]>([])
  const [debateVotes, setDebateVotes] = useState<DebateVote[]>([])
  const [debateState, setDebateState] = useState<DebateState>({
    currentRound: 1,
    currentTurn: 0,
    isGenerating: false,
    currentParticipantId: null
  })
  const [loadingDebates, setLoadingDebates] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cloudモデルかどうかを簡易判定（名前ベース）
  const isCloudModelName = (name?: string | null): boolean => {
    if (!name) return false
    const lower = name.toLowerCase()
    return (
      lower.includes('gpt-') ||
      lower.includes('claude') ||
      lower.includes('gemini') ||
      lower.includes('grok')
    )
  }

  /**
   * Load all debates for the user
   */
  const loadDebates = async (status?: string) => {
    if (!userId) return
    setLoadingDebates(true)
    try {
      const debatesData = await api.getUserDebates(userId, status)
      setDebates(debatesData)
    } catch (error: any) {
      logger.error('Failed to load debates:', error)
      const detail = error?.response?.data?.detail
      const message = typeof detail === 'string'
        ? detail
        : (error.message || JSON.stringify(detail || {}))
      showNotification(`ディベートの取得に失敗しました: ${message}`, 'error')
    } finally {
      setLoadingDebates(false)
    }
  }

  /**
   * Load a specific debate
   */
  const loadDebate = async (debateId: number) => {
    try {
      const debate = await api.getDebate(debateId)
      setCurrentDebate(debate)

      // Always use the freshly fetched messages for state calculation
      const messages = await loadDebateMessages(debateId)

      // Initialize debate state based on latest messages
      const maxRoundConfig = debate.config?.max_rounds ?? 1
      const maxRound = messages.length > 0
        ? Math.max(...messages.map(m => m.round_number))
        : 1
      // currentRoundは1以上、maxRoundConfig以下に制限
      const safeRound = Math.max(1, Math.min(maxRound, maxRoundConfig))
      const messagesInRound = messages.filter(m => m.round_number === safeRound)
      const maxTurn = messagesInRound.length > 0
        ? Math.max(...messagesInRound.map(m => m.turn_number))
        : -1

      setDebateState({
        currentRound: safeRound,
        currentTurn: maxTurn + 1,
        isGenerating: false,
        currentParticipantId: null
      })

      // Load evaluations if completed
      if (debate.status === 'completed') {
        await loadEvaluations(debateId)
        // ユーザー投票（理由含む）も読み込む
        try {
          const votes = await api.getDebateVotes(debateId)
          setDebateVotes(votes)
        } catch (voteError: any) {
          logger.error('Failed to load debate votes:', voteError)
        }
      }
    } catch (error: any) {
      logger.error('Failed to load debate:', error)
      const detail = error?.response?.data?.detail
      const message = typeof detail === 'string'
        ? detail
        : (error.message || JSON.stringify(detail || {}))
      showNotification(`ディベートの取得に失敗しました: ${message}`, 'error')
    }
  }

  /**
   * Load messages for a debate
   *
   * Returns the fetched messages so callers can safely use them
   * for state calculations instead of relying on async state updates.
   */
  const loadDebateMessages = async (debateId: number, roundNumber?: number) => {
    setLoadingMessages(true)
    try {
      const messages = await api.getDebateMessages(debateId, roundNumber)
      setDebateMessages(messages)
      return messages
    } catch (error: any) {
      logger.error('Failed to load debate messages:', error)
      showNotification(
        `メッセージの取得に失敗しました: ${error.response?.data?.detail || error.message}`,
        'error'
      )
      return []
    } finally {
      setLoadingMessages(false)
    }
  }

  /**
   * Load evaluations for a debate
   */
  const loadEvaluations = async (debateId: number) => {
    try {
      const evals = await api.getDebateEvaluations(debateId)
      setDebateEvaluations(evals)
    } catch (error: any) {
      logger.error('Failed to load evaluations:', error)
    }
  }

  /**
   * Create a new debate
   */
  const createDebate = async (
    title: string,
    topic: string,
    participants: Array<{
      model_name: string
      position?: string
      participant_order: number
      color?: string
    }>,
    config?: any
  ) => {
    if (!userId) return

    try {
      // max_roundsが未指定ならデフォルト3
      const safeConfig = {
        ...config,
        max_rounds: config?.max_rounds ?? 3
      }
      const debate = await api.createDebate({
        creator_id: userId,
        title,
        topic,
        participants,
        config: safeConfig
      })

      showNotification('ディベートを作成しました', 'success')
      await loadDebates()
      return debate
    } catch (error: any) {
      logger.error('Failed to create debate:', error)
      showNotification(
        `ディベート作成に失敗しました: ${error.response?.data?.detail || error.message}`,
        'error'
      )
    }
  }

  /**
   * Start a debate
   */
  const startDebate = async (debateId: number) => {
    try {
      await api.startDebate(debateId)
      await loadDebate(debateId)
      showNotification('ディベートを開始しました', 'success')
    } catch (error: any) {
      logger.error('Failed to start debate:', error)
      showNotification(
        `ディベート開始に失敗しました: ${error.response?.data?.detail || error.message}`,
        'error'
      )
    }
  }

  /**
   * Send a debate turn (with streaming)
   */
  const sendDebateTurn = async (
    participantId: number,
    moderatorPrompt?: string
  ) => {
    if (!currentDebate) return

    // このターンの参加者とモデル名を特定
    const participant = currentDebate.participants.find(p => p.id === participantId)
    const isCloudTurn = isCloudModelName(participant?.model_name)

    // クラウドモデルの応答ではタイピングアニメーションを有効化
    setIsAnimating(isCloudTurn)

    // ラウンド番号とターン番号は開始時の値を固定で使う
    const turnRound = debateState.currentRound
    const turnIndex = debateState.currentTurn

    setDebateState(prev => ({
      ...prev,
      isGenerating: true,
      currentParticipantId: participantId
    }))

    abortControllerRef.current = new AbortController()

    try {
      const response = await api.sendDebateTurn(
        {
          debate_session_id: currentDebate.id,
          participant_id: participantId,
          round_number: turnRound,
          turn_number: turnIndex,
          moderator_prompt: moderatorPrompt
        },
        abortControllerRef.current.signal
      )

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let typingInterval: ReturnType<typeof setInterval> | null = null
      let doneEventData: any = null

      // Create temporary message for streaming display
      const tempMessage: DebateMessage = {
        id: -1,
        debate_session_id: currentDebate.id,
        participant_id: participantId,
        content: '',
        round_number: turnRound,
        turn_number: turnIndex,
        message_type: 'argument',
        prompt_tokens: null,
        completion_tokens: null,
        response_time: null,
        created_at: new Date().toISOString()
      }

      setDebateMessages(prev => [...prev, tempMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.content) {
                accumulatedContent += data.content

                // ローカル(Ollama)は従来通りストリーミング更新、
                // クラウドモデルは後でタイピングアニメーションするためここでは反映しない
                if (!isCloudTurn) {
                  setDebateMessages(prev =>
                    prev.map(m =>
                      m.id === -1 && m.round_number === turnRound && m.turn_number === turnIndex
                        ? { ...m, content: accumulatedContent }
                        : m
                    )
                  )
                }
              }

              if (data.done) {
                doneEventData = data

                if (isCloudTurn) {
                  // クラウドモデルは蓄積したテキストをタイピングアニメーションで表示
                  const fullText = accumulatedContent
                  let currentLength = 0

                  typingInterval = setInterval(() => {
                    currentLength += 1
                    const nextContent = fullText.slice(0, currentLength)

                    setDebateMessages(prev =>
                      prev.map(m =>
                        m.id === -1 && m.round_number === turnRound && m.turn_number === turnIndex
                          ? { ...m, content: nextContent }
                          : m
                      )
                    )

                    if (currentLength >= fullText.length) {
                      if (typingInterval) {
                        clearInterval(typingInterval)
                        typingInterval = null
                      }

                      // アニメーション完了
                      setIsAnimating(false)

                      // タイピング完了後、サーバー側の正式なメッセージで置き換え
                      // （必要であればトークン数などを反映するために再取得）
                      loadDebateMessages(currentDebate.id).catch(err => {
                        logger.error('Failed to refresh debate messages after typing animation:', err)
                      })
                    }
                  }, 10)
                } else {
                  // ローカルモデルは従来通り即時反映
                  await loadDebateMessages(currentDebate.id)
                }

                // Advance to next turn
                const nextTurn = turnIndex + 1
                const participantCount = currentDebate.participants.length
                const maxRounds = currentDebate.config?.max_rounds ?? 1

                if (nextTurn >= participantCount) {
                  const isLastRound = turnRound >= maxRounds

                  // Only when the final round has just finished, post an automatic summary message
                  if (isLastRound) {
                    try {
                      await api.sendModeratorMessage(
                        currentDebate.id,
                        'すべてのラウンドが終了しました。',
                        turnRound
                      )
                      await loadDebateMessages(currentDebate.id)
                    } catch (error) {
                      logger.error('Failed to send automatic final-round moderator message:', error)
                    }
                  }

                  // Start new round (will move beyond maxRounds so UI can detect debate end)
                  setDebateState(prev => ({
                    ...prev,
                    currentRound: prev.currentRound + 1,
                    currentTurn: 0,
                    isGenerating: false,
                    currentParticipantId: null
                  }))
                } else {
                  // Continue in same round
                  setDebateState(prev => ({
                    ...prev,
                    currentTurn: nextTurn,
                    isGenerating: false,
                    currentParticipantId: null
                  }))
                }
              }

              if (data.error) {
                showNotification(`エラー: ${data.error}`, 'error')
                setDebateState(prev => ({
                  ...prev,
                  isGenerating: false,
                  currentParticipantId: null
                }))
                setIsAnimating(false)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        logger.error('Failed to send debate turn:', error)
        showNotification(
          `ターン送信に失敗しました: ${error.message}`,
          'error'
        )
      }
      setDebateState(prev => ({
        ...prev,
        isGenerating: false,
        currentParticipantId: null
      }))
      setIsAnimating(false)
      // Remove temporary message on error
      setDebateMessages(prev => prev.filter(m => m.id !== -1))
    }
  }

  /**
   * Send moderator intervention
   */
  const sendModeratorMessage = async (content: string) => {
    if (!currentDebate) return

    try {
      await api.sendModeratorMessage(
        currentDebate.id,
        content,
        debateState.currentRound
      )
      await loadDebateMessages(currentDebate.id)
      showNotification('モデレーターメッセージを送信しました', 'success')
    } catch (error: any) {
      logger.error('Failed to send moderator message:', error)
      showNotification(
        `メッセージ送信に失敗しました: ${error.response?.data?.detail || error.message}`,
        'error'
      )
    }
  }

  /**
   * Complete debate and trigger AI evaluation
   */
  const completeDebate = async (overrideEvaluationModel?: string) => {
    if (!currentDebate) return

    try {
      await api.completeDebate(currentDebate.id)
      await loadDebate(currentDebate.id)
      showNotification('ディベートを終了しました', 'success')

      // Trigger AI evaluation
      await runDebateEvaluation(overrideEvaluationModel)
    } catch (error: any) {
      logger.error('Failed to complete debate:', error)
      showNotification(
        `ディベート終了に失敗しました: ${error.response?.data?.detail || error.message}`,
        'error'
      )
    }
  }

  /**
   * Manually (re)run AI evaluation for the current debate
   */
  const runDebateEvaluation = async (overrideEvaluationModel?: string) => {
    if (!currentDebate) return

    if (currentDebate.status !== 'completed') {
      showNotification('ディベートを完了してからAI評価を実行してください', 'error')
      return
    }

    setEvaluating(true)
    try {
      // config.evaluation_modelがあればそれを使う
      const modelName = overrideEvaluationModel || currentDebate.config?.evaluation_model || evaluationModel || undefined
      if (!modelName) {
        showNotification('評価用のモデルが設定されていません', 'error')
        return
      }

      await api.evaluateDebate(currentDebate.id, modelName)
      await loadEvaluations(currentDebate.id)
      showNotification('AI評価が完了しました', 'success')
    } catch (evalError: any) {
      logger.error('Evaluation failed:', evalError)
      showNotification('AI評価に失敗しました: ' + (evalError?.response?.data?.detail || evalError.message), 'error')
    } finally {
      setEvaluating(false)
    }
  }

  /**
   * Vote for winner
   */
  const voteForWinner = async (winnerId: number, reasoning?: string) => {
    if (!currentDebate || !userId) return

    try {
      await api.voteForWinner({
        debate_session_id: currentDebate.id,
        user_id: userId,
        winner_participant_id: winnerId,
        reasoning
      })

      await loadDebate(currentDebate.id)
      // 投票直後に最新の投票一覧も取得
      try {
        const votes = await api.getDebateVotes(currentDebate.id)
        setDebateVotes(votes)
      } catch (voteError: any) {
        logger.error('Failed to refresh debate votes:', voteError)
      }
      showNotification('投票しました', 'success')
    } catch (error: any) {
      logger.error('Failed to vote:', error)
      showNotification(
        `投票に失敗しました: ${error.response?.data?.detail || error.message}`,
        'error'
      )
    }
  }

  /**
   * Cancel current turn generation
   */
  const cancelTurn = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setDebateState(prev => ({
      ...prev,
      isGenerating: false,
      currentParticipantId: null
    }))
    setIsAnimating(false)
    // Remove temporary streaming message
    setDebateMessages(prev => prev.filter(m => m.id !== -1))
  }

  /**
   * Delete a debate
   */
  const deleteDebate = async (debateId: number) => {
    try {
      await api.deleteDebate(debateId)
      showNotification('ディベートを削除しました', 'success')
      await loadDebates()
      if (currentDebate?.id === debateId) {
        setCurrentDebate(null)
        setDebateMessages([])
        setDebateEvaluations([])
      }
    } catch (error: any) {
      logger.error('Failed to delete debate:', error)
      showNotification(
        `削除に失敗しました: ${error.response?.data?.detail || error.message}`,
        'error'
      )
    }
  }

  return {
    debates,
    currentDebate,
    debateMessages,
    debateEvaluations,
    debateVotes,
    debateState,
    loadingDebates,
    loadingMessages,
    evaluating,
    isAnimating,
    loadDebates,
    loadDebate,
    createDebate,
    startDebate,
    sendDebateTurn,
    sendModeratorMessage,
    completeDebate,
    runDebateEvaluation,
    voteForWinner,
    cancelTurn,
    deleteDebate,
    setCurrentDebate
  }
}
