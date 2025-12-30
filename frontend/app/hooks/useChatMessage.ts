import { useState } from 'react'
import { Message } from '../types'
import { api } from '../utils/api'
import { scrollToBottom, scrollToLastSentMessage } from '../utils/scrollUtils'
import { useMessageStreaming } from './useMessageStreaming'
import { useMessageCancellation } from './useMessageCancellation'
import { useMessageOperations } from './useMessageOperations'

export function useChatMessage(
  userId: number | null,
  selectedModel: string,
  currentSessionId: string | null,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  abortControllerRef: React.MutableRefObject<AbortController | null>,
  assistantMessageIndexRef: React.MutableRefObject<number | null>,
  messagesEndRef: React.RefObject<HTMLDivElement>,
  lastSentMessageRef: React.MutableRefObject<string | null>,
  messageRefs: React.MutableRefObject<Map<string, HTMLDivElement>>,
  loadSessions: (id: number) => Promise<void>,
  loadUserFiles: (id: number) => Promise<void>
) {
  const [isStreaming, setIsStreaming] = useState(false)

  // Use extracted hooks
  const { streamGeminiTypingAnimation, updateStreamingMessage, completeStreaming } = useMessageStreaming()
  const { saveMessageContent, cancelStreaming: doCancelStreaming, clearSavedContent } = useMessageCancellation()
  const { copiedIndex, clickedButton, setClickedButton, copyMessage, regenerateMessage: doRegenerateMessage } = useMessageOperations()

  const cancelStreaming = (): { text: string, file: { filename: string, images: string[] } | null } | null => {
    return doCancelStreaming(abortControllerRef, setMessages, setLoading, setIsStreaming, assistantMessageIndexRef)
  }

  const sendMessage = async (
    messageText: string,
    uploadedFile: { filename: string, images: string[] } | null,
    skipUserMessage: boolean = false
  ) => {
    const textToSend = messageText.trim()
    if ((!textToSend && !uploadedFile) || !userId) return

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Save the message content and file for potential restoration on cancel
    saveMessageContent(textToSend, uploadedFile)

    const userMessage: Message = {
      role: 'user',
      content: textToSend || (uploadedFile ? `ファイル: ${uploadedFile.filename}` : ''),
      images: uploadedFile?.images || undefined,
      id: `user-${Date.now()}-${Math.random()}`
    }

    // Only add user message if not skipping (for regeneration)
    if (!skipUserMessage) {
      setMessages(prev => [...prev, userMessage])
      // Scroll to the sent message so it appears at the top of the viewport
      lastSentMessageRef.current = userMessage.id || null
      setTimeout(() => scrollToLastSentMessage(lastSentMessageRef.current, messageRefs), 100)
    }
    const imagesToSend = uploadedFile?.images || null
    setLoading(true)
    setIsStreaming(false)
    assistantMessageIndexRef.current = null  // Reset assistant message index

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()

    try {
      const requestData: any = {
        user_id: userId,
        message: textToSend || (uploadedFile ? `この画像について説明してください。` : ''),
        model: selectedModel,
        session_id: currentSessionId
      }

      // Add images if uploaded
      if (imagesToSend && imagesToSend.length > 0) {
        requestData.images = imagesToSend
      }

      // Use fetch for streaming with abort signal
      const response = await api.sendMessage(requestData, abortControllerRef.current.signal)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let sessionId = currentSessionId
      let assistantMessageCreated = false

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))

                  if (data.error) {
                    throw new Error(data.error)
                  }

                  // Typing animation for non-streaming (Gemini)
                  if (data.content && data.done) {
                    streamGeminiTypingAnimation(
                      data.content,
                      selectedModel,
                      currentSessionId,
                      data.session_id,
                      data.message_id,
                      setMessages,
                      setLoading,
                      setIsStreaming,
                      assistantMessageIndexRef,
                      abortControllerRef,
                      messagesEndRef,
                      async () => {
                        if (data.session_id && !currentSessionId) {
                          setCurrentSessionId(data.session_id)
                        }
                        await loadSessions(userId)
                        await loadUserFiles(userId)
                        clearSavedContent()
                      }
                    )
                    continue; // Skip other processing for this line
                  }

                  // Handle streaming content (Ollama)
                  if (data.content) {
                    if (!assistantMessageCreated) {
                      assistantMessageCreated = true
                      fullContent = updateStreamingMessage(
                        data.content,
                        true,
                        selectedModel,
                        data.session_id,
                        currentSessionId,
                        setMessages,
                        setLoading,
                        setIsStreaming,
                        assistantMessageIndexRef,
                        messagesEndRef
                      )
                      if (data.session_id) {
                        sessionId = data.session_id
                      }
                    } else {
                      fullContent += data.content
                      updateStreamingMessage(
                        fullContent,
                        false,
                        selectedModel,
                        data.session_id,
                        currentSessionId,
                        setMessages,
                        setLoading,
                        setIsStreaming,
                        assistantMessageIndexRef,
                        messagesEndRef
                      )
                      if (data.session_id) {
                        sessionId = data.session_id
                      }
                    }
                  }

                  if (data.done) {
                    // Handle cancellation
                    if (data.cancelled) {
                      setLoading(false)  // Ensure loading is false when done
                      setIsStreaming(false)  // Mark streaming as complete
                      abortControllerRef.current = null  // Clear abort controller
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
                      return
                    }

                    // Process completion
                    completeStreaming(data.message_id, setMessages, setLoading, setIsStreaming, assistantMessageIndexRef, abortControllerRef)

                    if (sessionId && !currentSessionId) {
                      setCurrentSessionId(sessionId)
                    }
                    await loadSessions(userId)
                    await loadUserFiles(userId)
                    clearSavedContent()
                    break
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e)
                }
              }
            }
          }
        } catch (readError: any) {
          // Handle read errors (including abort)
          if (readError.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
            setLoading(false)
            setIsStreaming(false)
            abortControllerRef.current = null
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
            // Note: lastSentMessageContentRef is kept for restoration
            return
          }
          throw readError
        }
      }
    } catch (error: any) {
      // Don't show error if it was aborted
      if (error.name === 'AbortError') {
        setLoading(false)
        setIsStreaming(false)
        abortControllerRef.current = null
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
                content: newMessages[indexToUpdate].content.trim() || '生成を中断しました。',
                streamingComplete: true
              }
            }
          } else {
            // Add new cancellation message
            const cancellationMessage: Message = {
              role: 'assistant',
              content: '生成を中断しました。',
              id: `cancelled-${Date.now()}-${Math.random()}`,
              streamingComplete: true
            }
            newMessages.push(cancellationMessage)
          }
          return newMessages
        })
        assistantMessageIndexRef.current = null
        // Note: lastSentMessageContentRef is kept for restoration
        return
      }

      console.error('Failed to send message:', error)
      assistantMessageIndexRef.current = null  // Reset on error
      abortControllerRef.current = null
      // Clear saved message content on error (not cancellation)
      clearSavedContent()

      // If user not found, clear localStorage and show username modal
      if (error.message?.includes('User not found') || error.message?.includes('404')) {
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
        throw error
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: `エラーが発生しました: ${error.message || 'Unknown error'}\n\nOllamaが起動しているか、モデルがダウンロードされているか確認してください。`,
        id: `error-${Date.now()}-${Math.random()}`,
        streamingComplete: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
      setIsStreaming(false)
    }
  }

  const regenerateMessage = async (messageIndex: number) => {
    await doRegenerateMessage(messageIndex, messages, userId, setMessages, sendMessage)
  }

  return {
    copiedIndex,
    clickedButton,
    setClickedButton,
    sendMessage,
    cancelStreaming,
    copyMessage,
    regenerateMessage,
    isStreaming,
  }
}

