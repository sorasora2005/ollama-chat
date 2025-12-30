import { useRef } from 'react'
import { Message } from '../types'

/**
 * Message cancellation hook
 * Handles abort controller management and message content restoration
 */
export function useMessageCancellation() {
  const lastSentMessageContentRef = useRef<{ text: string, file: { filename: string, images: string[] } | null } | null>(null)

  /**
   * Save message content for potential restoration on cancel
   */
  const saveMessageContent = (text: string, file: { filename: string, images: string[] } | null) => {
    lastSentMessageContentRef.current = {
      text: text || (file ? `この画像について説明してください。` : ''),
      file
    }
  }

  /**
   * Cancel streaming and return the last sent message for restoration
   */
  const cancelStreaming = (
    abortControllerRef: React.MutableRefObject<AbortController | null>,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>,
    assistantMessageIndexRef: React.MutableRefObject<number | null>
  ): { text: string, file: { filename: string, images: string[] } | null } | null => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setLoading(false)
      setIsStreaming(false)
      // Add or update assistant message with cancellation notice
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          // Update existing assistant message
          const indexToUpdate = assistantMessageIndexRef.current !== null
            ? assistantMessageIndexRef.current
            : newMessages.length - 1
          if (indexToUpdate >= 0 && indexToUpdate < newMessages.length) {
            newMessages[indexToUpdate] = {
              ...newMessages[indexToUpdate],
              content: newMessages[indexToUpdate].content.trim() || '生成途中でキャンセルされました。',
              streamingComplete: true,
              is_cancelled: true
            }
          }
        } else {
          // Add new cancellation message
          const cancellationMessage: Message = {
            role: 'assistant',
            content: '生成途中でキャンセルされました。',
            id: `cancelled-${Date.now()}-${Math.random()}`,
            streamingComplete: true,
            is_cancelled: true
          }
          newMessages.push(cancellationMessage)
        }
        return newMessages
      })
      assistantMessageIndexRef.current = null
      // Return the last sent message content for restoration
      return lastSentMessageContentRef.current
    }
    return null
  }

  /**
   * Clear saved message content
   */
  const clearSavedContent = () => {
    lastSentMessageContentRef.current = null
  }

  return {
    saveMessageContent,
    cancelStreaming,
    clearSavedContent,
    lastSentMessageContentRef,
  }
}
