import { useState } from 'react'
import { Message } from '../types'
import { logger } from '../utils/logger'

/**
 * Message operations hook
 * Handles copy and regenerate operations for chat messages
 */
export function useMessageOperations() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [clickedButton, setClickedButton] = useState<{ type: string, index: number } | null>(null)

  /**
   * Copy message content to clipboard
   */
  const copyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
      return true
    } catch (error) {
      logger.error('Failed to copy:', error)
      return false
    }
  }

  /**
   * Regenerate assistant message by resending the previous user message
   */
  const regenerateMessage = async (
    messageIndex: number,
    messages: Message[],
    userId: number | null,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    sendMessage: (text: string, file: { filename: string, images: string[] } | null, skip: boolean) => Promise<void>
  ) => {
    if (!userId) return

    // Find the user message that prompted this assistant message
    const userMessageIndex = messageIndex > 0 ? messageIndex - 1 : 0
    const userMessage = messages[userMessageIndex]

    if (!userMessage || userMessage.role !== 'user') return

    // Remove messages from this assistant message onwards
    const newMessages = messages.slice(0, messageIndex)
    setMessages(newMessages)

    // Wait a bit for state to update before sending
    await new Promise(resolve => setTimeout(resolve, 100))

    // Send the user message again, but skip adding the user message since it's already in the array
    await sendMessage(userMessage.content, userMessage.images ? { filename: '', images: userMessage.images } : null, true)
  }

  return {
    copiedIndex,
    clickedButton,
    setClickedButton,
    copyMessage,
    regenerateMessage,
  }
}
