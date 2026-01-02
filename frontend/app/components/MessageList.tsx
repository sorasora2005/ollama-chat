'use client'

import { useState } from 'react'
import { Copy, RotateCcw, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Message } from '../types'
import { MessageContent } from './MessageContent'

interface MessageListProps {
  messages: Message[]
  loading: boolean
  assistantMessageIndex: number | null
  messageRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
  messagesStartRef: React.RefObject<HTMLDivElement>
  messagesEndRef: React.RefObject<HTMLDivElement>
  copiedIndex: number | null
  clickedButton: { type: string, index: number } | null
  userId: number | null
  onCopyMessage: (content: string, index: number) => void
  onRegenerateMessage: (index: number) => void
  onFeedback?: (messageId: number, feedbackType: 'positive' | 'negative') => void
}

export default function MessageList({
  messages,
  loading,
  assistantMessageIndex,
  messageRefs,
  messagesStartRef,
  messagesEndRef,
  copiedIndex,
  clickedButton,
  userId,
  onCopyMessage,
  onRegenerateMessage,
  onFeedback,
}: MessageListProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [feedbackStates, setFeedbackStates] = useState<Map<string, 'positive' | 'negative' | null>>(new Map())
  const [currentPage, setCurrentPage] = useState<Map<string, number>>(new Map())

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  const getMessageLines = (content: string): string[] => {
    return content.split('\n')
  }

  const shouldCollapse = (content: string): boolean => {
    const lines = getMessageLines(content)
    return lines.length > 6
  }

  const getDisplayContent = (content: string, messageId: string): string => {
    if (!shouldCollapse(content)) {
      return content
    }
    const isExpanded = expandedMessages.has(messageId)
    if (isExpanded) {
      return content
    }
    const lines = getMessageLines(content)
    return lines.slice(0, 6).join('\n')
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 flex flex-col">
      <div ref={messagesStartRef} />
      {messages.map((message, index) => {
        const isNewAssistantMessage = message.role === 'assistant' && 
          (message.id?.startsWith('assistant-') || message.id?.startsWith('error-') || message.id?.startsWith('cancelled-'))
        // Check if this message is currently streaming
        // streamingComplete === false means actively streaming
        // streamingComplete === undefined means loaded from history (not streaming)
        // streamingComplete === true means streaming completed
        const isStreaming = message.role === 'assistant' && message.streamingComplete === false
        const messageLength = message.content.replace(/\s+/g, '').length
        const isShortMessage = messageLength < 50

        return (
          <div
            key={message.id || `msg-${index}`}
            data-message-id={message.id}
            ref={(el) => {
              if (el && message.id) {
                messageRefs.current.set(message.id, el)
              }
            }}
            className={`flex gap-4 group ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${
              isNewAssistantMessage ? 'animate-slide-down-fade-in' : ''
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative">
                {isStreaming ? (
                  <>
                    <svg className="w-8 h-8 absolute animate-spin" viewBox="0 0 32 32">
                      <defs>
                        <linearGradient id={`spinning-gradient-${message.id || index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#9333ea" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="16"
                        cy="16"
                        r="13"
                        fill="none"
                        stroke={`url(#spinning-gradient-${message.id || index})`}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="50 30"
                        transform="rotate(-90 16 16)"
                      />
                    </svg>
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] absolute"></div>
                  </>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 absolute"></div>
                )}
                <div className="w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] absolute"></div>
                <span className="text-black dark:text-white text-xs font-bold relative z-10">AI</span>
              </div>
            )}
            <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              {message.role === 'user' ? (
                <div
                  className={`${isShortMessage ? 'max-w-fit' : 'max-w-[80%]'} rounded-2xl px-4 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-black dark:text-white relative ${
                    shouldCollapse(message.content) ? 'pr-16' : ''
                  }`}
                  style={isShortMessage ? {} : { wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                  {shouldCollapse(message.content) && (
                    <button
                      onClick={() => toggleMessageExpansion(message.id || `msg-${index}`)}
                      className="absolute top-2 right-2 p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-all flex items-center gap-1 z-10"
                      title={expandedMessages.has(message.id || `msg-${index}`) ? '折りたたむ' : '展開する'}
                    >
                      {expandedMessages.has(message.id || `msg-${index}`) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {message.images && message.images.length > 0 && (() => {
                    const fileMatch1 = message.content.match(/ファイル:\s*(.+?)(?:\n|$)/)
                    const fileMatch2 = message.content.match(/ファイル:\s*(.+)/)
                    const filename = (fileMatch1 ? fileMatch1[1].trim() : '') || (fileMatch2 ? fileMatch2[1].trim() : '')
                    const contentLower = message.content.toLowerCase()
                    const isPdf = filename.toLowerCase().endsWith('.pdf') ||
                      (contentLower.includes('.pdf') && (contentLower.includes('ファイル') || message.images.length > 1))
                    const messageId = message.id || `msg-${index}`;
                    const pageIndex = currentPage.get(messageId) ?? 0;
                    return (
                      <div className={`mb-3 space-y-2 ${isPdf ? 'border-2 border-red-500 rounded-lg p-2' : ''}`}>
                        <img
                          key={pageIndex}
                          src={`data:image/png;base64,${message.images[pageIndex]}`}
                          alt={`Uploaded image page ${pageIndex + 1}`}
                          className="max-w-full rounded-lg"
                          style={{ maxHeight: '400px' }}
                        />
                        {message.images.length > 1 && (
                          <div className="flex justify-between items-center mt-2">
                            <button
                              onClick={() => {
                                const newCurrentPage = new Map(currentPage);
                                newCurrentPage.set(messageId, Math.max(0, pageIndex - 1));
                                setCurrentPage(newCurrentPage);
                              }}
                              disabled={pageIndex === 0}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              前へ
                            </button>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {pageIndex + 1} / {message.images!.length}
                            </div>
                            <button
                              onClick={() => {
                                const newCurrentPage = new Map(currentPage);
                                newCurrentPage.set(messageId, Math.min(message.images!.length - 1, pageIndex + 1));
                                setCurrentPage(newCurrentPage);
                              }}
                              disabled={pageIndex === message.images!.length - 1}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              次へ
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <MessageContent content={getDisplayContent(message.content, message.id || `msg-${index}`)} />
                </div>
              ) : (
                <div
                  className={`${isShortMessage ? 'max-w-fit' : 'max-w-[80%]'} rounded-2xl px-4 py-3 text-black dark:text-white ${
                    message.is_cancelled ? 'bg-gray-200 dark:bg-[#3d3d3d] border border-gray-400 dark:border-gray-600' : ''
                  }`}
                  style={isShortMessage ? {} : { wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                  {message.images && message.images.length > 0 && (() => {
                    const messageId = message.id || `msg-${index}`;
                    const pageIndex = currentPage.get(messageId) ?? 0;
                    return (
                      <div className="mb-3 space-y-2">
                        <img
                          key={pageIndex}
                          src={`data:image/png;base64,${message.images[pageIndex]}`}
                          alt={`Uploaded image page ${pageIndex + 1}`}
                          className="max-w-full rounded-lg"
                          style={{ maxHeight: '400px' }}
                        />
                        {message.images.length > 1 && (
                          <div className="flex justify-between items-center mt-2">
                            <button
                              onClick={() => {
                                const newCurrentPage = new Map(currentPage);
                                newCurrentPage.set(messageId, Math.max(0, pageIndex - 1));
                                setCurrentPage(newCurrentPage);
                              }}
                              disabled={pageIndex === 0}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              前へ
                            </button>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {pageIndex + 1} / {message.images!.length}
                            </div>
                            <button
                              onClick={() => {
                                const newCurrentPage = new Map(currentPage);
                                newCurrentPage.set(messageId, Math.min(message.images!.length - 1, pageIndex + 1));
                                setCurrentPage(newCurrentPage);
                              }}
                              disabled={pageIndex === message.images!.length - 1}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              次へ
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <MessageContent content={message.content} />
                  {message.is_cancelled && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                      ⚠️ 生成途中でキャンセルされました
                    </div>
                  )}
                </div>
              )}
              {message.role === 'user' && (
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => {
                      onCopyMessage(message.content, index)
                    }}
                    className={`p-2 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-all mr-1 ${
                      clickedButton?.type === 'copy' && clickedButton?.index === index 
                        ? 'animate-float bg-gray-200 dark:bg-[#3d3d3d]' 
                        : ''
                    }`}
                    title="コピー"
                  >
                    <Copy className={`w-4 h-4 transition-colors ${copiedIndex === index ? 'text-green-500' : 'text-gray-600 dark:text-gray-400'}`} />
                  </button>
                </div>
              )}
              {message.role === 'assistant' && !isStreaming && (
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => {
                      onCopyMessage(message.content, index)
                    }}
                    className={`p-2 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-all ml-1 ${
                      clickedButton?.type === 'copy' && clickedButton?.index === index 
                        ? 'animate-float bg-gray-200 dark:bg-[#3d3d3d]' 
                        : ''
                    }`}
                    title="コピー"
                  >
                    <Copy className={`w-4 h-4 transition-colors ${copiedIndex === index ? 'text-green-500' : 'text-gray-600 dark:text-gray-400'}`} />
                  </button>
                  <button
                    onClick={() => onRegenerateMessage(index)}
                    disabled={loading}
                    className={`p-2 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-all disabled:opacity-50 ${
                      clickedButton?.type === 'regenerate' && clickedButton?.index === index 
                        ? 'animate-float bg-gray-200 dark:bg-[#3d3d3d]' 
                        : ''
                    }`}
                    title="再生成"
                  >
                    <RotateCcw className={`w-4 h-4 transition-colors ${
                      clickedButton?.type === 'regenerate' && clickedButton?.index === index 
                        ? 'text-blue-500' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </button>
                  {userId && message.id && message.streamingComplete && !message.id.startsWith('error-') && !message.id.startsWith('cancelled-') && (
                    <>
                      <button
                        onClick={() => {
                          if (onFeedback && message.id) {
                            const messageId = parseInt(message.id)
                            if (!isNaN(messageId)) {
                              const feedbackType: 'positive' | 'negative' = 'positive'
                              onFeedback(messageId, feedbackType)
                              setFeedbackStates(prev => {
                                const newMap = new Map(prev)
                                newMap.set(message.id!, feedbackType)
                                return newMap
                              })
                            }
                          }
                        }}
                        className={`p-2 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-all ${
                          feedbackStates.get(message.id || '') === 'positive' 
                            ? 'bg-blue-100 dark:bg-blue-900' 
                            : ''
                        }`}
                        title="良い"
                      >
                        <ThumbsUp className={`w-4 h-4 transition-colors ${
                          feedbackStates.get(message.id || '') === 'positive' 
                            ? 'text-blue-500' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`} />
                      </button>
                      <button
                        onClick={() => {
                          if (onFeedback && message.id) {
                            const messageId = parseInt(message.id)
                            if (!isNaN(messageId)) {
                              const feedbackType: 'positive' | 'negative' = 'negative'
                              onFeedback(messageId, feedbackType)
                              setFeedbackStates(prev => {
                                const newMap = new Map(prev)
                                newMap.set(message.id!, feedbackType)
                                return newMap
                              })
                            }
                          }
                        }}
                        className={`p-2 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-all ${
                          feedbackStates.get(message.id || '') === 'negative' 
                            ? 'bg-red-100 dark:bg-red-900' 
                            : ''
                        }`}
                        title="悪い"
                      >
                        <ThumbsDown className={`w-4 h-4 transition-colors ${
                          feedbackStates.get(message.id || '') === 'negative' 
                            ? 'text-red-500' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {loading && assistantMessageIndex === null && (
        <div className="flex gap-4 justify-start">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative">
            <svg className="w-8 h-8 absolute animate-spin" viewBox="0 0 32 32">
              <defs>
                <linearGradient id="spinning-gradient-loading" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
              </defs>
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="url(#spinning-gradient-loading)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="50 30"
                transform="rotate(-90 16 16)"
              />
            </svg>
            <div className="w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] absolute"></div>
            <span className="text-black dark:text-white text-xs font-bold relative z-10">AI</span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}

