import { Message } from '../types'
import { scrollToBottom } from '../utils/scrollUtils'

/**
 * Message streaming hook
 * Handles streaming for Ollama (real-time) and Gemini (typing animation)
 */
export function useMessageStreaming() {
  /**
   * Handle Gemini typing animation
   * Displays full response character by character
   */
  const streamGeminiTypingAnimation = (
    fullText: string,
    selectedModel: string,
    currentSessionId: string | null,
    sessionId: string | undefined,
    messageId: string | undefined,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>,
    assistantMessageIndexRef: React.MutableRefObject<number | null>,
    abortControllerRef: React.MutableRefObject<AbortController | null>,
    messagesEndRef: React.RefObject<HTMLDivElement>,
    onComplete: () => void
  ) => {
    let animatedContent = ''

    // Create assistant message with empty content
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      model: selectedModel,
      session_id: sessionId || currentSessionId || undefined,
      id: `assistant-${Date.now()}-${Math.random()}`,
      streamingComplete: false
    }
    setMessages(prev => {
      const newIndex = prev.length
      assistantMessageIndexRef.current = newIndex
      return [...prev, assistantMessage]
    })
    setLoading(false)
    setIsStreaming(true)

    const typingInterval = setInterval(() => {
      animatedContent = fullText.slice(0, animatedContent.length + 1)
      setMessages(prev => {
        const newMessages = [...prev]
        const indexToUpdate = assistantMessageIndexRef.current
        if (indexToUpdate !== null && newMessages[indexToUpdate]) {
          newMessages[indexToUpdate] = {
            ...newMessages[indexToUpdate],
            content: animatedContent
          }
        }
        return newMessages
      })
      scrollToBottom(messagesEndRef)

      if (animatedContent.length === fullText.length) {
        clearInterval(typingInterval)
        setIsStreaming(false)
        abortControllerRef.current = null
        setMessages(prev => {
          const newMessages = [...prev]
          const indexToUpdate = assistantMessageIndexRef.current
          if (indexToUpdate !== null && newMessages[indexToUpdate]) {
            newMessages[indexToUpdate] = {
              ...newMessages[indexToUpdate],
              streamingComplete: true,
              ...(messageId ? { id: String(messageId) } : {})
            }
          }
          return newMessages
        })
        onComplete()
      }
    }, 10) // Typing speed
  }

  /**
   * Update or create assistant message during streaming
   */
  const updateStreamingMessage = (
    content: string,
    isFirstChunk: boolean,
    selectedModel: string,
    sessionId: string | undefined,
    currentSessionId: string | null,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>,
    assistantMessageIndexRef: React.MutableRefObject<number | null>,
    messagesEndRef: React.RefObject<HTMLDivElement>
  ): string => {
    if (isFirstChunk) {
      // Create new assistant message
      setIsStreaming(true)
      const assistantMessage: Message = {
        role: 'assistant',
        content: content,
        model: selectedModel,
        session_id: sessionId || currentSessionId || undefined,
        id: `assistant-${Date.now()}-${Math.random()}`,
        streamingComplete: false
      }
      setMessages(prev => {
        const newIndex = prev.length
        assistantMessageIndexRef.current = newIndex
        return [...prev, assistantMessage]
      })
      setLoading(false)
      setTimeout(() => scrollToBottom(messagesEndRef), 50)
      return content
    } else {
      // Update existing message
      setMessages(prev => {
        const newMessages = [...prev]
        const indexToUpdate = assistantMessageIndexRef.current !== null
          ? assistantMessageIndexRef.current
          : (() => {
            for (let i = newMessages.length - 1; i >= 0; i--) {
              if (newMessages[i].role === 'assistant') {
                return i
              }
            }
            return -1
          })()

        if (indexToUpdate >= 0 && indexToUpdate < newMessages.length) {
          newMessages[indexToUpdate] = {
            ...newMessages[indexToUpdate],
            content: content,
            session_id: sessionId || newMessages[indexToUpdate].session_id
          }
        }
        return newMessages
      })
      setTimeout(() => scrollToBottom(messagesEndRef), 50)
      return content
    }
  }

  /**
   * Mark streaming as complete
   */
  const completeStreaming = (
    messageId: string | undefined,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>,
    assistantMessageIndexRef: React.MutableRefObject<number | null>,
    abortControllerRef: React.MutableRefObject<AbortController | null>
  ) => {
    setLoading(false)
    setIsStreaming(false)
    abortControllerRef.current = null

    setMessages(prev => {
      const newMessages = [...prev]
      const indexToUpdate = assistantMessageIndexRef.current !== null
        ? assistantMessageIndexRef.current
        : (() => {
          for (let i = newMessages.length - 1; i >= 0; i--) {
            if (newMessages[i].role === 'assistant') {
              return i
            }
          }
          return -1
        })()

      if (indexToUpdate >= 0 && indexToUpdate < newMessages.length) {
        newMessages[indexToUpdate] = {
          ...newMessages[indexToUpdate],
          streamingComplete: true,
          ...(messageId ? { id: String(messageId) } : {})
        }
      }
      return newMessages
    })
  }

  return {
    streamGeminiTypingAnimation,
    updateStreamingMessage,
    completeStreaming,
  }
}
